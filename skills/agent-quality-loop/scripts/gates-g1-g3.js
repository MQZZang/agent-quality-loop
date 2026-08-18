#!/usr/bin/env node
"use strict";

// Mechanical gates G1/G2/G3 (AQL 3.1 Scheme A).
// Checks fields, timing, paths, and state invariants only — never semantics.
//
// routine: prose-constrained (this script is a no-op unless formal/envelope).
// formal:  mechanically enforced when a frozen envelope is supplied.
//
// Shell-indirect writes are not covered. Do not parse argv into pretend paths.

const fs = require("fs");
const path = require("path");

const FORMAL_ASSURANCES = new Set(["formal"]);
const OBSERVER_PASS = new Set(["mechanical_runtime", "human"]);
const NATIVE_EVIDENCE = new Set(["local runtime", "native/device/real environment", "runtime_native", "native_medium"]);
const HIGH_RISK = new Set(["data", "capability", "algorithm", "rollout", "release", "mixed"]);
const BANNED_UOR_WORDS = [
  /ready for users/i,
  /production verified/i,
  /player verified/i,
  /customer verified/i,
  /用户已验证/,
  /已上线/,
];

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normPath(value) {
  return String(value || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .toLowerCase();
}

function pathAllowed(target, allowlist, derived) {
  const t = normPath(target);
  if (!t) return false;
  const surfaces = [...(allowlist || []), ...(derived || [])].map(normPath).filter(Boolean);
  return surfaces.some((surface) => {
    if (surface.endsWith("/**")) {
      const prefix = surface.slice(0, -3);
      return t === prefix.replace(/\/$/, "") || t.startsWith(prefix);
    }
    if (surface.endsWith("/*")) {
      const prefix = surface.slice(0, -1);
      return t.startsWith(prefix) && !t.slice(prefix.length).includes("/");
    }
    return t === surface || t.startsWith(`${surface}/`);
  });
}

function formalEnvelope(envelope) {
  return isObject(envelope) && FORMAL_ASSURANCES.has(envelope.assurance);
}

function g1Scope(input) {
  const envelope = input.envelope;
  if (!formalEnvelope(envelope)) {
    return { gate: "G1", status: "NOT_APPLICABLE", reason: "routine prose-constrained; no mechanical scope gate" };
  }
  const allowlist = Array.isArray(envelope.scope_allowlist) ? envelope.scope_allowlist : [];
  const derived = Array.isArray(envelope.derived_surfaces) ? envelope.derived_surfaces : [];
  const writes = [...(input.write_paths || []), ...(input.changed_paths || [])];
  const denied = writes.filter((item) => !pathAllowed(item, allowlist, derived));
  if (denied.length > 0) {
    return { gate: "G1", status: "DENY", reason: "write path outside frozen allowlist", denied };
  }
  return { gate: "G1", status: "ALLOW", reason: "all write paths inside allowlist or derived surfaces", checked: writes };
}

function g2Observer(input) {
  const envelope = input.envelope;
  const dim =
    envelope &&
    envelope.acceptance_gate &&
    envelope.acceptance_gate.status_by_dimension &&
    envelope.acceptance_gate.status_by_dimension.user_observable_result;
  if (!dim) {
    return { gate: "G2", status: "NOT_APPLICABLE", reason: "no user_observable_result dimension" };
  }
  const lintHits = [];
  const haystack = JSON.stringify(dim);
  for (const re of BANNED_UOR_WORDS) {
    if (re.test(haystack)) lintHits.push(String(re));
  }
  if (dim.status !== "PASS") {
    return { gate: "G2", status: "ALLOW", reason: "non-PASS needs no observer upgrade", lintHits };
  }
  const observer = dim.observer_class || dim.observation_source;
  const evidenceKind = dim.evidence_kind;
  if (observer === "agent_review") {
    return { gate: "G2", status: "DENY", reason: "agent_review cannot PASS user_observable_result", lintHits };
  }
  if (!OBSERVER_PASS.has(observer)) {
    return { gate: "G2", status: "DENY", reason: "PASS requires mechanical_runtime or human observation_source", lintHits };
  }
  if (observer === "human" && !dim.human_role) {
    return { gate: "G2", status: "DENY", reason: "human observer_class requires human_role", lintHits };
  }
  if (!NATIVE_EVIDENCE.has(evidenceKind)) {
    return { gate: "G2", status: "DENY", reason: "PASS requires native-medium / runtime evidence_kind", lintHits };
  }
  return { gate: "G2", status: "ALLOW", reason: "dual condition held", lintHits };
}

function g3Decision(input) {
  const envelope = input.envelope;
  if (!formalEnvelope(envelope)) {
    return { gate: "G3", status: "NOT_APPLICABLE", reason: "routine prose-constrained; no mechanical decision gate" };
  }
  if (!HIGH_RISK.has(envelope.change_class)) {
    return { gate: "G3", status: "NOT_APPLICABLE", reason: "change_class is not high-risk" };
  }
  if (input.first_implementing_write !== true) {
    return { gate: "G3", status: "NOT_APPLICABLE", reason: "not the first implementing write" };
  }
  const rec = envelope.material_decision;
  if (!isObject(rec)) {
    return { gate: "G3", status: "DENY", reason: "high-risk first write requires material_decision" };
  }
  const chosen = String(rec.chosen || "").trim();
  const alt = String(rec.strongest_alternative || "").trim();
  const overturn = String(rec.overturning_observation || "").trim();
  if (!chosen || !alt || !overturn) {
    return { gate: "G3", status: "DENY", reason: "material_decision fields must be non-empty" };
  }
  if (chosen === alt) {
    return { gate: "G3", status: "DENY", reason: "chosen must not equal strongest_alternative" };
  }
  if (rec.recorded_before_first_implementing_write !== true) {
    return { gate: "G3", status: "DENY", reason: "record appearing after first write is post-hoc" };
  }
  return { gate: "G3", status: "ALLOW", reason: "structure and timing held" };
}

function evaluate(input) {
  return { G1: g1Scope(input), G2: g2Observer(input), G3: g3Decision(input) };
}

function loadJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function runFixtureDir(dir) {
  const input = loadJson(path.join(dir, "input.json"));
  const expected = loadJson(path.join(dir, "expected.json"));
  const actual = evaluate(input);
  const failures = [];
  for (const gate of ["G1", "G2", "G3"]) {
    if (!expected[gate]) continue;
    if (actual[gate].status !== expected[gate].status) {
      failures.push(`${path.basename(dir)} ${gate}: expected ${expected[gate].status} got ${actual[gate].status}`);
    }
  }
  return { id: path.basename(dir), ok: failures.length === 0, failures, actual };
}

function runSelfTest() {
  const root = path.join(__dirname, "..", "fixtures", "gates-g1-g3");
  if (!fs.existsSync(root)) {
    console.error("FAIL missing fixtures/gates-g1-g3");
    return 1;
  }
  const dirs = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(root, entry.name))
    .sort();
  let failed = 0;
  let falseBlock = 0;
  let missBlock = 0;
  const falseBlockDenom = [];
  const missBlockDenom = [];
  for (const dir of dirs) {
    const result = runFixtureDir(dir);
    const meta = loadJson(path.join(dir, "expected.json"));
    if (meta.class === "false_block") {
      falseBlockDenom.push(result.id);
      if (!result.ok) falseBlock += 1;
    }
    if (meta.class === "missed_block") {
      missBlockDenom.push(result.id);
      if (!result.ok) missBlock += 1;
    }
    if (result.ok) console.log(`PASS ${result.id}`);
    else {
      failed += 1;
      console.log(`FAIL ${result.id}`);
      for (const item of result.failures) console.log(`  ${item}`);
    }
  }
  console.log(
    `false_block_rate ${falseBlock}/${falseBlockDenom.length} missed_block_rate ${missBlock}/${missBlockDenom.length}`,
  );
  return failed === 0 ? 0 : 1;
}

function main(argv = process.argv.slice(2)) {
  if (argv[0] === "--self-test") return runSelfTest();
  if (argv.length === 0 || argv[0] === "-h" || argv[0] === "--help") {
    console.log("Usage: node gates-g1-g3.js --self-test | <input.json>");
    return 2;
  }
  const input = loadJson(argv[0]);
  const result = evaluate(input);
  console.log(JSON.stringify(result, null, 2));
  const deny = Object.values(result).some((item) => item.status === "DENY");
  return deny ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { evaluate, g1Scope, g2Observer, g3Decision, pathAllowed, main };
