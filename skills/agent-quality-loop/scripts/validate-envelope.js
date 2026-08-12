#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { fileURLToPath, pathToFileURL } = require("url");

const SCHEMA_VERSION = "agent-quality-loop/v2";
const PHASES = [
  "RAW",
  "ALIGNED",
  "EVIDENCED",
  "BUILT",
  "ACCEPTED",
  "RELEASE_READY",
  "DEPLOYED",
  "PRODUCTION_VERIFIED",
];
const VERDICTS = ["PASS", "FAIL", "BLOCKED", "PASS_WITH_RISK", "PENDING"];
const MODES = ["align", "evidence", "execute", "accept", "release", "full"];
const INTENTS = ["align", "diagnose", "implement", "accept", "release", "resume"];
const ASSURANCES = ["fast", "standard", "formal"];
const AUTHORITIES = ["read", "local_write", "external_write", "destructive", "release"];
const RELEASE_INTENTS = [null, "preflight", "act"];
const RECONSTRUCTION_STATUSES = ["supplied", "reconstructed", "incomplete"];
const CHANGE_CLASSES = ["display_only", "content", "data", "capability", "algorithm", "rollout", "release", "mixed"];
const STOP_REASONS = [
  null,
  "evidence_only_complete",
  "user_cancelled",
  "scope_changed",
  "authority_revoked",
  "ambiguity",
  "evidence_gap",
  "authority_gap",
  "unsafe_workspace",
  "acceptance_pending",
  "acceptance_failed",
  "production_verified",
];

const ACCEPTANCE_DIMENSIONS = [
  "goal_fidelity",
  "semantic_invariants",
  "user_observable_result",
  "source_static",
  "tests",
  "runtime_native",
  "privacy_security",
  "reproducibility",
];
const ACCEPTANCE_ALWAYS = [
  "goal_fidelity",
  "semantic_invariants",
  "user_observable_result",
  "reproducibility",
];
const RELEASE_DIMENSIONS = [
  "artifact_identity",
  "accepted_baseline",
  "automated_checks",
  "runtime_native_or_real_target",
  "privacy_security",
  "target_environment",
  "rollback_recovery",
  "manual_release_checks",
];
const RELEASE_ALWAYS = [
  "artifact_identity",
  "accepted_baseline",
  "target_environment",
  "rollback_recovery",
];
const BARE_PATH_EXTENSIONS = new Set([
  ".c", ".cc", ".cpp", ".cs", ".css", ".csv", ".go", ".h", ".hpp", ".html", ".java",
  ".js", ".json", ".jsx", ".md", ".mdc", ".mjs", ".py", ".rb", ".rs", ".sh", ".sql",
  ".toml", ".ts", ".tsx", ".txt", ".xml", ".yaml", ".yml",
]);
const BARE_PATH_BASENAMES = new Set([
  "readme",
  "license",
  "copying",
  "notice",
  "makefile",
  "dockerfile",
  "procfile",
  "gemfile",
  "rakefile",
  "cmakelists.txt",
  ".gitignore",
  ".gitattributes",
  ".npmrc",
  ".editorconfig",
]);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function nonEmptyField(value) {
  return nonEmptyString(value) || nonEmptyArray(value) || (isObject(value) && Object.keys(value).length > 0);
}

function equalSets(left, right) {
  if (left.length !== right.length) return false;
  const a = [...left].sort();
  const b = [...right].sort();
  return a.every((value, index) => value === b[index]);
}

function validateGate(gate, kind, requirePass, errors) {
  const canonical = kind === "acceptance" ? ACCEPTANCE_DIMENSIONS : RELEASE_DIMENSIONS;
  const always = kind === "acceptance" ? ACCEPTANCE_ALWAYS : RELEASE_ALWAYS;
  const canonicalSet = kind === "acceptance" ? "acceptance_v1" : "release_v1";
  const label = `${kind}_gate`;

  if (!isObject(gate)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (gate.canonical_set !== canonicalSet) {
    errors.push(`${label}.canonical_set must be ${canonicalSet}`);
  }
  if (!nonEmptyArray(gate.required_dimensions)) {
    errors.push(`${label}.required_dimensions must be non-empty`);
    return;
  }
  if (!isObject(gate.applicability)) {
    errors.push(`${label}.applicability must classify every canonical dimension`);
    return;
  }
  if (!isObject(gate.status_by_dimension)) {
    errors.push(`${label}.status_by_dimension must be an object`);
    return;
  }

  const unknownRequired = gate.required_dimensions.filter((name) => !canonical.includes(name));
  if (unknownRequired.length > 0) {
    errors.push(`${label}.required_dimensions has unknown names: ${unknownRequired.join(", ")}`);
  }

  const classifiedRequired = [];
  for (const dimension of canonical) {
    const record = gate.applicability[dimension];
    if (!isObject(record) || !["required", "not_applicable"].includes(record.disposition)) {
      errors.push(`${label}.applicability.${dimension} must be required or not_applicable`);
      continue;
    }
    if (record.disposition === "required") {
      classifiedRequired.push(dimension);
    } else {
      if (!nonEmptyString(record.rationale)) {
        errors.push(`${label}.applicability.${dimension}.rationale is required`);
      }
      if (!nonEmptyString(record.evidence_ref) || ["unknown", "NOT_RUN"].includes(record.evidence_ref)) {
        errors.push(`${label}.applicability.${dimension}.evidence_ref must be concrete`);
      }
    }
  }

  if (!equalSets(gate.required_dimensions, classifiedRequired)) {
    errors.push(`${label}.required_dimensions must exactly match required applicability records`);
  }
  for (const dimension of always) {
    if (!gate.required_dimensions.includes(dimension)) {
      errors.push(`${label}.required_dimensions must include ${dimension}`);
    }
  }

  for (const dimension of gate.required_dimensions) {
    const status = gate.status_by_dimension[dimension];
    if (!isObject(status) || !["PASS", "FAIL", "BLOCKED", "NOT_RUN"].includes(status.status)) {
      errors.push(`${label}.status_by_dimension.${dimension}.status is invalid`);
      continue;
    }
    if (status.status === "PASS" && !nonEmptyArray(status.evidence_refs)) {
      errors.push(`${label}.status_by_dimension.${dimension}.evidence_refs must be non-empty for PASS`);
    }
    if (["BLOCKED", "NOT_RUN"].includes(status.status) && !nonEmptyField(status.missing_evidence)) {
      errors.push(`${label}.status_by_dimension.${dimension}.missing_evidence is required for ${status.status}`);
    }
    if (requirePass && status.status !== "PASS") {
      errors.push(`${label}.${dimension} must PASS for this phase`);
    }
  }
}

function validateCoverage(coverage, errors) {
  if (coverage === null || coverage === undefined) return;
  if (!isObject(coverage) || !["simulation", "actual_action"].includes(coverage.mode)) {
    errors.push("side_effect_coverage.mode must be simulation or actual_action");
    return;
  }
  if (!nonEmptyString(coverage.command)) {
    errors.push("side_effect_coverage.command must be an exact non-empty command or operation");
  }
  if (coverage.all_paths_accounted_for !== true) {
    errors.push("side_effect_coverage.all_paths_accounted_for must be true");
  }
  const paths = Array.isArray(coverage.paths) ? coverage.paths : [];
  if (paths.length === 0 && !nonEmptyString(coverage.no_external_paths_evidence_ref)) {
    errors.push("empty side_effect_coverage.paths requires no_external_paths_evidence_ref");
  }
  for (const [index, path] of paths.entries()) {
    if (!isObject(path) || !nonEmptyString(path.path) || !nonEmptyString(path.effect)) {
      errors.push(`side_effect_coverage.paths[${index}] must name path and effect`);
      continue;
    }
    if (!nonEmptyString(path.evidence_ref)) {
      errors.push(`side_effect_coverage.paths[${index}] must be evidence-bound`);
    }
    if (coverage.mode === "simulation" && path.short_circuited !== true) {
      errors.push(`side_effect_coverage.paths[${index}] must be short-circuited for simulation`);
    }
    if (coverage.mode === "actual_action" && (path.expected_and_authorized !== true || !nonEmptyString(path.rollback_ref))) {
      errors.push(`side_effect_coverage.paths[${index}] must be authorized and rollback-accounted for actual action`);
    }
  }
  if (coverage.mode === "simulation" && coverage.all_external_effects_short_circuited !== true) {
    errors.push("simulation requires all_external_effects_short_circuited true");
  }
}

function validateAuthorization(envelope, errors) {
  validateCoverage(envelope.side_effect_coverage, errors);
  const authorization = envelope.release_authorization;
  const elevatedAuthority = AUTHORITIES.indexOf(envelope.action_authority) > AUTHORITIES.indexOf("local_write");
  const fields = [
    "environment",
    "operation",
    "targets",
    "expected_effects",
    "principal_or_role",
    "rollback",
    "manual_checks",
    "expires_on",
  ];
  const validAuthorization = isObject(authorization) && authorization.authorized_this_turn === true;

  if (elevatedAuthority && !validAuthorization) {
    errors.push(`action_authority ${envelope.action_authority} requires complete current-turn authorization`);
  }
  if (validAuthorization) {
    for (const field of fields) {
      const value = authorization[field];
      if (!nonEmptyField(value)) {
        errors.push(`release_authorization.${field} is required`);
      }
    }
  } else if (authorization !== null && authorization !== undefined) {
    errors.push("release_authorization must be null or an authorized current-turn object");
  }
  if (!elevatedAuthority && authorization !== null && authorization !== undefined) {
    errors.push("release_authorization must be null when action_authority is read or local_write");
  }

  if (envelope.release_intent === "preflight") {
    if (envelope.action_authority !== "read") {
      errors.push("release preflight must keep action_authority read");
    }
    if (!["ACCEPTED", "RELEASE_READY"].includes(envelope.phase)) {
      errors.push("release preflight requires phase ACCEPTED or RELEASE_READY");
    }
  }

  if (envelope.release_intent !== "act") return;
  if (envelope.phase !== "RELEASE_READY") {
    errors.push("release_intent act requires phase exactly RELEASE_READY");
  }
  if (envelope.action_authority !== "release") {
    errors.push("release_intent act requires action_authority release");
  }
  if (!validAuthorization) {
    errors.push("release act requires current-turn authorization");
  }
  if (!isObject(envelope.side_effect_coverage) || envelope.side_effect_coverage.mode !== "actual_action") {
    errors.push("release act requires actual_action side_effect_coverage");
  }
}

function validateEnvelope(envelope) {
  const errors = [];
  const requiredStrings = [
    "contract_id",
    "resume_ref",
    "raw_request",
    "first_principles_goal",
    "target_user_or_system",
    "problem_signal",
    "change_class",
    "evidence_authority",
    "workspace_ref",
    "reconstruction_status",
    "expiry_or_drift_condition",
  ];

  if (!isObject(envelope)) return ["envelope must be a JSON object"];
  if (envelope.schema_version !== SCHEMA_VERSION) errors.push(`schema_version must be ${SCHEMA_VERSION}`);
  if (Object.prototype.hasOwnProperty.call(envelope, "skill_version")) {
    if (!nonEmptyString(envelope.skill_version)) {
      errors.push("skill_version must be a non-empty string when present");
    }
  }
  for (const field of requiredStrings) {
    if (!nonEmptyString(envelope[field])) {
      errors.push(`${field} must be a non-empty string`);
    }
  }
  for (const [field, values] of [
    ["intent", INTENTS],
    ["assurance", ASSURANCES],
    ["mode", MODES],
    ["phase", PHASES],
    ["verdict", VERDICTS],
    ["action_authority", AUTHORITIES],
    ["release_intent", RELEASE_INTENTS],
    ["reconstruction_status", RECONSTRUCTION_STATUSES],
    ["change_class", CHANGE_CLASSES],
  ]) {
    if (!values.includes(envelope[field])) errors.push(`${field} has an invalid value`);
  }

  for (const field of [
    "success_observables",
    "counterexamples",
    "scope_allowlist",
    "non_goals",
    "pause_conditions",
    "artifact_refs",
    "evidence_refs",
    "unknowns",
  ]) {
    if (!Array.isArray(envelope[field])) errors.push(`${field} must be an array`);
  }
  for (const field of ["success_observables", "counterexamples", "scope_allowlist", "non_goals"]) {
    if (!nonEmptyArray(envelope[field])) errors.push(`${field} must be non-empty`);
  }
  const stopReasons = Array.isArray(envelope.stop_reason) ? envelope.stop_reason : [envelope.stop_reason];
  if (stopReasons.length === 0 || stopReasons.some((reason) => !STOP_REASONS.includes(reason))) {
    errors.push("stop_reason has an invalid value");
  }
  if (!isObject(envelope.assumptions) && !Array.isArray(envelope.assumptions)) {
    errors.push("assumptions must be an object or array");
  }

  const intentModes = {
    align: ["align"],
    diagnose: ["evidence"],
    implement: ["execute", "full"],
    accept: ["accept"],
    release: ["release"],
    resume: MODES,
  };
  if (intentModes[envelope.intent] && !intentModes[envelope.intent].includes(envelope.mode)) {
    errors.push(`intent ${envelope.intent} is inconsistent with mode ${envelope.mode}`);
  }

  const phaseIndex = PHASES.indexOf(envelope.phase);
  const maxPhase = { align: "ALIGNED", evidence: "EVIDENCED", execute: "BUILT", accept: "ACCEPTED", full: "ACCEPTED" };
  if (maxPhase[envelope.mode] && phaseIndex > PHASES.indexOf(maxPhase[envelope.mode])) {
    errors.push(`mode ${envelope.mode} cannot advance beyond ${maxPhase[envelope.mode]}`);
  }
  if (envelope.mode === "full" && AUTHORITIES.indexOf(envelope.action_authority) > AUTHORITIES.indexOf("local_write")) {
    errors.push("mode full cannot have authority above local_write");
  }
  if (["align", "evidence", "accept"].includes(envelope.mode) && envelope.action_authority !== "read") {
    errors.push(`mode ${envelope.mode} requires action_authority read`);
  }
  if (envelope.mode === "execute" && AUTHORITIES.indexOf(envelope.action_authority) > AUTHORITIES.indexOf("local_write")) {
    errors.push("mode execute cannot have authority above local_write");
  }
  if (envelope.release_intent !== null && (envelope.intent !== "release" || envelope.mode !== "release")) {
    errors.push("release_intent requires intent release and mode release");
  }
  if (
    envelope.mode === "release" &&
    envelope.release_intent === null &&
    phaseIndex < PHASES.indexOf("DEPLOYED")
  ) {
    errors.push("mode release requires release_intent preflight or act");
  }
  if (envelope.reconstruction_status === "incomplete") {
    if (phaseIndex > PHASES.indexOf("EVIDENCED")) {
      errors.push("incomplete reconstruction cannot advance beyond EVIDENCED");
    }
    if (envelope.action_authority !== "read") {
      errors.push("incomplete reconstruction requires action_authority read");
    }
    if (!["BLOCKED", "PENDING"].includes(envelope.verdict)) {
      errors.push("incomplete reconstruction requires verdict BLOCKED or PENDING");
    }
    if (envelope.phase === "EVIDENCED" && envelope.next_allowed_phase !== null) {
      errors.push("incomplete EVIDENCED reconstruction cannot authorize a BUILT transition");
    }
  }
  if (phaseIndex >= PHASES.indexOf("DEPLOYED")) {
    if (envelope.action_authority !== "read") {
      errors.push("DEPLOYED or PRODUCTION_VERIFIED must clear active authority to read");
    }
    if (envelope.release_authorization !== null && envelope.release_authorization !== undefined) {
      errors.push("DEPLOYED or PRODUCTION_VERIFIED must clear release_authorization");
    }
    if (envelope.release_intent !== null) {
      errors.push("DEPLOYED or PRODUCTION_VERIFIED must clear release_intent");
    }
  }

  if (envelope.next_allowed_phase !== null && !PHASES.includes(envelope.next_allowed_phase)) {
    errors.push("next_allowed_phase must be a declared phase or null");
  }
  const legalNext = {
    RAW: "ALIGNED",
    ALIGNED: "EVIDENCED",
    EVIDENCED: "BUILT",
    BUILT: "ACCEPTED",
    ACCEPTED: "RELEASE_READY",
    RELEASE_READY: "DEPLOYED",
    DEPLOYED: "PRODUCTION_VERIFIED",
    PRODUCTION_VERIFIED: null,
  };
  if (envelope.next_allowed_phase !== null && envelope.next_allowed_phase !== legalNext[envelope.phase]) {
    errors.push(`next_allowed_phase must be ${legalNext[envelope.phase] ?? "null"} from ${envelope.phase}`);
  }
  if (
    envelope.intent === "diagnose" &&
    envelope.mode === "evidence" &&
    envelope.phase === "EVIDENCED" &&
    envelope.next_allowed_phase === null &&
    !stopReasons.includes("evidence_only_complete")
  ) {
    errors.push("evidence-only terminal requires stop_reason evidence_only_complete");
  }

  if (phaseIndex >= PHASES.indexOf("BUILT")) {
    const receipt = envelope.implementation_receipt;
    if (!nonEmptyString(envelope.executor_adapter)) errors.push("BUILT or later requires executor_adapter");
    if (!isObject(receipt)) {
      errors.push("BUILT or later requires implementation_receipt");
    } else {
      if (receipt.result_phase !== "BUILT") errors.push("implementation_receipt.result_phase must be BUILT");
      if (!nonEmptyString(receipt.adapter) || !nonEmptyString(receipt.input_contract_ref)) {
        errors.push("implementation_receipt must identify adapter and input contract");
      }
      if (nonEmptyString(envelope.executor_adapter) && receipt.adapter !== envelope.executor_adapter) {
        errors.push("implementation_receipt.adapter must match executor_adapter");
      }
      if (nonEmptyString(receipt.input_contract_ref) && !receipt.input_contract_ref.includes(envelope.contract_id)) {
        errors.push("implementation_receipt.input_contract_ref must bind the current contract id");
      }
      for (const field of [
        "changed_artifacts",
        "verification_performed",
        "passing_evidence_refs",
        "failing_evidence_refs",
        "not_run",
        "scope_deviations",
        "remaining_risks",
      ]) {
        if (!Array.isArray(receipt[field])) errors.push(`implementation_receipt.${field} must be an array`);
      }
      if (!nonEmptyArray(receipt.verification_performed) && !nonEmptyArray(receipt.not_run)) {
        errors.push("implementation_receipt requires verification_performed or explicit not_run checks");
      }
    }
  }

  const requiresAcceptance = phaseIndex >= PHASES.indexOf("ACCEPTED");
  if (envelope.acceptance_gate !== null || requiresAcceptance) {
    validateGate(envelope.acceptance_gate, "acceptance", requiresAcceptance, errors);
  }
  if (requiresAcceptance) {
    const independence = envelope.acceptance_independence;
    if (
      !isObject(independence) ||
      !nonEmptyString(independence.implementer_context_ref) ||
      !nonEmptyString(independence.acceptor_context_ref) ||
      independence.implementer_context_ref === independence.acceptor_context_ref ||
      !["fresh_context", "different_role"].includes(independence.relation) ||
      independence.raw_evidence_before_implementer_narrative !== true
    ) {
      errors.push("ACCEPTED or later requires evidenced independent acceptance");
    }
  }

  const requiresReleaseGate = phaseIndex >= PHASES.indexOf("RELEASE_READY");
  if (envelope.release_gate !== null && envelope.release_gate !== undefined) {
    if (phaseIndex < PHASES.indexOf("ACCEPTED")) {
      errors.push("release_gate must remain null until release preflight begins from ACCEPTED");
    }
    if (envelope.phase === "ACCEPTED" && envelope.release_intent !== "preflight") {
      errors.push("release_gate at ACCEPTED requires release_intent preflight");
    }
  }
  if (envelope.release_gate !== null || requiresReleaseGate) {
    validateGate(envelope.release_gate, "release", requiresReleaseGate, errors);
  }
  validateAuthorization(envelope, errors);

  if (["BLOCKED", "PENDING"].includes(envelope.verdict)) {
    if (!isObject(envelope.blocker)) {
      errors.push(`${envelope.verdict} requires an actionable blocker`);
    } else {
      for (const field of ["reason", "missing", "owner", "minimal_unlock", "side_effects_not_taken"]) {
        if (!nonEmptyField(envelope.blocker[field])) {
          errors.push(`blocker.${field} is required for ${envelope.verdict}`);
        }
      }
    }
  }
  if (stopReasons.some((reason) => ["user_cancelled", "scope_changed", "authority_revoked"].includes(reason))) {
    if (!["BLOCKED", "PENDING"].includes(envelope.verdict)) {
      errors.push("user stop, scope change, or authority revocation requires verdict BLOCKED or PENDING");
    }
    if (AUTHORITIES.indexOf(envelope.action_authority) > AUTHORITIES.indexOf("local_write")) {
      errors.push("user stop, scope change, or authority revocation must clear elevated action authority");
    }
    if (envelope.release_authorization !== null && envelope.release_authorization !== undefined) {
      errors.push("user stop, scope change, or authority revocation must clear release_authorization");
    }
    if (envelope.release_intent !== null) {
      errors.push("user stop, scope change, or authority revocation must clear release_intent");
    }
    const state = envelope.action_state_at_stop;
    if (!isObject(state)) {
      errors.push(`${stopReasons.filter(Boolean).join(",")} requires action_state_at_stop`);
    } else {
      for (const field of ["completed_actions", "in_flight_actions", "cancelled_before_start"]) {
        if (!Array.isArray(state[field])) errors.push(`action_state_at_stop.${field} must be an array`);
      }
      if (typeof state.external_authority_invalidated !== "boolean") {
        errors.push("action_state_at_stop.external_authority_invalidated must be boolean");
      }
      if (!["kept", "revert_authorized", "revert_pending_choice", "none", "unknown"].includes(state.local_edits)) {
        errors.push("action_state_at_stop.local_edits has an invalid value");
      }
      const hasRecordedState =
        nonEmptyArray(state.completed_actions) ||
        nonEmptyArray(state.in_flight_actions) ||
        nonEmptyArray(state.cancelled_before_start) ||
        state.external_authority_invalidated === true ||
        !["none", "unknown"].includes(state.local_edits);
      if (!hasRecordedState) {
        errors.push("action_state_at_stop must record at least one concrete action, invalidated authority, or local-edit disposition");
      }
      if (state.external_authority_invalidated !== true) {
        errors.push("user stop, scope change, or authority revocation requires external_authority_invalidated true");
      }
    }
  }

  return errors;
}

function baseEnvelope() {
  return {
    schema_version: SCHEMA_VERSION,
    contract_id: "self-test",
    resume_ref: "self-test@tree",
    intent: "implement",
    assurance: "standard",
    mode: "execute",
    phase: "BUILT",
    verdict: "PASS",
    raw_request: "Fix a local bug",
    first_principles_goal: "The observable local bug no longer occurs",
    target_user_or_system: "local user",
    problem_signal: "reproduced local failure",
    success_observables: ["focused reproduction passes"],
    counterexamples: ["failure still reproduces"],
    change_class: "capability",
    scope_allowlist: ["src/handler.js"],
    non_goals: ["deployment"],
    evidence_authority: "source/static -> focused local runtime",
    pause_conditions: ["scope expansion"],
    action_authority: "local_write",
    executor_adapter: "ask-plan-code-qa/embedded",
    release_intent: null,
    release_authorization: null,
    side_effect_coverage: null,
    assumptions: [],
    workspace_ref: "branch@tree clean",
    artifact_refs: ["src/handler.js@hash"],
    evidence_refs: ["focused-test@result"],
    implementation_receipt: {
      adapter: "ask-plan-code-qa/embedded",
      input_contract_ref: "self-test@tree",
      changed_artifacts: ["src/handler.js"],
      verification_performed: ["focused test: pass"],
      passing_evidence_refs: ["focused-test@result"],
      failing_evidence_refs: [],
      not_run: [],
      scope_deviations: [],
      remaining_risks: [],
      result_phase: "BUILT",
    },
    acceptance_gate: null,
    release_gate: null,
    reconstruction_status: "supplied",
    acceptance_independence: null,
    unknowns: [],
    next_allowed_phase: "ACCEPTED",
    stop_reason: null,
    blocker: null,
    action_state_at_stop: null,
    expiry_or_drift_condition: "tree changes",
  };
}

function passingGate(kind) {
  const canonical = kind === "acceptance" ? ACCEPTANCE_DIMENSIONS : RELEASE_DIMENSIONS;
  return {
    canonical_set: kind === "acceptance" ? "acceptance_v1" : "release_v1",
    required_dimensions: [...canonical],
    applicability: Object.fromEntries(canonical.map((dimension) => [dimension, { disposition: "required" }])),
    status_by_dimension: Object.fromEntries(
      canonical.map((dimension) => [dimension, { status: "PASS", evidence_refs: [`${kind}:${dimension}:evidence`] }]),
    ),
  };
}

function looksLikeFilePath(value) {
  if (typeof value !== "string") return false;
  const trimmed = stripDigestSuffix(value.trim());
  if (!trimmed) return false;
  if (/^file:/i.test(trimmed)) return true;
  if (trimmed.startsWith("./") || trimmed.startsWith("../")) return true;
  if (trimmed.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(trimmed)) return true;
  const basename = trimmed.split(/[\\/]/).pop().toLowerCase();
  if (BARE_PATH_BASENAMES.has(basename)) return true;
  if (!/[\\/]/.test(trimmed)) {
    return !/\s/.test(trimmed) && BARE_PATH_EXTENSIONS.has(path.extname(trimmed).toLowerCase());
  }
  return BARE_PATH_EXTENSIONS.has(path.extname(trimmed).toLowerCase());
}

function stripDigestSuffix(value) {
  return value.replace(/@[a-f0-9]{64}$/i, "");
}

function resolveRefPath(ref, baseDir) {
  let value = stripDigestSuffix(ref.trim());
  if (/^file:/i.test(value)) {
    if (/^file:\/\//i.test(value)) {
      try {
        return fileURLToPath(value);
      } catch {
        // Fall through to the explicit legacy relative-file form below.
      }
    }
    value = value.slice("file:".length);
    try {
      value = decodeURIComponent(value);
    } catch {
      // keep raw path when URI decoding fails
    }
  }
  if (/^[A-Za-z]:[\\/]/.test(value) || value.startsWith("/")) {
    return path.resolve(value);
  }
  return path.resolve(baseDir, value);
}

function validateRefPaths(envelope, baseDir) {
  const errors = [];
  if (!isObject(envelope)) return ["envelope must be a JSON object"];
  const missing = [];
  for (const field of ["artifact_refs", "evidence_refs"]) {
    const refs = Array.isArray(envelope[field]) ? envelope[field] : [];
    for (const [index, ref] of refs.entries()) {
      if (!looksLikeFilePath(ref)) continue;
      const resolved = resolveRefPath(ref, baseDir);
      if (!fs.existsSync(resolved)) {
        missing.push(`${field}[${index}]=${ref}`);
      }
    }
  }
  if (missing.length > 0) {
    errors.push(`missing path refs: ${missing.join("; ")}`);
  }
  return errors;
}

function runCheckRefs(envelopePath, baseDir) {
  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(envelopePath, "utf8"));
  } catch (error) {
    console.error(`INVALID: cannot read JSON envelope: ${error.message}`);
    return 2;
  }
  const structural = validateEnvelope(envelope);
  if (structural.length > 0) {
    for (const error of structural) console.error(`INVALID: ${error}`);
    return 1;
  }
  const refErrors = validateRefPaths(envelope, baseDir);
  if (refErrors.length > 0) {
    for (const error of refErrors) console.error(`INVALID: ${error}`);
    return 1;
  }
  console.log("VALID: structural envelope invariants and path refs passed; semantic evidence still requires review");
  return 0;
}

function runSelfTest() {
  const cases = [];
  cases.push({ name: "valid built envelope", envelope: baseEnvelope(), valid: true });

  const withSkillVersion = baseEnvelope();
  withSkillVersion.skill_version = "2.5.0";
  cases.push({ name: "optional skill_version accepted", envelope: withSkillVersion, valid: true });

  const emptySkillVersion = baseEnvelope();
  emptySkillVersion.skill_version = "   ";
  cases.push({
    name: "empty skill_version rejected",
    envelope: emptySkillVersion,
    valid: false,
    expectedError: "skill_version must be a non-empty string when present",
  });

  const fullRelease = baseEnvelope();
  fullRelease.mode = "full";
  fullRelease.phase = "RELEASE_READY";
  cases.push({ name: "full cannot reach release-ready", envelope: fullRelease, valid: false, expectedError: "mode full cannot advance beyond ACCEPTED" });

  const badReceipt = baseEnvelope();
  badReceipt.implementation_receipt.result_phase = "ACCEPTED";
  cases.push({ name: "adapter cannot accept", envelope: badReceipt, valid: false, expectedError: "implementation_receipt.result_phase must be BUILT" });

  const mismatchedAdapter = baseEnvelope();
  mismatchedAdapter.implementation_receipt.adapter = "different-adapter/v1";
  cases.push({ name: "receipt must bind selected adapter", envelope: mismatchedAdapter, valid: false, expectedError: "implementation_receipt.adapter must match executor_adapter" });

  const raisedAuthority = baseEnvelope();
  raisedAuthority.mode = "full";
  raisedAuthority.action_authority = "release";
  cases.push({ name: "full cannot raise authority", envelope: raisedAuthority, valid: false, expectedError: "mode full cannot have authority above local_write" });

  const partialDryRun = baseEnvelope();
  partialDryRun.side_effect_coverage = {
    mode: "simulation",
    command: "admin --dry-run all",
    paths: [
      {
        path: "deployFunction",
        effect: "remote deployment",
        short_circuited: false,
        evidence_ref: "source:deployFunction",
      },
    ],
    all_paths_accounted_for: true,
    all_external_effects_short_circuited: false,
  };
  cases.push({ name: "partial dry-run is rejected", envelope: partialDryRun, valid: false, expectedError: "must be short-circuited for simulation" });

  const missingAuthorization = baseEnvelope();
  missingAuthorization.action_authority = "external_write";
  cases.push({ name: "elevated authority requires authorization", envelope: missingAuthorization, valid: false, expectedError: "requires complete current-turn authorization" });

  const earlyReleaseGate = baseEnvelope();
  earlyReleaseGate.release_gate = {};
  cases.push({ name: "release gate cannot appear before preflight", envelope: earlyReleaseGate, valid: false, expectedError: "release_gate must remain null until release preflight" });

  const arrayContractId = baseEnvelope();
  arrayContractId.contract_id = ["self-test"];
  cases.push({ name: "contract id must be scalar", envelope: arrayContractId, valid: false, expectedError: "contract_id must be a non-empty string" });

  const missingCoverageCommand = baseEnvelope();
  missingCoverageCommand.side_effect_coverage = {
    mode: "simulation",
    paths: [],
    no_external_paths_evidence_ref: "source:no-external-path",
    all_paths_accounted_for: true,
    all_external_effects_short_circuited: true,
  };
  cases.push({ name: "coverage requires exact command", envelope: missingCoverageCommand, valid: false, expectedError: "side_effect_coverage.command" });

  const evidenceTerminal = baseEnvelope();
  evidenceTerminal.intent = "diagnose";
  evidenceTerminal.mode = "evidence";
  evidenceTerminal.phase = "EVIDENCED";
  evidenceTerminal.executor_adapter = null;
  evidenceTerminal.implementation_receipt = null;
  evidenceTerminal.next_allowed_phase = null;
  evidenceTerminal.stop_reason = null;
  cases.push({ name: "evidence terminal requires stop reason", envelope: evidenceTerminal, valid: false, expectedError: "evidence-only terminal requires stop_reason" });

  const revokedWithoutState = baseEnvelope();
  revokedWithoutState.stop_reason = "authority_revoked";
  revokedWithoutState.action_state_at_stop = {
    completed_actions: [],
    in_flight_actions: [],
    cancelled_before_start: [],
    external_authority_invalidated: false,
    local_edits: "none",
  };
  cases.push({ name: "authority revocation must invalidate authority", envelope: revokedWithoutState, valid: false, expectedError: "requires external_authority_invalidated true" });

  const blockedWithoutDetails = baseEnvelope();
  blockedWithoutDetails.verdict = "BLOCKED";
  blockedWithoutDetails.blocker = {};
  cases.push({ name: "blocker must be actionable", envelope: blockedWithoutDetails, valid: false, expectedError: "blocker.reason is required" });

  const blockedDimensionWithoutGap = baseEnvelope();
  blockedDimensionWithoutGap.acceptance_gate = passingGate("acceptance");
  blockedDimensionWithoutGap.acceptance_gate.status_by_dimension.tests = { status: "BLOCKED", evidence_refs: [] };
  cases.push({ name: "blocked dimension requires missing evidence", envelope: blockedDimensionWithoutGap, valid: false, expectedError: "missing_evidence is required for BLOCKED" });

  const repeatedReleaseAct = baseEnvelope();
  repeatedReleaseAct.intent = "release";
  repeatedReleaseAct.mode = "release";
  repeatedReleaseAct.phase = "DEPLOYED";
  repeatedReleaseAct.next_allowed_phase = "PRODUCTION_VERIFIED";
  repeatedReleaseAct.action_authority = "release";
  repeatedReleaseAct.release_intent = "act";
  repeatedReleaseAct.release_authorization = {
    authorized_this_turn: true,
    environment: "github.com/example/repo",
    operation: "publish release",
    targets: ["main"],
    expected_effects: ["remote repository changes"],
    principal_or_role: "repository owner",
    rollback: "revert commit",
    manual_checks: ["private repository confirmed"],
    expires_on: "target or turn change",
  };
  repeatedReleaseAct.side_effect_coverage = {
    command: "publish release",
    mode: "actual_action",
    paths: [
      {
        path: "remote push",
        effect: "repository mutation",
        expected_and_authorized: true,
        rollback_ref: "revert commit",
        evidence_ref: "source:remote-push",
      },
    ],
    all_paths_accounted_for: true,
    all_external_effects_short_circuited: false,
  };
  repeatedReleaseAct.acceptance_gate = passingGate("acceptance");
  repeatedReleaseAct.release_gate = passingGate("release");
  repeatedReleaseAct.acceptance_independence = {
    implementer_context_ref: "implementer-task",
    acceptor_context_ref: "acceptor-task",
    relation: "different_role",
    raw_evidence_before_implementer_narrative: true,
  };
  cases.push({ name: "release act starts only from release-ready", envelope: repeatedReleaseAct, valid: false, expectedError: "release_intent act requires phase exactly RELEASE_READY" });

  const incompleteResume = baseEnvelope();
  incompleteResume.intent = "resume";
  incompleteResume.reconstruction_status = "incomplete";
  cases.push({ name: "incomplete resume cannot execute", envelope: incompleteResume, valid: false, expectedError: "incomplete reconstruction cannot advance beyond EVIDENCED" });

  const evidenceWithWrite = baseEnvelope();
  evidenceWithWrite.intent = "diagnose";
  evidenceWithWrite.mode = "evidence";
  evidenceWithWrite.phase = "EVIDENCED";
  evidenceWithWrite.next_allowed_phase = null;
  evidenceWithWrite.stop_reason = "evidence_only_complete";
  evidenceWithWrite.executor_adapter = null;
  evidenceWithWrite.implementation_receipt = null;
  cases.push({ name: "evidence mode is read-only", envelope: evidenceWithWrite, valid: false, expectedError: "mode evidence requires action_authority read" });

  const acceptWithWrite = baseEnvelope();
  acceptWithWrite.intent = "accept";
  acceptWithWrite.mode = "accept";
  cases.push({ name: "accept mode is read-only", envelope: acceptWithWrite, valid: false, expectedError: "mode accept requires action_authority read" });

  const fullPreflight = baseEnvelope();
  fullPreflight.mode = "full";
  fullPreflight.release_intent = "preflight";
  cases.push({ name: "full cannot enter release preflight", envelope: fullPreflight, valid: false, expectedError: "release_intent requires intent release and mode release" });

  const resumedReleaseAct = JSON.parse(JSON.stringify(repeatedReleaseAct));
  resumedReleaseAct.intent = "resume";
  resumedReleaseAct.phase = "RELEASE_READY";
  resumedReleaseAct.next_allowed_phase = "DEPLOYED";
  cases.push({ name: "resume cannot consume release act", envelope: resumedReleaseAct, valid: false, expectedError: "release_intent requires intent release and mode release" });

  const deployedAfterAct = JSON.parse(JSON.stringify(repeatedReleaseAct));
  deployedAfterAct.release_intent = null;
  deployedAfterAct.action_authority = "read";
  deployedAfterAct.release_authorization = null;
  cases.push({ name: "deployed envelope clears active release authority", envelope: deployedAfterAct, valid: true });

  const deployedWithReusableAuthority = JSON.parse(JSON.stringify(deployedAfterAct));
  deployedWithReusableAuthority.action_authority = "release";
  deployedWithReusableAuthority.release_authorization = repeatedReleaseAct.release_authorization;
  cases.push({ name: "deployed envelope rejects reusable authority", envelope: deployedWithReusableAuthority, valid: false, expectedError: "must clear active authority to read" });

  const stoppedWithReleaseAuthority = baseEnvelope();
  stoppedWithReleaseAuthority.verdict = "PENDING";
  stoppedWithReleaseAuthority.stop_reason = "scope_changed";
  stoppedWithReleaseAuthority.action_authority = "release";
  stoppedWithReleaseAuthority.release_authorization = repeatedReleaseAct.release_authorization;
  stoppedWithReleaseAuthority.blocker = {
    reason: "scope changed",
    missing: "rebuilt aligned contract",
    owner: "requesting user",
    minimal_unlock: "confirm narrowed scope",
    side_effects_not_taken: ["no external action"],
  };
  stoppedWithReleaseAuthority.action_state_at_stop = {
    completed_actions: [],
    in_flight_actions: [],
    cancelled_before_start: ["release action"],
    external_authority_invalidated: true,
    local_edits: "kept",
  };
  cases.push({ name: "stop clears elevated authority", envelope: stoppedWithReleaseAuthority, valid: false, expectedError: "must clear elevated action authority" });

  let failed = false;
  for (const testCase of cases) {
    const errors = validateEnvelope(testCase.envelope);
    const passed = testCase.valid
      ? errors.length === 0
      : testCase.expectedError
        ? errors.some((error) => error.includes(testCase.expectedError))
        : errors.length > 0;
    console.log(`${passed ? "PASS" : "FAIL"} ${testCase.name}${errors.length ? `: ${errors.join("; ")}` : ""}`);
    failed ||= !passed;
  }

    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aql-envelope-refs-"));
  try {
    const existing = path.join(fixtureRoot, "present.txt");
    fs.writeFileSync(existing, "ok\n", "utf8");
    fs.writeFileSync(path.join(fixtureRoot, "README"), "# present\n", "utf8");
    fs.writeFileSync(path.join(fixtureRoot, "README.md"), "# present\n", "utf8");
    const goodEnvelope = baseEnvelope();
    goodEnvelope.artifact_refs = ["./present.txt@e49c81e2d2f84e259d40e2fb8192f3bcd198b355184845d76d8f58807d0d78ee"];
    goodEnvelope.evidence_refs = ["focused-test@result"];
    fs.writeFileSync(path.join(fixtureRoot, "good.json"), `${JSON.stringify(goodEnvelope, null, 2)}\n`, "utf8");
    const badEnvelope = baseEnvelope();
    badEnvelope.artifact_refs = ["./missing.txt"];
    badEnvelope.evidence_refs = ["file:./also-missing.txt"];
    fs.writeFileSync(path.join(fixtureRoot, "bad.json"), `${JSON.stringify(badEnvelope, null, 2)}\n`, "utf8");

    const goodErrors = validateRefPaths(goodEnvelope, fixtureRoot);
    const goodPassed = goodErrors.length === 0;
    console.log(`${goodPassed ? "PASS" : "FAIL"} check-refs accepts existing path refs${goodErrors.length ? `: ${goodErrors.join("; ")}` : ""}`);
    failed ||= !goodPassed;

    const badErrors = validateRefPaths(badEnvelope, fixtureRoot);
    const badPassed = badErrors.some((error) => error.includes("missing path refs"));
    console.log(`${badPassed ? "PASS" : "FAIL"} check-refs rejects missing path refs${badErrors.length ? `: ${badErrors.join("; ")}` : ""}`);
    failed ||= !badPassed;

    const bareMissingEnvelope = baseEnvelope();
    bareMissingEnvelope.artifact_refs = ["sub/missing.js@e49c81e2d2f84e259d40e2fb8192f3bcd198b355184845d76d8f58807d0d78ee"];
    const bareMissingErrors = validateRefPaths(bareMissingEnvelope, fixtureRoot);
    const bareMissingPassed = bareMissingErrors.some((error) => error.includes("sub/missing.js@"));
    console.log(`${bareMissingPassed ? "PASS" : "FAIL"} check-refs rejects missing bare relative digest path${bareMissingErrors.length ? `: ${bareMissingErrors.join("; ")}` : ""}`);
    failed ||= !bareMissingPassed;

    const barePresentEnvelope = baseEnvelope();
    barePresentEnvelope.artifact_refs = ["README.md"];
    const barePresentErrors = validateRefPaths(barePresentEnvelope, fixtureRoot);
    const barePresentPassed = barePresentErrors.length === 0;
    console.log(`${barePresentPassed ? "PASS" : "FAIL"} check-refs accepts present bare filename${barePresentErrors.length ? `: ${barePresentErrors.join("; ")}` : ""}`);
    failed ||= !barePresentPassed;

    const bareReadmeEnvelope = baseEnvelope();
    bareReadmeEnvelope.artifact_refs = ["README"];
    const bareReadmeErrors = validateRefPaths(bareReadmeEnvelope, fixtureRoot);
    const bareReadmePassed = bareReadmeErrors.length === 0;
    console.log(`${bareReadmePassed ? "PASS" : "FAIL"} check-refs accepts present bare README${bareReadmeErrors.length ? `: ${bareReadmeErrors.join("; ")}` : ""}`);
    failed ||= !bareReadmePassed;

    const missingBareReadmeEnvelope = baseEnvelope();
    missingBareReadmeEnvelope.artifact_refs = ["missing/README"];
    const missingBareReadmeErrors = validateRefPaths(missingBareReadmeEnvelope, fixtureRoot);
    const missingBareReadmePassed = missingBareReadmeErrors.some((error) => error.includes("missing/README"));
    console.log(`${missingBareReadmePassed ? "PASS" : "FAIL"} check-refs rejects missing bare README${missingBareReadmeErrors.length ? `: ${missingBareReadmeErrors.join("; ")}` : ""}`);
    failed ||= !missingBareReadmePassed;

    const missingLicenseEnvelope = baseEnvelope();
    missingLicenseEnvelope.artifact_refs = ["sub/LICENSE@e49c81e2d2f84e259d40e2fb8192f3bcd198b355184845d76d8f58807d0d78ee"];
    const missingLicenseErrors = validateRefPaths(missingLicenseEnvelope, fixtureRoot);
    const missingLicensePassed = missingLicenseErrors.some((error) => error.includes("sub/LICENSE@"));
    console.log(`${missingLicensePassed ? "PASS" : "FAIL"} check-refs rejects missing bare LICENSE digest path${missingLicenseErrors.length ? `: ${missingLicenseErrors.join("; ")}` : ""}`);
    failed ||= !missingLicensePassed;

    const fileUriEnvelope = baseEnvelope();
    fileUriEnvelope.artifact_refs = [`${pathToFileURL(existing).href}@e49c81e2d2f84e259d40e2fb8192f3bcd198b355184845d76d8f58807d0d78ee`];
    const fileUriErrors = validateRefPaths(fileUriEnvelope, fixtureRoot);
    const fileUriPassed = fileUriErrors.length === 0;
    console.log(`${fileUriPassed ? "PASS" : "FAIL"} check-refs accepts file URI with digest${fileUriErrors.length ? `: ${fileUriErrors.join("; ")}` : ""}`);
    failed ||= !fileUriPassed;

    const proseEnvelope = baseEnvelope();
    proseEnvelope.artifact_refs = ["focused test passed after careful review"];
    const proseErrors = validateRefPaths(proseEnvelope, fixtureRoot);
    const prosePassed = proseErrors.length === 0;
    console.log(`${prosePassed ? "PASS" : "FAIL"} check-refs ignores ordinary prose${proseErrors.length ? `: ${proseErrors.join("; ")}` : ""}`);
    failed ||= !prosePassed;

    const ordinaryWordEnvelope = baseEnvelope();
    ordinaryWordEnvelope.artifact_refs = ["evidence"];
    const ordinaryWordErrors = validateRefPaths(ordinaryWordEnvelope, fixtureRoot);
    const ordinaryWordPassed = ordinaryWordErrors.length === 0;
    console.log(`${ordinaryWordPassed ? "PASS" : "FAIL"} check-refs ignores ordinary words${ordinaryWordErrors.length ? `: ${ordinaryWordErrors.join("; ")}` : ""}`);
    failed ||= !ordinaryWordPassed;
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }

  return failed ? 1 : 0;
}

function parseCliArgs(argv) {
  const options = {
    selfTest: false,
    checkRefs: false,
    baseDir: process.cwd(),
    inputPath: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }
    if (arg === "--check-refs") {
      options.checkRefs = true;
      continue;
    }
    if (arg === "--base") {
      const value = argv[++index];
      if (!value) throw new Error("--base requires a directory");
      options.baseDir = path.resolve(value);
      continue;
    }
    if (arg.startsWith("--base=")) {
      options.baseDir = path.resolve(arg.slice("--base=".length));
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    if (options.inputPath) throw new Error("Only one envelope path is supported");
    options.inputPath = arg;
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(
      "Usage: node scripts/validate-envelope.js <envelope.json> | --self-test | --check-refs [--base <dir>] <envelope.json>",
    );
    return 2;
  }

  if (options.selfTest) return runSelfTest();
  if (!options.inputPath) {
    console.error(
      "Usage: node scripts/validate-envelope.js <envelope.json> | --self-test | --check-refs [--base <dir>] <envelope.json>",
    );
    return 2;
  }
  if (options.checkRefs) return runCheckRefs(options.inputPath, options.baseDir);

  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(options.inputPath, "utf8"));
  } catch (error) {
    console.error(`INVALID: cannot read JSON envelope: ${error.message}`);
    return 2;
  }
  const errors = validateEnvelope(envelope);
  if (errors.length > 0) {
    for (const error of errors) console.error(`INVALID: ${error}`);
    return 1;
  }
  console.log("VALID: structural envelope invariants passed; semantic evidence still requires review");
  return 0;
}

process.exitCode = main();
