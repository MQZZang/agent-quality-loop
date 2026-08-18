#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const runtime = require("./profile-v2");

const RECEIPT_SCHEMA = "aql.profile-projection-receipt/v2";
const FORBIDDEN_FIELDS = new Set(["action_authority", "assurance", "contract", "lifecycle", "phase", "release_authorization", "task_contract", "user_lens"]);
const CONTEXT_FIELDS = new Set(["as_of", "scopes", "semantic", "fresh_mode", "current_turn_overrides", "policy_conflicts", "deviations"]);
const RECEIPT_FIELDS = new Set(["schema", "profile_id", "profile_revision", "selected", "suppressed", "conflicts", "deviations"]);
const SELECTED_FIELDS = new Set(["id", "entry_revision", "entry_sha256", "target", "reason", "effect"]);
const SUPPRESSED_FIELDS = new Set(["id", "reason"]);
const CONFLICT_FIELDS = new Set(["preference_key"]);

function isObject(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function hasExactFields(value, allowed, required, label, errors) {
  if (!isObject(value)) { errors.push(`${label} must be an object`); return false; }
  for (const field of Object.keys(value)) if (!allowed.has(field)) errors.push(`${label} has unknown field ${field}`);
  for (const field of required) if (!Object.prototype.hasOwnProperty.call(value, field)) errors.push(`${label}.${field} is required`);
  return true;
}
function isCalendarDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}
function validateProjectionContext(context) {
  const errors = [];
  if (!hasExactFields(context, CONTEXT_FIELDS, ["as_of", "scopes", "semantic"], "projection context", errors)) return errors;
  if (!isCalendarDate(context.as_of)) errors.push("projection context.as_of must be a real calendar date");
  if (!Array.isArray(context.scopes)) errors.push("projection context.scopes must be an array");
  else for (const [index, scope] of context.scopes.entries()) {
    if (!hasExactFields(scope, new Set(["level", "id"]), ["level"], `projection context.scopes[${index}]`, errors)) continue;
    if (!["global", "domain", "task_class", "project"].includes(scope.level)) errors.push(`projection context.scopes[${index}].level is invalid`);
    if (scope.level === "global" && Object.prototype.hasOwnProperty.call(scope, "id")) errors.push(`projection context.scopes[${index}].id is forbidden for global scope`);
    if (scope.level !== "global" && (typeof scope.id !== "string" || !scope.id.trim())) errors.push(`projection context.scopes[${index}].id is required for non-global scope`);
  }
  if (!isObject(context.semantic)) errors.push("projection context.semantic must be an object");
  else for (const [id, match] of Object.entries(context.semantic)) {
    if (!id) { errors.push("projection context.semantic has an empty entry id"); continue; }
    if (!hasExactFields(match, new Set(["applies_when_matches", "suppress_when_matches", "material_effect", "reason", "effect"]), [], `projection context.semantic.${id}`, errors)) continue;
    for (const field of ["applies_when_matches", "suppress_when_matches", "material_effect"]) {
      if (Object.prototype.hasOwnProperty.call(match, field) && typeof match[field] !== "boolean") errors.push(`projection context.semantic.${id}.${field} must be boolean`);
    }
    for (const field of ["reason", "effect"]) {
      if (Object.prototype.hasOwnProperty.call(match, field) && typeof match[field] !== "string") errors.push(`projection context.semantic.${id}.${field} must be a string`);
    }
  }
  if (Object.prototype.hasOwnProperty.call(context, "fresh_mode") && typeof context.fresh_mode !== "boolean") errors.push("projection context.fresh_mode must be boolean");
  for (const field of ["current_turn_overrides", "policy_conflicts"]) {
    if (Object.prototype.hasOwnProperty.call(context, field) && (!Array.isArray(context[field]) || context[field].some((item) => typeof item !== "string" || !item.trim()))) errors.push(`projection context.${field} must be an array of non-empty strings`);
  }
  if (Object.prototype.hasOwnProperty.call(context, "deviations") && !Array.isArray(context.deviations)) errors.push("projection context.deviations must be an array");
  return errors;
}

function validateProjectionReceipt(receipt, profile, context) {
  const errors = [];
  if (!hasExactFields(receipt, RECEIPT_FIELDS, RECEIPT_FIELDS, "projection receipt", errors)) return errors;
  for (const field of FORBIDDEN_FIELDS) if (Object.prototype.hasOwnProperty.call(receipt, field)) errors.push(`${field} is forbidden; projection is not a contract or authority source`);
  if (receipt.schema !== RECEIPT_SCHEMA) errors.push(`schema must equal ${RECEIPT_SCHEMA}`);
  const profileErrors = runtime.validateProfile(profile);
  errors.push(...profileErrors.map((item) => `bound profile: ${item}`));
  if (profileErrors.length === 0 && (receipt.profile_id !== profile.profile_id || receipt.profile_revision !== profile.revision)) errors.push("projection receipt must bind the exact profile id and revision");
  for (const field of ["selected", "suppressed", "conflicts", "deviations"]) if (!Array.isArray(receipt[field])) errors.push(`${field} must be an array`);
  if (Array.isArray(receipt.selected) && receipt.selected.length > 2) errors.push("selected entry budget exceeds two");
  const ids = new Set();
  for (const selected of receipt.selected || []) {
    if (!hasExactFields(selected, SELECTED_FIELDS, SELECTED_FIELDS, "selected entry", errors)) continue;
    if (ids.has(selected.id)) errors.push(`duplicate selected entry ${selected.id}`);
    ids.add(selected.id);
    const entry = profileErrors.length === 0 ? profile.entries.find((candidate) => candidate.id === selected.id) : null;
    if (!entry || entry.state !== "active") { errors.push(`selected entry ${selected.id} is not active in the bound profile`); continue; }
    if (selected.entry_revision !== entry.revision) errors.push(`selected entry ${selected.id} revision mismatch`);
    if (selected.entry_sha256 !== `sha256:${runtime.sha256(runtime.canonical(entry))}`) errors.push(`selected entry ${selected.id} digest mismatch`);
    if (selected.target !== "guided") errors.push(`selected entry ${selected.id} may target Guided only`);
    if (typeof selected.reason !== "string" || selected.reason.trim().length < 12) errors.push(`selected entry ${selected.id} needs a concrete reason`);
    if (typeof selected.effect !== "string" || !selected.effect.trim()) errors.push(`selected entry ${selected.id} needs a Guided effect`);
  }
  for (const suppressed of receipt.suppressed || []) {
    if (!hasExactFields(suppressed, SUPPRESSED_FIELDS, SUPPRESSED_FIELDS, "suppressed entry", errors)) continue;
    if (!suppressed || typeof suppressed.id !== "string" || typeof suppressed.reason !== "string" || !suppressed.reason) errors.push("suppressed entry needs id and reason");
  }
  for (const conflict of receipt.conflicts || []) {
    if (!hasExactFields(conflict, CONFLICT_FIELDS, CONFLICT_FIELDS, "conflict entry", errors)) continue;
    if (typeof conflict.preference_key !== "string" || !conflict.preference_key) errors.push("conflict entry needs preference_key");
  }
  const contextErrors = validateProjectionContext(context);
  errors.push(...contextErrors);
  if (profileErrors.length === 0 && contextErrors.length === 0) {
    const expected = runtime.projectProfile(profile, context);
    if (runtime.canonical(expected) !== runtime.canonical(receipt)) errors.push("projection receipt does not match deterministic filtering of declared semantic inputs");
  }
  return errors;
}

function input(id, overrides = {}) {
  return {
    id,
    preference_key: `preference.${id}`,
    kind: "communication",
    value: id,
    scope: { level: "global" },
    applies_when: `the task needs ${id}`,
    suppress_when: null,
    review_after: null,
    valid_until: null,
    supersedes: null,
    ...overrides,
  };
}
function semantic(ids) {
  return Object.fromEntries(ids.map((id) => [id, { applies_when_matches: true, suppress_when_matches: false, material_effect: true, reason: `Explicit semantic match for ${id}`, effect: `Guide ${id}` }]));
}
function selfTest() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aql-projection-v2-"));
  try {
    const profilePath = path.join(temporary, "profile.json");
    runtime.createProfile(profilePath);
    let revision = 0;
    for (const item of [
      input("first"), input("second"), input("third"),
      input("conflict-a", { preference_key: "tone", value: "a" }),
      input("conflict-b", { preference_key: "tone", value: "b" }),
      input("review", { review_after: "2026-08-18" }),
      input("conditional", { suppress_when: "the current request asks for the opposite" }),
    ]) { runtime.remember(profilePath, item, `task:${item.id}`, revision, false); revision += 1; }
    runtime.setFlag(profilePath, "enabled", true, revision); revision += 1;
    const current = runtime.readProfile(profilePath);
    const allIds = current.entries.map((entry) => entry.id);
    const base = { as_of: "2026-08-18", scopes: [], semantic: semantic(allIds) };
    const before = fs.readFileSync(profilePath, "utf8");
    const normal = runtime.projectProfile(current, base);
    const fresh = runtime.projectProfile(current, { ...base, fresh_mode: true });
    const overridden = runtime.projectProfile(current, { ...base, current_turn_overrides: ["preference.first"] });
    const unknown = runtime.projectProfile(current, { as_of: "2026-08-18", scopes: [], semantic: {} });
    const policy = runtime.projectProfile(current, { ...base, policy_conflicts: ["preference.first"] });
    const suppressSemantic = semantic(allIds);
    suppressSemantic.conditional.suppress_when_matches = true;
    const suppressed = runtime.projectProfile(current, { ...base, semantic: suppressSemantic });
    const cases = [
      [validateProjectionReceipt(normal, current, base).length === 0, "normal receipt matches the bound profile and inputs"],
      [normal.selected.length <= 2, "at most two entries are selected"],
      [normal.conflicts.some((item) => item.preference_key === "tone") && normal.suppressed.filter((item) => item.reason === "peer_conflict").length === 2, "same-key different values suppress every peer"],
      [normal.suppressed.some((item) => item.id === "review" && item.reason === "review_due"), "review-due entry is suppressed"],
      [normal.suppressed.some((item) => item.reason === "two_entry_budget"), "eligible overflow is explicitly suppressed"],
      [fresh.selected.length === 0 && fresh.suppressed.every((item) => item.reason === "fresh_mode"), "Fresh Mode applies no stored preference"],
      [overridden.suppressed.some((item) => item.id === "first" && item.reason === "current_turn_override"), "current-turn override removes the matching preference before selection"],
      [unknown.selected.length === 0 && unknown.suppressed.some((item) => item.reason === "applicability_unknown_or_false"), "unknown semantic applicability fails closed"],
      [policy.suppressed.some((item) => item.id === "first" && item.reason === "project_policy_conflict"), "project policy outranks a personal preference"],
      [suppressed.suppressed.some((item) => item.id === "conditional" && item.reason === "suppression_unknown_or_true"), "matching suppress_when prevents application"],
      [fs.readFileSync(profilePath, "utf8") === before, "projection is ephemeral and does not write the profile"],
      [validateProjectionReceipt({ ...normal, phase: "ACCEPTED" }, current, base).some((item) => item.includes("forbidden")), "projection cannot carry lifecycle or acceptance state"],
      [validateProjectionReceipt({ ...normal, selected: [...normal.selected, ...normal.selected.slice(0, 1)] }, current).some((item) => item.includes("budget") || item.includes("duplicate")), "oversized or duplicate selection is rejected"],
      [validateProjectionReceipt(normal, current).some((item) => item.includes("projection context must be an object")), "missing projection context fails closed"],
      [validateProjectionReceipt({ ...normal, selected: [] }, current, base).some((item) => item.includes("deterministic filtering")), "fabricated selection fails deterministic recomputation"],
      [validateProjectionReceipt({ ...normal, suppressed: [{ id: "first", reason: "fabricated" }] }, current, base).some((item) => item.includes("deterministic filtering")), "fabricated suppression fails deterministic recomputation"],
      [validateProjectionReceipt({ ...normal, conflicts: [{ preference_key: "fabricated" }] }, current, base).some((item) => item.includes("deterministic filtering")), "fabricated conflict fails deterministic recomputation"],
      [validateProjectionReceipt({ ...normal, deviations: [{ reason: "fabricated" }] }, current, base).some((item) => item.includes("deterministic filtering")), "fabricated deviation fails deterministic recomputation"],
      [validateProjectionReceipt({ ...normal, receipt_note: "extra" }, current, base).some((item) => item.includes("unknown field")), "unknown projection receipt root field is rejected"],
      [validateProjectionReceipt(normal, current, { ...base, undeclared_input: true }).some((item) => item.includes("projection context has unknown field")), "unknown projection context root field is rejected"],
    ];
    let failed = false;
    for (const [passed, name] of cases) { process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`); failed ||= !passed; }
    return failed ? 1 : 0;
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === "--self-test") return selfTest();
  if (argv.length !== 1) { process.stderr.write("Usage: validate-profile-projection.js <bundle.json> | --self-test\n"); return 2; }
  let bundle;
  try { bundle = JSON.parse(fs.readFileSync(argv[0], "utf8")); } catch (cause) { process.stderr.write(`INVALID ${cause.message}\n`); return 2; }
  const errors = validateProjectionReceipt(bundle.receipt, bundle.profile, bundle.context);
  if (errors.length) { errors.forEach((item) => process.stderr.write(`INVALID ${item}\n`)); return 1; }
  process.stdout.write("VALID Profile Projection v2 structural and declared-input invariants\n");
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { RECEIPT_SCHEMA, validateProjectionReceipt, selfTest, main };
