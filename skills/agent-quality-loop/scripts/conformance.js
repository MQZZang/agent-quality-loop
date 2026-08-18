#!/usr/bin/env node
"use strict";

// Offline, read-only structural conformance. This runner never claims that a
// natural-language preference matched correctly or that a product outcome was
// achieved; those remain behavioral and user-outcome evidence.

const fs = require("fs");
const os = require("os");
const path = require("path");
const profileRuntime = require("./profile-v2");
const projectionValidator = require("./validate-profile-projection");
const envelopeValidator = require("./validate-envelope");

const BUNDLE_SCHEMA = "aql.conformance-bundle/v1";
const BUNDLE_FIELDS = new Set(["schema", "profile", "projection_context", "projection_receipt", "capability_receipt", "task_contract"]);

function result(source, kind, errors, checks = []) {
  return { source, valid: errors.length === 0, kind, structural_only: true, errors, checks };
}
function inspectBundle(value, source = "memory") {
  const errors = [];
  const checks = [];
  if (!value || typeof value !== "object" || Array.isArray(value)) return result(source, "conformance_bundle", ["bundle root must be an object"]);
  for (const field of Object.keys(value)) if (!BUNDLE_FIELDS.has(field)) errors.push(`bundle root has unknown field ${field}`);
  for (const field of BUNDLE_FIELDS) if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push(`bundle root.${field} is required`);
  if (value.schema !== BUNDLE_SCHEMA) errors.push(`schema must equal ${BUNDLE_SCHEMA}`);
  const profileErrors = profileRuntime.validateProfile(value.profile);
  errors.push(...profileErrors.map((item) => `profile: ${item}`));
  checks.push("profile_v2_schema");
  const receiptErrors = profileRuntime.validateReceipt(value.capability_receipt);
  errors.push(...receiptErrors.map((item) => `capability_receipt: ${item}`));
  checks.push("capability_sources_mechanical_or_not_run");
  if (profileErrors.length === 0) {
    const projectionErrors = projectionValidator.validateProjectionReceipt(value.projection_receipt, value.profile, value.projection_context);
    errors.push(...projectionErrors.map((item) => `projection: ${item}`));
  }
  checks.push("projection_current_override_fresh_mode_suppression_budget_guided_only");
  const envelopeErrors = envelopeValidator.validateEnvelope(value.task_contract);
  errors.push(...envelopeErrors.map((item) => `task_contract: ${item}`));
  checks.push("single_task_contract_authority_acceptance_release_boundaries");
  if (profileErrors.length === 0 && Array.isArray(value.projection_receipt && value.projection_receipt.selected)) {
    const selectedIds = new Set(value.projection_receipt.selected.map((entry) => entry.id));
    const injected = Array.isArray(value.task_contract && value.task_contract.injected_refs)
      ? value.task_contract.injected_refs.filter((entry) => entry && entry.kind === "profile")
      : [];
    for (const selected of value.projection_receipt.selected) {
      const entry = value.profile.entries.find((candidate) => candidate.id === selected.id);
      const expectedRef = entry ? `profile:${value.profile.profile_id}#${entry.id}@${entry.revision}` : null;
      const expectedDigest = entry ? profileRuntime.sha256(profileRuntime.canonical(entry)) : null;
      if (!injected.some((ref) => ref.ref === expectedRef && ref.content_sha256 === expectedDigest)) errors.push(`selected profile entry ${selected.id} is not bound into the sole Task Contract injected_refs`);
    }
    for (const ref of injected) {
      const match = /^profile:[^#]+#([^@]+)@\d+$/.exec(ref.ref || "");
      if (!match || !selectedIds.has(match[1])) errors.push(`Task Contract profile ref is not selected by this projection: ${ref.ref}`);
    }
  }
  return result(source, "conformance_bundle", errors, checks);
}
function inspectValue(value, source = "memory") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return result(source, "unknown", ["JSON root must be an object"]);
  if (value.schema === BUNDLE_SCHEMA) return inspectBundle(value, source);
  if (value.schema === profileRuntime.PROFILE_SCHEMA) return result(source, "profile_v2", profileRuntime.validateProfile(value), ["profile_v2_schema"]);
  if (value.schema === profileRuntime.RECEIPT_SCHEMA) return result(source, "capability_receipt", profileRuntime.validateReceipt(value), ["capability_sources_mechanical_or_not_run"]);
  if (value.schema_version === envelopeValidator.SCHEMA_VERSION) return result(source, "task_contract", envelopeValidator.validateEnvelope(value), ["single_task_contract_authority_acceptance_release_boundaries"]);
  return result(source, "unknown", ["unrecognized schema"]);
}
function inspectFile(filePath) {
  const absolute = path.resolve(filePath);
  try { return inspectValue(JSON.parse(fs.readFileSync(absolute, "utf8")), absolute); }
  catch (cause) { return result(absolute, "unknown", [`cannot parse JSON: ${cause.message}`]); }
}
function inspectProfileFile(filePath) {
  const inspected = inspectFile(filePath);
  if (inspected.kind !== "profile_v2") { inspected.valid = false; inspected.errors.push("expected Profile v2"); }
  return inspected;
}
function inspectReceiptFile(filePath) {
  const inspected = inspectFile(filePath);
  if (inspected.kind !== "capability_receipt") { inspected.valid = false; inspected.errors.push("expected Capability Receipt"); }
  return inspected;
}
function fixtureEntry() {
  const timestamp = "2026-08-18T00:00:00.000Z";
  return {
    id: "tone", revision: 1, preference_key: "result.tone", kind: "communication", value: "concise",
    scope: { level: "global" }, applies_when: "presenting a routine result", suppress_when: null,
    provenance: { type: "explicit_memory_command", refs: ["task:remember-tone"] }, state: "active",
    valid_from: "2026-08-18", review_after: null, valid_until: null, supersedes: null,
    created_at: timestamp, updated_at: timestamp,
  };
}
function qualifiedIndependence() {
  return { implementer_context_ref: "implementer-context", acceptor_context_ref: "acceptor-context", relation: "fresh_context", separation_evidence_ref: "fresh-session-measurement", raw_evidence_before_implementer_narrative: true };
}
function selfTest() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aql-conformance-v3-"));
  try {
    const profile = JSON.parse(fs.readFileSync(path.resolve(__dirname, "..", "fixtures", "profile-v2-empty.json"), "utf8"));
    profile.enabled = true;
    profile.revision = 1;
    profile.entries.push(fixtureEntry());
    const context = { as_of: "2026-08-18", scopes: [], semantic: { tone: { applies_when_matches: true, suppress_when_matches: false, material_effect: true, reason: "Global result preference matches this routine result", effect: "Guide result density only" } } };
    const projection = profileRuntime.projectProfile(profile, context);
    const contract = envelopeValidator.baseEnvelope();
    contract.executor_adapter = "code-execution";
    contract.implementation_receipt.adapter = "code-execution";
    contract.injected_refs = [{ kind: "profile", class: "learned", ref: `profile:${profile.profile_id}#tone@1`, content_sha256: profileRuntime.sha256(profileRuntime.canonical(profile.entries[0])), reason: "Matched the global result-density preference and guided result expression." }];
    const bundle = { schema: BUNDLE_SCHEMA, profile, projection_context: context, projection_receipt: projection, capability_receipt: profileRuntime.createCapabilityReceipt({ profilePath: path.join(temporary, "missing.json") }), task_contract: contract };
    const valid = inspectBundle(bundle);

    const sameContext = envelopeValidator.baseEnvelope();
    Object.assign(sameContext, { mode: "full", assurance: "formal", phase: "ACCEPTED", next_allowed_phase: null, acceptance_gate: envelopeValidator.passingGate("acceptance"), acceptance_independence: { ...qualifiedIndependence(), relation: "same_context" } });
    const accepted = envelopeValidator.baseEnvelope();
    Object.assign(accepted, { mode: "full", assurance: "formal", phase: "ACCEPTED", next_allowed_phase: null, acceptance_gate: envelopeValidator.passingGate("acceptance"), acceptance_independence: qualifiedIndependence() });
    const freshProjection = profileRuntime.projectProfile(profile, { ...context, fresh_mode: true });
    const overrideProjection = profileRuntime.projectProfile(profile, { ...context, current_turn_overrides: ["result.tone"] });
    const unknownProjection = profileRuntime.projectProfile(profile, { as_of: "2026-08-18", scopes: [], semantic: {} });
    const modelReceipt = JSON.parse(JSON.stringify(bundle.capability_receipt));
    modelReceipt.capabilities.fresh_context.source.kind = "model_self_report";
    const duplicateContract = { ...contract, profile_projection: projection };
    const missingContext = { ...bundle };
    delete missingContext.projection_context;
    const fabricatedProjection = { ...bundle, projection_receipt: { ...projection, selected: [] } };
    const extraBundleField = { ...bundle, unexpected: true };
    const cases = [
      [valid.valid, `complete offline bundle passes: ${valid.errors.join("; ")}`],
      [freshProjection.selected.length === 0, "Fresh Mode suppresses all stored preferences"],
      [overrideProjection.selected.length === 0 && overrideProjection.suppressed[0].reason === "current_turn_override", "current-turn instruction overrides profile"],
      [unknownProjection.selected.length === 0, "unknown applicability is suppressed"],
      [projection.selected.every((entry) => entry.target === "guided") && projection.selected.length <= 2, "profile affects Guided only and selects at most two"],
      [envelopeValidator.validateEnvelope(duplicateContract).some((item) => item.includes("forbidden")), "a second projection contract/state is rejected"],
      [envelopeValidator.validateEnvelope(sameContext).some((item) => item.includes("fresh-context") || item.includes("independ")), "same-context review cannot grant ACCEPTED"],
      [envelopeValidator.validateEnvelope(accepted).length === 0 && accepted.phase === "ACCEPTED" && accepted.release_intent === null, "ACCEPTED remains a terminal quality state and does not become release"],
      [profileRuntime.validateReceipt(modelReceipt).some((item) => item.includes("model self-report")), "Capability Receipt rejects model self-report"],
      [!inspectBundle(missingContext).valid && inspectBundle(missingContext).errors.some((item) => item.includes("projection_context is required")), "bundle requires declared projection context"],
      [!inspectBundle(fabricatedProjection).valid && inspectBundle(fabricatedProjection).errors.some((item) => item.includes("deterministic filtering")), "bundle rejects fabricated projection receipt"],
      [!inspectBundle(extraBundleField).valid && inspectBundle(extraBundleField).errors.some((item) => item.includes("unknown field")), "bundle root is closed to extra fields"],
    ];
    let failed = false;
    for (const [passed, name] of cases) { process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`); failed ||= !passed; }
    if (!failed) process.stdout.write(`PASS conformance is offline, read-only, structural only (${cases.length} invariant groups)\n`);
    return failed ? 1 : 0;
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}

if (require.main === module) {
  if (process.argv[2] === "--self-test") process.exitCode = selfTest();
  else if (process.argv[2]) {
    const inspected = inspectFile(process.argv[2]);
    process.stdout.write(`${JSON.stringify(inspected, null, 2)}\n`);
    process.exitCode = inspected.valid ? 0 : 1;
  } else {
    process.stderr.write("Usage: node scripts/conformance.js <profile|receipt|task-contract|bundle.json> | --self-test\n");
    process.exitCode = 2;
  }
}

module.exports = { BUNDLE_SCHEMA, inspectBundle, inspectValue, inspectFile, inspectProfileFile, inspectReceiptFile, selfTest };
