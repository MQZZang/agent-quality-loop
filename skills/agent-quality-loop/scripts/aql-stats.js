#!/usr/bin/env node
"use strict";

// Aggregates Agent Quality Loop envelope snapshots into descriptive association
// rates (not causal inference). Measurement input for RETRO / personalization
// review. Read-only: never writes or mutates envelopes, lessons, or profiles.
// Does not auto-conclude lesson effective/ineffective.
// Single validator truth: requires validate-envelope (no copied validity logic).

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  PHASES,
  SUCCESS_VERDICTS,
  baseEnvelope,
  passingGate,
  validateEnvelope,
  validateRefPaths,
  validateSnapshotOrdering,
  isQualifiedAcceptanceIndependence,
  isAcceptedOrHigher,
} = require("./validate-envelope");
const { workspaceKey } = require("./snapshot-chain");

const TRUST_CLASSES = [
  "parse_invalid",
  "schema_invalid",
  "reference_invalid",
  "ordering_invalid",
  "valid_unqualified",
  "valid_qualified",
];

function listJsonFiles(inputPaths) {
  const files = [];
  const missing = [];
  for (const input of inputPaths) {
    const resolved = path.resolve(input);
    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch {
      missing.push(resolved);
      continue;
    }
    if (stat.isFile()) {
      if (resolved.endsWith(".json")) files.push(resolved);
      continue;
    }
    if (!stat.isDirectory()) continue;
    const rootEnvelope = path.join(resolved, "envelope.json");
    if (fs.existsSync(rootEnvelope)) files.push(rootEnvelope);
    for (const dir of [resolved, path.join(resolved, "history")]) {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        const full = path.join(dir, entry.name);
        if (full !== rootEnvelope) files.push(full);
      }
    }
  }
  return { files: [...new Set(files)].sort(), missing };
}

function bump(map, key) {
  const label = typeof key === "string" && key.length > 0 ? key : "(unset)";
  map[label] = (map[label] || 0) + 1;
}

function contentDigest(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function phaseRank(phase) {
  const index = PHASES.indexOf(phase);
  return index >= 0 ? index : -1;
}

function inferWorkspace(filePath, explicitWorkspace) {
  if (explicitWorkspace) return explicitWorkspace;
  const resolved = path.resolve(filePath);
  const marker = `${path.sep}.agent-quality-loop${path.sep}`;
  const idx = resolved.toLowerCase().lastIndexOf(marker.toLowerCase());
  if (idx >= 0) return resolved.slice(0, idx);
  const base = path.basename(path.dirname(resolved));
  if (base === "history") return path.dirname(path.dirname(resolved));
  if (path.basename(resolved) === "envelope.json") return path.dirname(path.dirname(resolved));
  return path.dirname(resolved);
}

function contractKeyFor(workspace, contractId) {
  const wsKey = workspaceKey(workspace);
  const cid =
    typeof contractId === "string" && contractId.trim() ? contractId.trim() : "(unset)";
  return `${wsKey}::${cid}`;
}

function resolveWorkspaceRoot(file, explicitWorkspace) {
  const fromPath = inferWorkspace(file, null);
  if (fromPath && fs.existsSync(fromPath)) {
    try {
      return fs.realpathSync(path.resolve(fromPath));
    } catch {
      return fromPath;
    }
  }
  if (explicitWorkspace && fs.existsSync(explicitWorkspace)) {
    try {
      return fs.realpathSync(path.resolve(explicitWorkspace));
    } catch {
      return explicitWorkspace;
    }
  }
  return fromPath || null;
}

function injectedCoverage(envelope) {
  if (!Object.prototype.hasOwnProperty.call(envelope, "injected_refs")) return "missing";
  if (!Array.isArray(envelope.injected_refs)) return "malformed";
  if (envelope.injected_refs.length === 0) return "empty";
  return "populated";
}

function associationKey(entry) {
  if (!entry || typeof entry !== "object") return null;
  const kind = typeof entry.kind === "string" ? entry.kind : "";
  const ref = typeof entry.ref === "string" ? entry.ref : "";
  const digest = typeof entry.content_sha256 === "string" ? entry.content_sha256 : "";
  if (!kind || !ref || !digest) return null;
  return `${kind}::${ref}::${digest}`;
}

function requiredAcceptanceAllPass(envelope) {
  const gate = envelope.acceptance_gate;
  if (!gate || typeof gate !== "object" || !Array.isArray(gate.required_dimensions)) return false;
  if (!gate.status_by_dimension || typeof gate.status_by_dimension !== "object") return false;
  for (const dimension of gate.required_dimensions) {
    const status = gate.status_by_dimension[dimension];
    if (!status || typeof status !== "object" || status.status !== "PASS") return false;
  }
  return true;
}

function classifyFile(file, explicitWorkspace) {
  let raw;
  let mtimeMs = 0;
  try {
    raw = fs.readFileSync(file, "utf8");
    mtimeMs = fs.statSync(file).mtimeMs;
  } catch {
    return {
      file,
      trust: "parse_invalid",
      errors: ["unreadable"],
      mtimeMs: 0,
      digest: null,
      envelope: null,
      isCurrent: path.basename(file) === "envelope.json",
      workspace: null,
      workspace_key: null,
    };
  }

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    return {
      file,
      trust: "parse_invalid",
      errors: [error.message],
      mtimeMs,
      digest: contentDigest(raw),
      envelope: null,
      isCurrent: path.basename(file) === "envelope.json",
      workspace: null,
      workspace_key: null,
    };
  }
  if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) {
    return {
      file,
      trust: "parse_invalid",
      errors: ["envelope must be a JSON object"],
      mtimeMs,
      digest: contentDigest(raw),
      envelope: null,
      isCurrent: path.basename(file) === "envelope.json",
      workspace: null,
      workspace_key: null,
    };
  }

  const digest = contentDigest(raw);
  const workspace = resolveWorkspaceRoot(file, explicitWorkspace);
  const wsKey = workspace && fs.existsSync(workspace) ? workspaceKey(workspace) : null;
  const schemaErrors = validateEnvelope(envelope);
  if (schemaErrors.length > 0) {
    return {
      file,
      trust: "schema_invalid",
      errors: schemaErrors,
      mtimeMs,
      digest,
      envelope,
      isCurrent: path.basename(file) === "envelope.json",
      workspace,
      workspace_key: wsKey,
    };
  }

  let refErrors = [];
  if (workspace && fs.existsSync(workspace)) {
    refErrors = validateRefPaths(envelope, workspace);
  }
  if (refErrors.length > 0) {
    return {
      file,
      trust: "reference_invalid",
      errors: refErrors,
      mtimeMs,
      digest,
      envelope,
      isCurrent: path.basename(file) === "envelope.json",
      workspace,
      workspace_key: wsKey,
    };
  }

  const hasSnapshot = envelope.snapshot !== undefined && envelope.snapshot !== null;
  return {
    file,
    trust: hasSnapshot ? "valid_pending_order" : "legacy_candidate",
    errors: [],
    mtimeMs,
    digest,
    envelope,
    isCurrent: path.basename(file) === "envelope.json",
    workspace,
    workspace_key: wsKey,
  };
}

function dedupeByDigest(records) {
  const byKey = new Map();
  for (const snap of records) {
    if (!snap.digest) continue;
    const scopeKey = `${snap.workspace_key || "(unknown)"}\0${snap.digest}`;
    const existing = byKey.get(scopeKey);
    if (!existing) {
      byKey.set(scopeKey, snap);
      continue;
    }
    const prefer =
      (snap.isCurrent && !existing.isCurrent) ||
      (snap.isCurrent === existing.isCurrent && snap.mtimeMs > existing.mtimeMs);
    if (prefer) byKey.set(scopeKey, snap);
  }
  return [...byKey.values()];
}

function finalizeTrust(snap, orderingStatus, independenceOk) {
  if (["parse_invalid", "schema_invalid", "reference_invalid"].includes(snap.trust)) {
    return snap.trust;
  }
  if (orderingStatus === "invalid") return "ordering_invalid";
  if (orderingStatus === "legacy_unordered") return "valid_unqualified";
  // ordered valid
  if (independenceOk) return "valid_qualified";
  return "valid_unqualified";
}

function buildContractTimeline(uniqueValidCandidates) {
  const byContract = new Map();
  for (const snap of uniqueValidCandidates) {
    const contractId =
      typeof snap.envelope.contract_id === "string" && snap.envelope.contract_id.trim()
        ? snap.envelope.contract_id
        : "(unset)";
    const key =
      snap.workspace && snap.workspace_key
        ? contractKeyFor(snap.workspace, contractId)
        : `(unknown)::${contractId}`;
    if (!byContract.has(key)) byContract.set(key, []);
    byContract.get(key).push(snap);
  }

  const contracts = {};
  for (const [contractKey, snaps] of byContract.entries()) {
    const contractId =
      typeof snaps[0].envelope.contract_id === "string" && snaps[0].envelope.contract_id.trim()
        ? snaps[0].envelope.contract_id
        : "(unset)";
    const workspaceKeyValue = snaps[0].workspace_key || null;
    const ordering = validateSnapshotOrdering(
      snaps.map((snap) => ({
        envelope: snap.envelope,
        digest: snap.digest,
      })),
    );

    let orderedSnaps = [];
    if (ordering.status === "valid") {
      orderedSnaps = [...snaps].sort(
        (a, b) => a.envelope.snapshot.sequence - b.envelope.snapshot.sequence,
      );
    }

    const allExposures = new Map();
    for (const snap of orderedSnaps) {
      const refs = Array.isArray(snap.envelope.injected_refs) ? snap.envelope.injected_refs : [];
      for (const entry of refs) {
        const key = associationKey(entry);
        if (!key) continue;
        if (!allExposures.has(key)) {
          allExposures.set(key, {
            kind: entry.kind,
            ref: entry.ref,
            content_sha256: entry.content_sha256,
          });
        }
      }
    }

    const currentSnapshot =
      ordering.status === "valid" && orderedSnaps.length > 0
        ? orderedSnaps[orderedSnaps.length - 1]
        : null;

    let highestEverPhase = null;
    let highestRank = -1;
    const phaseSource =
      ordering.status === "valid"
        ? orderedSnaps
        : ordering.status === "legacy_unordered" && snaps.length === 1
          ? snaps
          : [];
    for (const snap of phaseSource) {
      const rank = phaseRank(snap.envelope.phase);
      if (rank > highestRank) {
        highestRank = rank;
        highestEverPhase = snap.envelope.phase;
      }
    }

    const independenceOk = currentSnapshot
      ? isQualifiedAcceptanceIndependence(currentSnapshot.envelope.acceptance_independence)
      : false;

    for (const snap of snaps) {
      const snapIndependence = isQualifiedAcceptanceIndependence(snap.envelope.acceptance_independence);
      snap.trust = finalizeTrust(snap, ordering.status, snapIndependence);
      snap.ordering_status = ordering.status;
    }

    const currentAccepted =
      !!currentSnapshot &&
      isAcceptedOrHigher(currentSnapshot.envelope.phase) &&
      SUCCESS_VERDICTS.includes(currentSnapshot.envelope.verdict) &&
      requiredAcceptanceAllPass(currentSnapshot.envelope);

    const currentQualified = currentAccepted && independenceOk;

    contracts[contractKey] = {
      contract_key: contractKey,
      contract_id: contractId,
      workspace_key: workspaceKeyValue,
      ordering_status: ordering.status,
      ordering_errors: ordering.errors,
      all_valid_snapshots: orderedSnaps.map((snap) => ({
        file: snap.file,
        digest: snap.digest,
        sequence: snap.envelope.snapshot.sequence,
        phase: snap.envelope.phase,
        verdict: snap.envelope.verdict,
      })),
      all_exposures: [...allExposures.values()],
      current_snapshot: currentSnapshot
        ? {
            file: currentSnapshot.file,
            digest: currentSnapshot.digest,
            sequence: currentSnapshot.envelope.snapshot.sequence,
            phase: currentSnapshot.envelope.phase,
            verdict: currentSnapshot.envelope.verdict,
          }
        : null,
      current_phase: currentSnapshot ? currentSnapshot.envelope.phase : null,
      current_verdict: currentSnapshot ? currentSnapshot.envelope.verdict : null,
      highest_ever_phase: highestEverPhase,
      current_acceptance_outcome: currentAccepted ? "accepted" : "not_accepted",
      accepted: currentAccepted,
      qualified_independent_acceptance: currentQualified,
      single_legacy_snapshot:
        ordering.status === "legacy_unordered" && snaps.length === 1
          ? {
              file: snaps[0].file,
              digest: snaps[0].digest,
              phase: snaps[0].envelope.phase,
              verdict: snaps[0].envelope.verdict,
            }
          : null,
      candidate_snapshots: snaps,
    };
  }
  return contracts;
}

function aggregate(files, options = {}) {
  const explicitWorkspace = options.workspace || null;
  const classified = files.map((file) => classifyFile(file, explicitWorkspace));

  const trustCounts = Object.fromEntries(TRUST_CLASSES.map((name) => [name, 0]));
  const trustPaths = Object.fromEntries(TRUST_CLASSES.map((name) => [name, []]));

  const invalidEarly = [];
  const validCandidates = [];
  for (const snap of classified) {
    if (["parse_invalid", "schema_invalid", "reference_invalid"].includes(snap.trust)) {
      trustCounts[snap.trust] += 1;
      trustPaths[snap.trust].push(snap.file);
      invalidEarly.push(snap);
      continue;
    }
    validCandidates.push(snap);
  }

  const uniqueCandidates = dedupeByDigest(validCandidates);
  const contracts = buildContractTimeline(uniqueCandidates);

  // Recount trust after ordering finalization (unique digests only for valid* / ordering).
  for (const snap of uniqueCandidates) {
    const trust = snap.trust;
    if (!TRUST_CLASSES.includes(trust)) continue;
    trustCounts[trust] += 1;
    trustPaths[trust].push(snap.file);
  }

  const stats = {
    title: "AQL descriptive association report (not causal inference)",
    scanned_files: files.length,
    total_snapshots: classified.length,
    unique_snapshots: dedupeByDigest(classified.filter((snap) => snap.digest)).length,
    unique_contracts: Object.keys(contracts).length,
    workspace_keys: [...new Set(classified.map((snap) => snap.workspace_key).filter(Boolean))],
    parsed: classified.filter((snap) => snap.envelope).length,
    trust_counts: trustCounts,
    trust_paths: trustPaths,
    invalid: [
      ...invalidEarly.map((snap) => snap.file),
      ...uniqueCandidates.filter((snap) => snap.trust === "ordering_invalid").map((snap) => snap.file),
    ],
    by_phase: {},
    by_verdict: {},
    by_mode: {},
    by_assurance: {},
    by_skill_version: {},
    dimension_status: {},
    scope_deviation_envelopes: 0,
    scope_deviation_total: 0,
    scope_deviation_implementer_reported: 0,
    blocker_reasons: {},
    independence_recorded: 0,
    independence_qualified: 0,
    injected_refs_coverage: {
      missing: 0,
      empty: 0,
      populated: 0,
      malformed: 0,
      unknown: 0,
    },
    injected_ref_associations: {},
    contracts: {},
    note: "Associations are descriptive only. No auto lesson effective/ineffective conclusions.",
  };

  // Distributions over unique schema-valid candidates (before excluding ordering_invalid from outcomes).
  for (const snap of uniqueCandidates) {
    if (["ordering_invalid"].includes(snap.trust)) continue;
    if (!snap.envelope) continue;
    const envelope = snap.envelope;
    bump(stats.by_phase, envelope.phase);
    bump(stats.by_verdict, envelope.verdict);
    bump(stats.by_mode, envelope.mode);
    bump(stats.by_assurance, envelope.assurance);
    bump(stats.by_skill_version, envelope.skill_version);

    const coverage = injectedCoverage(envelope);
    if (coverage === "missing") {
      stats.injected_refs_coverage.missing += 1;
      stats.injected_refs_coverage.unknown += 1;
    } else if (coverage === "empty") stats.injected_refs_coverage.empty += 1;
    else if (coverage === "populated") stats.injected_refs_coverage.populated += 1;
    else stats.injected_refs_coverage.malformed += 1;

    const deviations = envelope.implementation_receipt && envelope.implementation_receipt.scope_deviations;
    if (Array.isArray(deviations) && deviations.length > 0) {
      stats.scope_deviation_envelopes += 1;
      stats.scope_deviation_total += deviations.length;
      stats.scope_deviation_implementer_reported += 1;
    }
    if (envelope.blocker && typeof envelope.blocker === "object" && typeof envelope.blocker.reason === "string") {
      bump(stats.blocker_reasons, envelope.blocker.reason);
    }
    if (envelope.acceptance_independence !== null && envelope.acceptance_independence !== undefined) {
      stats.independence_recorded += 1;
    }
    if (isQualifiedAcceptanceIndependence(envelope.acceptance_independence)) {
      stats.independence_qualified += 1;
    }
  }

  for (const [contractKey, timeline] of Object.entries(contracts)) {
    stats.contracts[contractKey] = {
      contract_key: contractKey,
      contract_id: timeline.contract_id,
      workspace_key: timeline.workspace_key,
      ordering_status: timeline.ordering_status,
      ordering_errors: timeline.ordering_errors,
      all_valid_snapshots: timeline.all_valid_snapshots,
      all_exposures: timeline.all_exposures,
      current_snapshot: timeline.current_snapshot,
      current_phase: timeline.current_phase,
      current_verdict: timeline.current_verdict,
      highest_ever_phase: timeline.highest_ever_phase,
      current_acceptance_outcome: timeline.current_acceptance_outcome,
      accepted: timeline.accepted,
      qualified_independent_acceptance: timeline.qualified_independent_acceptance,
      single_legacy_snapshot: timeline.single_legacy_snapshot,
    };

    // Only ordered-valid contracts enter exposure/outcome denominators.
    if (timeline.ordering_status !== "valid") continue;

    for (const exposure of timeline.all_exposures) {
      const key = `${exposure.kind}::${exposure.ref}::${exposure.content_sha256}`;
      if (!stats.injected_ref_associations[key]) {
        stats.injected_ref_associations[key] = {
          kind: exposure.kind,
          ref: exposure.ref,
          content_sha256: exposure.content_sha256,
          unique_contract_exposures: 0,
          accepted_count: 0,
          qualified_independent_acceptance_count: 0,
          dimension_status: {},
          no_outcome_count: 0,
          contracts: [],
        };
      }
      const row = stats.injected_ref_associations[key];
      if (!row.contracts.includes(contractKey)) {
        row.contracts.push(contractKey);
        row.unique_contract_exposures += 1;
      }
      if (timeline.accepted) row.accepted_count += 1;
      if (timeline.qualified_independent_acceptance) {
        row.qualified_independent_acceptance_count += 1;
      } else {
        row.no_outcome_count += 1;
      }

      const gate = timeline.candidate_snapshots.find(
        (snap) => snap.digest === (timeline.current_snapshot && timeline.current_snapshot.digest),
      );
      const currentEnvelope = gate && gate.envelope;
      if (
        timeline.qualified_independent_acceptance &&
        currentEnvelope &&
        currentEnvelope.acceptance_gate &&
        currentEnvelope.acceptance_gate.status_by_dimension
      ) {
        for (const [dimension, record] of Object.entries(
          currentEnvelope.acceptance_gate.status_by_dimension,
        )) {
          const status =
            record && typeof record === "object" && typeof record.status === "string"
              ? record.status
              : "(malformed)";
          if (!row.dimension_status[dimension]) row.dimension_status[dimension] = {};
          bump(row.dimension_status[dimension], status);
          if (!stats.dimension_status[dimension]) stats.dimension_status[dimension] = {};
          bump(stats.dimension_status[dimension], status);
        }
      }
    }
  }

  for (const row of Object.values(stats.injected_ref_associations)) {
    delete row.contracts;
  }

  stats.effective_contracts = Object.entries(stats.contracts).map(([contractKey, timeline]) => ({
    contract_key: contractKey,
    contract_id: timeline.contract_id,
    workspace_key: timeline.workspace_key,
    phase: timeline.current_phase,
    verdict: timeline.current_verdict,
    digest: timeline.current_snapshot ? timeline.current_snapshot.digest : null,
    ordering_status: timeline.ordering_status,
    highest_ever_phase: timeline.highest_ever_phase,
    accepted: timeline.accepted,
    qualified_independent_acceptance: timeline.qualified_independent_acceptance,
  }));

  return stats;
}

function renderTable(title, map) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return [];
  const lines = [`${title}:`];
  for (const [key, count] of entries) lines.push(`  ${key}: ${count}`);
  return lines;
}

/** Redact absolute paths for human reports (relative to cwd if under cwd, else basename). */
function redactPathForReport(filePath, cwd = process.cwd()) {
  const resolved = path.resolve(String(filePath));
  const base = path.resolve(cwd);
  const relative = path.relative(base, resolved);
  if (relative && !relative.startsWith("..") && !path.isAbsolute(relative)) {
    return relative.split(path.sep).join("/");
  }
  return path.basename(resolved);
}

function renderReport(stats) {
  const lines = [];
  lines.push(stats.title || "AQL descriptive association report (not causal inference)");
  lines.push(
    `Snapshots: total ${stats.total_snapshots}, unique ${stats.unique_snapshots}, unique contracts ${stats.unique_contracts} (files scanned ${stats.scanned_files}, invalid ${stats.invalid.length})`,
  );
  if (Array.isArray(stats.workspace_keys) && stats.workspace_keys.length > 0) {
    lines.push(`Workspace keys: ${stats.workspace_keys.join(", ")}`);
  }
  lines.push(
    `Trust: parse_invalid ${stats.trust_counts.parse_invalid}, schema_invalid ${stats.trust_counts.schema_invalid}, reference_invalid ${stats.trust_counts.reference_invalid}, ordering_invalid ${stats.trust_counts.ordering_invalid}, valid_unqualified ${stats.trust_counts.valid_unqualified}, valid_qualified ${stats.trust_counts.valid_qualified}`,
  );
  lines.push(
    `injected_refs coverage (unique valid snapshots): missing/unknown ${stats.injected_refs_coverage.missing}, empty ${stats.injected_refs_coverage.empty}, populated ${stats.injected_refs_coverage.populated}`,
  );
  lines.push(...renderTable("By phase", stats.by_phase));
  lines.push(...renderTable("By verdict", stats.by_verdict));
  lines.push(...renderTable("By mode", stats.by_mode));
  lines.push(...renderTable("By assurance", stats.by_assurance));
  lines.push(...renderTable("By skill_version", stats.by_skill_version));
  for (const [dimension, statuses] of Object.entries(stats.dimension_status).sort()) {
    lines.push(...renderTable(`Dimension ${dimension}`, statuses));
  }
  lines.push(
    `Scope deviations (implementer-reported): ${stats.scope_deviation_total} across ${stats.scope_deviation_envelopes} envelope(s)`,
  );
  lines.push(...renderTable("Blocker reasons", stats.blocker_reasons));
  lines.push(
    `Acceptance-independence recorded (any value, including degraded): ${stats.independence_recorded}; qualified: ${stats.independence_qualified}`,
  );
  const assocEntries = Object.values(stats.injected_ref_associations || {});
  if (assocEntries.length > 0) {
    lines.push("Injected-ref descriptive associations (not causal):");
    for (const row of assocEntries.sort((a, b) => b.unique_contract_exposures - a.unique_contract_exposures)) {
      lines.push(
        `  ${row.kind} ${row.ref} ${row.content_sha256.slice(0, 12)}: contracts ${row.unique_contract_exposures}, accepted ${row.accepted_count}, qualified-independent ${row.qualified_independent_acceptance_count}, no-outcome ${row.no_outcome_count}`,
      );
    }
  }
  lines.push(stats.note);
  for (const file of stats.invalid) {
    lines.push(`INVALID (skipped): ${redactPathForReport(file)}`);
  }
  lines.push(`Envelopes scanned: ${stats.scanned_files} (parsed ${stats.parsed}, invalid ${stats.invalid.length})`);
  return lines.join("\n");
}

function fixtureSha(label) {
  return crypto.createHash("sha256").update(label, "utf8").digest("hex");
}

function makeBuiltEnvelope(overrides = {}) {
  const envelope = baseEnvelope();
  envelope.skill_version = "3.0.0";
  Object.assign(envelope, overrides);
  if (typeof envelope.contract_id === "string" && envelope.implementation_receipt) {
    envelope.implementation_receipt.input_contract_ref = `${envelope.contract_id}@tree`;
    envelope.resume_ref = `${envelope.contract_id}@tree`;
  }
  return envelope;
}

function makeAcceptedEnvelope(overrides = {}) {
  const envelope = baseEnvelope();
  envelope.intent = "accept";
  envelope.mode = "accept";
  envelope.phase = "ACCEPTED";
  envelope.verdict = "PASS";
  envelope.action_authority = "read";
  envelope.next_allowed_phase = "RELEASE_READY";
  envelope.acceptance_gate = passingGate("acceptance");
  envelope.acceptance_independence = {
    implementer_context_ref: "implementer-task",
    acceptor_context_ref: "acceptor-task",
    relation: "fresh_context",
    separation_evidence_ref: "source:fresh-acceptor-handoff",
    raw_evidence_before_implementer_narrative: true,
  };
  envelope.skill_version = "3.0.0";
  Object.assign(envelope, overrides);
  if (typeof envelope.contract_id === "string" && envelope.implementation_receipt) {
    envelope.implementation_receipt.input_contract_ref = `${envelope.contract_id}@tree`;
    envelope.resume_ref = `${envelope.contract_id}@tree`;
  }
  return envelope;
}

function writeSnapshotFile(filePath, envelope, sequence, previousDigest, recordedAt) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const prepared = {
    ...envelope,
    snapshot: {
      id: `snap-${sequence}-${path.basename(filePath)}`,
      recorded_at: recordedAt || `2026-08-12T10:00:${String(sequence).padStart(2, "0")}.000Z`,
      sequence,
      previous_digest: previousDigest,
      writer: "aql-envelope@3.0.0",
    },
  };
  const raw = `${JSON.stringify(prepared, null, 2)}\n`;
  fs.writeFileSync(filePath, raw, "utf8");
  return contentDigest(raw);
}

function findContractById(stats, contractId) {
  return Object.values(stats.contracts).find((row) => row.contract_id === contractId) || null;
}

function runSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aql-stats-"));
  let failures = 0;
  const check = (condition, label) => {
    console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
    if (!condition) failures += 1;
  };
  const beforeFiles = new Set(fs.readdirSync(root));
  try {
    fs.writeFileSync(path.join(root, "present.txt"), "ok\n", "utf8");
    const historyDir = path.join(root, "history");
    fs.mkdirSync(historyDir, { recursive: true });
    const aqlDir = path.join(root, ".agent-quality-loop");
    const aqlHistory = path.join(aqlDir, "history");
    fs.mkdirSync(aqlHistory, { recursive: true });

    // --- malformed JSON -> parse_invalid ---
    fs.writeFileSync(path.join(historyDir, "broken.json"), "{not json");

    // --- schema invalid ---
    fs.writeFileSync(
      path.join(historyDir, "schema-invalid.json"),
      `${JSON.stringify({ contract_id: "bad", phase: "ACCEPTED", verdict: "PASS" }, null, 2)}\n`,
    );

    // --- ACCEPTED + FAIL -> schema_invalid / excluded ---
    const acceptedFail = makeAcceptedEnvelope({ verdict: "FAIL" });
    acceptedFail.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(historyDir, "accepted-fail.json"), acceptedFail, 1, null);

    // --- ACCEPTED + failed dimension -> excluded ---
    const acceptedDimFail = makeAcceptedEnvelope();
    acceptedDimFail.artifact_refs = ["./present.txt"];
    acceptedDimFail.acceptance_gate.status_by_dimension.tests = {
      status: "FAIL",
      evidence_refs: ["tests:fail"],
    };
    writeSnapshotFile(path.join(historyDir, "accepted-dim-fail.json"), acceptedDimFail, 1, null);

    // --- same implementer/acceptor -> unqualified / excluded ---
    const sameCtx = makeAcceptedEnvelope();
    sameCtx.artifact_refs = ["./present.txt"];
    sameCtx.acceptance_independence = {
      implementer_context_ref: "same",
      acceptor_context_ref: "same",
      relation: "different_role",
      raw_evidence_before_implementer_narrative: true,
    };
    writeSnapshotFile(path.join(historyDir, "same-context.json"), sameCtx, 1, null);

    // --- missing injected_refs (unknown) vs empty ---
    const missingRefs = makeBuiltEnvelope({ contract_id: "task-missing-refs" });
    missingRefs.artifact_refs = ["./present.txt"];
    delete missingRefs.injected_refs;
    const dMissing = writeSnapshotFile(path.join(historyDir, "missing-refs.json"), missingRefs, 1, null);

    const emptyRefs = makeBuiltEnvelope({ contract_id: "task-empty-refs", injected_refs: [] });
    emptyRefs.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(historyDir, "empty-refs.json"), emptyRefs, 1, null);

    // --- invalid kind/class + missing sha excluded ---
    const badClass = makeBuiltEnvelope({
      contract_id: "task-bad-class",
      injected_refs: [
        {
          kind: "lesson",
          class: "structural",
          ref: "lessons.md#L1",
          content_sha256: fixtureSha("x"),
          reason: "bad",
        },
      ],
    });
    badClass.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(historyDir, "bad-class.json"), badClass, 1, null);

    const missingSha = makeBuiltEnvelope({
      contract_id: "task-missing-sha",
      injected_refs: [{ kind: "lesson", class: "learned", ref: "lessons.md#L1", reason: "no sha" }],
    });
    missingSha.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(historyDir, "missing-sha.json"), missingSha, 1, null);

    // --- BUILT exposure + ACCEPTED no refs => exposure retained ---
    const lessonSha = fixtureSha("lesson-A");
    const builtExposure = makeBuiltEnvelope({
      contract_id: "task-exposure-retain",
      injected_refs: [
        {
          kind: "lesson",
          class: "learned",
          ref: "lessons.md#L1@v1",
          content_sha256: lessonSha,
          reason: "pause on a dirty workspace",
        },
      ],
    });
    builtExposure.artifact_refs = ["./present.txt"];
    const d1 = writeSnapshotFile(path.join(aqlHistory, "exp-built.json"), builtExposure, 1, null);

    const acceptedNoRefs = makeAcceptedEnvelope({ contract_id: "task-exposure-retain" });
    acceptedNoRefs.artifact_refs = ["./present.txt"];
    // omit injected_refs field entirely on accepted
    delete acceptedNoRefs.injected_refs;
    const d2 = writeSnapshotFile(path.join(aqlHistory, "exp-accepted.json"), acceptedNoRefs, 2, d1);

    // current cache duplicate of accepted
    fs.writeFileSync(
      path.join(aqlDir, "envelope.json"),
      fs.readFileSync(path.join(aqlHistory, "exp-accepted.json"), "utf8"),
    );

    // --- earlier ACCEPTED + later EVIDENCED/BLOCKED ---
    const reopenAccepted = makeAcceptedEnvelope({ contract_id: "task-reopen" });
    reopenAccepted.artifact_refs = ["./present.txt"];
    reopenAccepted.injected_refs = [
      {
        kind: "lesson",
        class: "learned",
        ref: "lessons.md#reopen@v1",
        content_sha256: fixtureSha("reopen"),
        reason: "reopen lesson influenced the task",
      },
    ];
    const r1 = writeSnapshotFile(path.join(aqlHistory, "reopen-1.json"), reopenAccepted, 1, null);
    const reopenBlocked = makeBuiltEnvelope({
      contract_id: "task-reopen",
      intent: "diagnose",
      mode: "evidence",
      phase: "EVIDENCED",
      verdict: "BLOCKED",
      action_authority: "read",
      executor_adapter: null,
      implementation_receipt: null,
      next_allowed_phase: "BUILT",
      stop_reason: "scope_changed",
      acceptance_gate: null,
      acceptance_independence: null,
      blocker: {
        reason: "scope changed",
        missing: "rebuilt contract",
        owner: "user",
        minimal_unlock: "confirm scope",
        side_effects_not_taken: ["none"],
      },
      action_state_at_stop: {
        completed_actions: ["accepted earlier"],
        in_flight_actions: [],
        cancelled_before_start: [],
        external_authority_invalidated: true,
        local_edits: "kept",
      },
    });
    reopenBlocked.artifact_refs = ["./present.txt"];
    // Force mtime older than accepted to prove sequence wins over mtime.
    const reopen2Path = path.join(aqlHistory, "reopen-2.json");
    const r2 = writeSnapshotFile(
      reopen2Path,
      reopenBlocked,
      2,
      r1,
      "2026-08-12T10:00:02.000Z",
    );
    // mtime reversed relative to sequence order must not change current selection
    const past = new Date("2020-01-01T00:00:00.000Z");
    fs.utimesSync(reopen2Path, past, past);
    fs.utimesSync(path.join(aqlHistory, "reopen-1.json"), new Date(), new Date());

    // --- duplicate sequence -> ordering_invalid ---
    const dupA = makeBuiltEnvelope({ contract_id: "task-dup-seq" });
    dupA.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(aqlHistory, "dup-seq-a.json"), dupA, 1, null);
    const dupB = makeBuiltEnvelope({ contract_id: "task-dup-seq" });
    dupB.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(aqlHistory, "dup-seq-b.json"), dupB, 1, null);

    // --- broken previous_digest -> ordering_invalid ---
    const brokenPrev = makeBuiltEnvelope({ contract_id: "task-broken-prev" });
    brokenPrev.artifact_refs = ["./present.txt"];
    const bp1 = writeSnapshotFile(path.join(aqlHistory, "broken-prev-1.json"), brokenPrev, 1, null);
    const brokenPrev2 = makeBuiltEnvelope({ contract_id: "task-broken-prev" });
    brokenPrev2.artifact_refs = ["./present.txt"];
    writeSnapshotFile(
      path.join(aqlHistory, "broken-prev-2.json"),
      brokenPrev2,
      2,
      "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
    );

    // --- legacy unordered (no snapshot) -> not qualified ---
    const legacy = makeBuiltEnvelope({ contract_id: "task-legacy" });
    legacy.artifact_refs = ["./present.txt"];
    fs.writeFileSync(
      path.join(historyDir, "legacy.json"),
      `${JSON.stringify(legacy, null, 2)}\n`,
    );

    // --- two workspaces same contract_id stay distinct ---
    const wsA = path.join(root, "ws-a");
    const wsB = path.join(root, "ws-b");
    fs.mkdirSync(wsA, { recursive: true });
    fs.mkdirSync(wsB, { recursive: true });
    fs.writeFileSync(path.join(wsA, "present.txt"), "ok\n", "utf8");
    fs.writeFileSync(path.join(wsB, "present.txt"), "ok\n", "utf8");
    const sharedContractId = "shared-contract-id";
    const sharedA = makeBuiltEnvelope({ contract_id: sharedContractId });
    sharedA.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(wsA, ".agent-quality-loop", "history", "shared-a.json"), sharedA, 1, null);
    const sharedB = makeBuiltEnvelope({ contract_id: sharedContractId });
    sharedB.artifact_refs = ["./present.txt"];
    writeSnapshotFile(path.join(wsB, ".agent-quality-loop", "history", "shared-b.json"), sharedB, 1, null);

    const { files, missing } = listJsonFiles([
      root,
      aqlDir,
      path.join(wsA, ".agent-quality-loop"),
      path.join(wsB, ".agent-quality-loop"),
    ]);
    check(files.length >= 10 && missing.length === 0, "collects envelope.json plus history snapshots");
    const stats = aggregate(files, { workspace: root });

    check(stats.trust_counts.parse_invalid >= 1, "malformed JSON -> parse_invalid");
    check(stats.trust_counts.schema_invalid >= 1, "schema invalid -> schema_invalid");
    check(
      !stats.injected_ref_associations[
        `lesson::lessons.md#fail::${fixtureSha("fail")}`
      ],
      "ACCEPTED+FAIL excluded from associations",
    );
    check(
      stats.trust_paths.schema_invalid.some((file) => file.includes("accepted-fail")),
      "ACCEPTED+FAIL classified schema_invalid",
    );
    check(
      stats.trust_paths.schema_invalid.some((file) => file.includes("accepted-dim-fail")),
      "ACCEPTED+failed dimension excluded",
    );
    check(
      stats.trust_paths.schema_invalid.some((file) => file.includes("same-context")),
      "same implementer/acceptor -> unqualified/excluded",
    );

    check(stats.injected_refs_coverage.missing >= 1, "missing injected_refs -> unknown not empty");
    check(stats.injected_refs_coverage.empty >= 1, "empty injected_refs -> measured empty");
    check(
      stats.trust_paths.schema_invalid.some((file) => file.includes("bad-class")),
      "invalid kind/class -> excluded",
    );
    check(
      stats.trust_paths.schema_invalid.some((file) => file.includes("missing-sha")),
      "missing content_sha256 -> excluded",
    );

    const exposureKey = `lesson::lessons.md#L1@v1::${lessonSha}`;
    const exposureRow = stats.injected_ref_associations[exposureKey];
    check(!!exposureRow && exposureRow.unique_contract_exposures >= 1, "BUILT exposure + ACCEPTED no refs -> exposure retained");
    check(!!exposureRow && exposureRow.accepted_count >= 1, "exposure retain accepted_count from current ACCEPTED");
    check(!!exposureRow && exposureRow.qualified_independent_acceptance_count >= 1, "qualified independent acceptance counted");

    const reopen = findContractById(stats, "task-reopen");
    check(!!reopen && reopen.current_phase === "EVIDENCED", "earlier ACCEPTED + later BLOCKED -> current EVIDENCED");
    check(!!reopen && reopen.current_verdict === "BLOCKED", "current verdict BLOCKED after reopen");
    check(!!reopen && reopen.highest_ever_phase === "ACCEPTED", "highest_ever_phase remains ACCEPTED");
    check(!!reopen && reopen.accepted === false, "accepted_count 0 after reopen");
    const reopenAssoc = stats.injected_ref_associations[`lesson::lessons.md#reopen@v1::${fixtureSha("reopen")}`];
    check(!!reopenAssoc && reopenAssoc.accepted_count === 0, "reopen keeps exposure but accepted_count 0");

    check(d1 && d2 && r1 && r2 && dMissing, "fixture digests produced");
    const exposureRetain = findContractById(stats, "task-exposure-retain");
    check(
      !!exposureRetain && exposureRetain.all_valid_snapshots.length === 2,
      "duplicate digest current+history counted once in timeline",
    );

    const dupSeq = findContractById(stats, "task-dup-seq");
    check(!!dupSeq && dupSeq.ordering_status === "invalid", "duplicate sequence -> ordering_invalid");
    check(stats.trust_counts.ordering_invalid >= 1, "ordering_invalid trust count recorded");
    const brokenPrevContract = findContractById(stats, "task-broken-prev");
    check(!!brokenPrevContract && brokenPrevContract.ordering_status === "invalid", "broken previous_digest -> ordering_invalid");

    const legacyContract = findContractById(stats, "task-legacy");
    check(
      !!legacyContract &&
        legacyContract.ordering_status === "legacy_unordered" &&
        legacyContract.qualified_independent_acceptance === false &&
        !!legacyContract.single_legacy_snapshot,
      "legacy unordered -> not qualified",
    );

    check(
      typeof stats.title === "string" &&
        /descriptive association/i.test(stats.title) &&
        /not causal inference/i.test(stats.title),
      "title states descriptive association not causal inference",
    );
    check(!/effective lesson|ineffective lesson/i.test(renderReport(stats)), "no auto lesson effective/ineffective conclusions");

    const rendered = renderReport(stats);
    check(rendered.includes("Envelopes scanned:") && rendered.includes("INVALID"), "text report names totals and invalid files");
    const jsonText = JSON.stringify(stats);
    check(
      jsonText.includes("injected_refs_coverage") &&
        jsonText.includes("injected_ref_associations") &&
        jsonText.includes("trust_counts"),
      "--json machine-readable fields present",
    );

    check(
      rendered.includes("Workspace keys:") && !rendered.includes(root),
      "report outputs workspace_key not absolute workspace path",
    );

    const sharedRows = Object.values(stats.contracts).filter((row) => row.contract_id === sharedContractId);
    check(sharedRows.length === 2, "two workspaces same contract_id -> unique_contracts=2");
    check(
      sharedRows.every((row) => row.ordering_status === "valid"),
      "each shared-contract workspace ordering valid (single seq 1)",
    );
    check(
      sharedRows[0] && sharedRows[1] && sharedRows[0].workspace_key !== sharedRows[1].workspace_key,
      "workspace keys differ across workspaces",
    );

    const missingProbe = listJsonFiles([path.join(root, "does-not-exist")]);
    check(missingProbe.files.length === 0 && missingProbe.missing.length === 1, "missing inputs reported, not fatal");

    const afterFiles = new Set(fs.readdirSync(root));
    check(
      [...afterFiles].every(
        (name) =>
          beforeFiles.has(name) ||
          name === "envelope.json" ||
          name === "history" ||
          name === "present.txt" ||
          name === ".agent-quality-loop" ||
          name === "ws-a" ||
          name === "ws-b",
      ),
      "no auto writes outside fixture inputs",
    );
    check(!fs.existsSync(path.join(root, "lessons.md")) && !fs.existsSync(path.join(root, ".ai")), "no auto writes to lessons/profile");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(failures === 0 ? "Self-test passed" : `Self-test failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

const USAGE =
  "Usage: node scripts/aql-stats.js [paths...] [--json] [--self-test]  (default path: ./.agent-quality-loop)";

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  if (argv.includes("--self-test")) return runSelfTest();
  const json = argv.includes("--json");
  const inputs = argv.filter((arg) => !arg.startsWith("--"));
  const { files, missing } = listJsonFiles(inputs.length > 0 ? inputs : [".agent-quality-loop"]);
  const stats = aggregate(files);
  stats.missing_inputs = missing;
  if (json) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(renderReport(stats));
    for (const input of missing) console.log(`MISSING input (skipped): ${input}`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  listJsonFiles,
  aggregate,
  renderReport,
  redactPathForReport,
  dedupeByDigest,
  contractKeyFor,
  workspaceKey,
  isQualifiedAcceptanceIndependence,
  TRUST_CLASSES,
  main,
};
