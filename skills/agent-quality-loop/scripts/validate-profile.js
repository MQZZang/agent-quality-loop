#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const runtime = require("./profile-v2");

function profileRef(profile, entry) {
  return `profile:${profile.profile_id}#${entry.id}@${entry.revision}`;
}
function entryDigest(entry) { return runtime.sha256(runtime.canonical(entry)); }
function verifyProfileRefs(options = {}) {
  const refs = Array.isArray(options.refs) ? options.refs.filter((entry) => entry && entry.kind === "profile") : [];
  if (refs.length === 0) return { status: "PASS", errors: [], receipts: [] };
  const profilePath = options.profilePath || runtime.defaultProfilePath(options.environment);
  if (!fs.existsSync(profilePath)) return { status: "NOT_RUN", errors: [`profile carrier unavailable: ${profilePath}`], receipts: [] };
  let current;
  try { current = runtime.readProfile(profilePath); }
  catch (cause) { return { status: "FAIL", errors: [cause.message], receipts: [] }; }
  const errors = [];
  const receipts = [];
  if (!current.enabled || current.paused) errors.push("selected profile refs require an enabled, unpaused profile");
  for (const ref of refs) {
    const entry = current.entries.find((candidate) => profileRef(current, candidate) === ref.ref);
    if (!entry) { errors.push(`profile ref does not bind an entry in the opened v2 profile: ${ref.ref}`); continue; }
    if (entry.state !== "active") errors.push(`profile ref binds a non-active entry: ${ref.ref}`);
    const digest = entryDigest(entry);
    if (ref.content_sha256 !== digest) errors.push(`profile digest mismatch: ${ref.ref}`);
    receipts.push({ ref: ref.ref, content_sha256: digest, profile_revision: current.revision });
  }
  return { status: errors.length ? "FAIL" : "PASS", errors, receipts };
}

function parseArgs(argv) {
  const options = { profilePath: null, refsPath: null, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") { options.selfTest = true; continue; }
    if (arg === "--profile") { options.profilePath = argv[++index]; continue; }
    if (arg.startsWith("--profile=")) { options.profilePath = arg.slice(10); continue; }
    if (arg === "--refs") { options.refsPath = argv[++index]; continue; }
    if (arg.startsWith("--refs=")) { options.refsPath = arg.slice(7); continue; }
    if (!arg.startsWith("--") && !options.profilePath) { options.profilePath = arg; continue; }
    throw new Error(`unknown argument ${arg}`);
  }
  return options;
}
function selfTest() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aql-validate-profile-v2-"));
  try {
    const profilePath = path.join(temporary, "profile.json");
    runtime.createProfile(profilePath);
    runtime.remember(profilePath, { id: "tone", preference_key: "result.tone", kind: "communication", value: "concise", scope: { level: "global" }, applies_when: "presenting a routine result", suppress_when: null, review_after: null, valid_until: null, supersedes: null }, "task:tone", 0, false);
    runtime.setFlag(profilePath, "enabled", true, 1);
    const current = runtime.readProfile(profilePath);
    const entry = current.entries[0];
    const ref = { kind: "profile", class: "learned", ref: profileRef(current, entry), content_sha256: entryDigest(entry), reason: "Matched a global result-density preference and guided result expression." };
    const cases = [
      [runtime.validateProfile(current).length === 0, "Profile v2 schema validates"],
      [verifyProfileRefs({ refs: [ref], profilePath }).status === "PASS", "canonical JSON entry bytes bind a profile ref"],
      [verifyProfileRefs({ refs: [{ ...ref, content_sha256: "0".repeat(64) }], profilePath }).status === "FAIL", "forged entry digest is rejected"],
      [verifyProfileRefs({ refs: [{ ...ref, ref: `${ref.ref}-wrong` }], profilePath }).status === "FAIL", "wrong entry revision/ref is rejected"],
      [verifyProfileRefs({ refs: [ref], profilePath: path.join(temporary, "missing.json") }).status === "NOT_RUN", "missing profile carrier is NOT_RUN"],
      [!JSON.stringify(current).includes("last_fired") && !JSON.stringify(current).includes("repeated_choice"), "legacy observation fields are absent"],
    ];
    let failed = false;
    for (const [passed, name] of cases) { process.stdout.write(`${passed ? "PASS" : "FAIL"} ${name}\n`); failed ||= !passed; }
    return failed ? 1 : 0;
  } finally { fs.rmSync(temporary, { recursive: true, force: true }); }
}
function main(argv = process.argv.slice(2)) {
  let options;
  try { options = parseArgs(argv); } catch (cause) { process.stderr.write(`ERROR ${cause.message}\n`); return 2; }
  if (options.selfTest) return selfTest();
  if (!options.profilePath) { process.stderr.write("Usage: validate-profile.js <profile.json> | --profile <profile.json> [--refs refs.json] | --self-test\n"); return 2; }
  let current;
  try { current = runtime.readProfile(path.resolve(options.profilePath)); }
  catch (cause) { process.stderr.write(`INVALID ${cause.message}\n`); return 1; }
  if (options.refsPath) {
    const refs = JSON.parse(fs.readFileSync(options.refsPath, "utf8"));
    const result = verifyProfileRefs({ refs, profilePath: path.resolve(options.profilePath) });
    for (const item of result.errors) process.stderr.write(`${result.status} ${item}\n`);
    if (result.status !== "PASS") return 1;
  }
  process.stdout.write(`VALID ${current.schema} revision=${current.revision} entries=${current.entries.length}\n`);
  return 0;
}

if (require.main === module) process.exitCode = main();
module.exports = { profileRef, entryDigest, verifyProfileRefs, parseArgs, selfTest, main };
