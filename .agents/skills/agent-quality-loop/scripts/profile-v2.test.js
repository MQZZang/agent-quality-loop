#!/usr/bin/env node
"use strict";

const assert = require("assert");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const runtime = require("./profile-v2");
const conformance = require("./conformance");
const aql = require("./aql");

function expectThrow(operation, code) {
  try { operation(); } catch (cause) { if (!code || cause.code === code) return cause; throw cause; }
  throw new Error("expected operation to throw");
}
function captureStdout(operation) {
  let output = "";
  const original = process.stdout.write;
  process.stdout.write = (chunk) => { output += chunk; return true; };
  try { operation(); } finally { process.stdout.write = original; }
  return output;
}
function entry(id, overrides = {}) {
  return {
    id,
    preference_key: `result.${id}`,
    kind: "communication",
    value: `value-${id}`,
    scope: { level: "global" },
    applies_when: `the task needs ${id}`,
    suppress_when: null,
    review_after: null,
    valid_until: null,
    supersedes: null,
    ...overrides,
  };
}
function contextFor(ids, overrides = {}) {
  return {
    as_of: "2026-08-18",
    scopes: [],
    semantic: Object.fromEntries(ids.map((id) => [id, { applies_when_matches: true, suppress_when_matches: false, material_effect: true, effect: `guided-${id}` }])),
    ...overrides,
  };
}
function child(script, args) {
  return new Promise((resolve) => {
    const childProcess = spawn(process.execPath, ["-e", script, ...args], { stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    childProcess.stdout.on("data", (chunk) => { stdout += chunk; });
    childProcess.stderr.on("data", (chunk) => { stderr += chunk; });
    childProcess.on("close", (code) => resolve({ code, stdout, stderr }));
  });
}
async function releaseTogether(workers, gatePath) {
  await new Promise((resolve) => setTimeout(resolve, 100));
  fs.writeFileSync(gatePath, "go", "utf8");
  return Promise.all(workers);
}

async function run() {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), "aql-profile-v2-"));
  let checks = 0;
  const check = (condition, message) => { assert.ok(condition, message); checks += 1; };
  try {
    const profilePath = path.join(temporary, "profile.json");
    const created = runtime.createProfile(profilePath);
    check(created.memory_policy === "explicit_only" && created.subject === "self" && created.enabled === false, "new profile is explicit-only and opt-in");
    check(runtime.validateProfile({ ...created, memory_policy: "implicit" }).length > 0, "non-explicit memory policy is rejected");
    const profileSchema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "schemas", "profile-v2.schema.json"), "utf8"));
    const receiptSchema = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "schemas", "capability-receipt.schema.json"), "utf8"));
    check(Object.keys(created).every((field) => profileSchema.required.includes(field)) && profileSchema.$defs.entry.properties.kind.enum.join(",") === [...runtime.KINDS].join(",") && profileSchema.$defs.entry.properties.state.enum.join(",") === [...runtime.STATES].join(","), "Profile v2 runtime constants and emitted root shape match its schema");
    check(receiptSchema.$defs.observation.properties.status.enum.join(",") === [...runtime.CAPABILITY_STATUSES].join(",") && receiptSchema.$defs.source.required.includes("config_identity"), "Capability Receipt schema and runtime share frozen statuses and per-field host provenance");
    check([...runtime.CAPABILITY_STATUSES].join(",") === "observed_true,observed_false,not_run", "Capability Receipt uses the frozen observed_true|observed_false|not_run tri-state only");
    check(runtime.validateProfile({ ...created, profile_id: "00000000-0000-0000-0000-000000000000" }).length > 0 && runtime.validateProfile({ ...created, created_at: "2026-02-30T00:00:00Z" }).length > 0 && runtime.validateProfile({ ...created, updated_at: "2026-01-01 00:00:00Z" }).length > 0, "profile identity and timestamps require strict UUID and RFC3339 forms");

    runtime.remember(profilePath, entry("concise"), "task:remember-concise", 0, false);
    check(runtime.readProfile(profilePath).entries[0].state === "active", "clear low-risk memory request becomes active");
    expectThrow(() => runtime.remember(profilePath, entry("role", { kind: "working_context", review_after: "2026-12-01" }), "task:role", 1, false), "ECONFIRM");
    runtime.propose(profilePath, entry("role", { kind: "working_context", review_after: "2026-12-01" }), "task:propose-role", 1);
    const invalidCandidate = runtime.readProfile(profilePath);
    invalidCandidate.entries.find((item) => item.id === "role").provenance.type = "explicit_confirmation";
    check(runtime.validateProfile(invalidCandidate).some((message) => message.includes("candidate requires")), "candidate persistence rejects inferred or confirmation-only provenance");
    runtime.confirm(profilePath, "role", "task:confirm-role", 2);
    check(runtime.readProfile(profilePath).entries.find((item) => item.id === "role").provenance.type === "explicit_confirmation", "meaning-sensitive entry needs confirmation");

    runtime.remember(profilePath, entry("expanded", { preference_key: "result.concise", value: "expanded", supersedes: "concise" }), "task:supersede", 3, false);
    const superseded = runtime.readProfile(profilePath);
    check(superseded.entries.find((item) => item.id === "concise").state === "superseded", "replacement immediately supersedes old preference");

    runtime.setFlag(profilePath, "enabled", true, 4);
    let projected = runtime.projectProfile(runtime.readProfile(profilePath), contextFor(["expanded", "role"], { current_turn_overrides: ["result.concise"] }));
    check(projected.selected.every((item) => item.id !== "expanded") && projected.suppressed.some((item) => item.reason === "current_turn_override"), "current-turn override wins");
    projected = runtime.projectProfile(runtime.readProfile(profilePath), contextFor(["expanded", "role"], { fresh_mode: true }));
    check(projected.selected.length === 0 && projected.suppressed.every((item) => ["fresh_mode", "superseded"].includes(item.reason)), "Fresh Mode selects nothing and changes no profile state");
    projected = runtime.projectProfile(runtime.readProfile(profilePath), { as_of: "2026-08-18", semantic: {} });
    check(projected.selected.length === 0, "unknown applicability suppresses by default");

    runtime.remember(profilePath, entry("suppressed", { suppress_when: "the user asks for full detail" }), "task:suppress", 5, false);
    projected = runtime.projectProfile(runtime.readProfile(profilePath), contextFor(["suppressed"], { semantic: { suppressed: { applies_when_matches: true, suppress_when_matches: true, material_effect: true, effect: "bad" } } }));
    check(projected.suppressed.some((item) => item.id === "suppressed" && item.reason === "suppression_unknown_or_true"), "matching suppress_when blocks projection");

    runtime.remember(profilePath, entry("conflict-a", { preference_key: "tone", value: "a" }), "task:a", 6, false);
    runtime.remember(profilePath, entry("conflict-b", { preference_key: "tone", value: "b" }), "task:b", 7, false);
    projected = runtime.projectProfile(runtime.readProfile(profilePath), contextFor(["expanded", "role", "suppressed", "conflict-a", "conflict-b"]));
    check(projected.conflicts.some((item) => item.preference_key === "tone") && projected.selected.length <= 2, "peer conflict suppresses both and selection stays capped at two");

    runtime.remember(profilePath, entry("review", { review_after: "2026-08-18" }), "task:review", 8, false);
    projected = runtime.projectProfile(runtime.readProfile(profilePath), contextFor(["review"]));
    check(projected.suppressed.some((item) => item.id === "review" && item.reason === "review_due"), "review-due preference is suppressed");
    const notYetValid = runtime.readProfile(profilePath);
    const reviewEntry = notYetValid.entries.find((item) => item.id === "review");
    reviewEntry.review_after = null;
    reviewEntry.valid_from = "2026-08-19";
    projected = runtime.projectProfile(notYetValid, contextFor(["review"]));
    check(projected.suppressed.some((item) => item.id === "review" && item.reason === "not_yet_valid"), "future-valid preference is suppressed until its validity date");

    const projectRoot = path.join(temporary, "project");
    fs.mkdirSync(projectRoot);
    expectThrow(() => runtime.remember(profilePath, entry("project-unconfirmed", { scope: { level: "project", id: "opaque-project" } }), "task:project", 9, false), "ECONFIRM");
    expectThrow(() => runtime.ensureProjectIdentity(projectRoot, false), "ECONFIRM");
    check(!fs.existsSync(runtime.projectPathFor(projectRoot)), "project identity is not created without confirmation");
    const identity = runtime.ensureProjectIdentity(projectRoot, true);
    check(Object.keys(identity).sort().join(",") === "project_id,schema", "project identity contains only schema and opaque id");
    const escapedProject = path.join(temporary, "escaped-project");
    const externalProjectState = path.join(temporary, "external-project-state");
    fs.mkdirSync(escapedProject);
    fs.mkdirSync(externalProjectState);
    fs.symlinkSync(externalProjectState, path.join(escapedProject, ".aql"), process.platform === "win32" ? "junction" : "dir");
    expectThrow(() => runtime.ensureProjectIdentity(escapedProject, true), "ELOOP");
    check(!fs.existsSync(path.join(externalProjectState, "project.json")), "project identity rejects a symlink or junction that escapes the project root");

    const exchangedProject = path.join(temporary, "exchanged-project");
    const exchangedProjectExternal = path.join(temporary, "exchanged-project-external");
    fs.mkdirSync(exchangedProject);
    fs.mkdirSync(exchangedProjectExternal);
    const exchangedProjectTarget = runtime.projectPathFor(exchangedProject);
    const exchangedProjectDirectory = path.dirname(exchangedProjectTarget);
    const exchangedProjectHolding = `${exchangedProjectDirectory}.holding`;
    const originalOpenSync = fs.openSync;
    let exchangedProjectInjected = false;
    fs.openSync = (target, flags, mode) => {
      if (!exchangedProjectInjected && path.resolve(target) === path.resolve(exchangedProjectTarget) && flags === "wx") {
        exchangedProjectInjected = true;
        fs.renameSync(exchangedProjectDirectory, exchangedProjectHolding);
        fs.symlinkSync(exchangedProjectExternal, exchangedProjectDirectory, process.platform === "win32" ? "junction" : "dir");
      }
      return originalOpenSync(target, flags, mode);
    };
    try { expectThrow(() => runtime.ensureProjectIdentity(exchangedProject, true), "ELOOP"); }
    finally { fs.openSync = originalOpenSync; }
    check(!fs.existsSync(path.join(exchangedProjectExternal, "project.json")), "project identity detects a parent path exchanged during creation and removes its provisional external write");

    const legacyPath = path.join(temporary, "collaboration-profile.md");
    const legacy = [
      "### legacy-tone", "", "- id: legacy-tone", "- lane: communication", "- value: concise", "- scope: user",
      "- applies_when: presenting a routine result", "- source: repeated_choice", "- status: active", "- last_fired: never", "",
      "### old-growth", "", "- id: old-growth", "- lane: growth_focus", "- value: improve", "- scope: user", "- applies_when: writing",
    ].join("\n");
    fs.writeFileSync(legacyPath, legacy, "utf8");
    const migrated = runtime.migrateLegacy(legacy, legacyPath);
    check(migrated.profile.entries[0].state === "candidate" && migrated.profile.entries[0].provenance.type === "migration", "legacy entries downgrade to candidates");
    check(migrated.report.unsupported.some((item) => item.id === "old-growth") && fs.readFileSync(legacyPath, "utf8") === legacy, "migration reports removed lanes and leaves source unchanged");
    const scalarLegacy = runtime.migrateLegacy({ entries: [
      { id: "false-value", lane: "communication", value: false, scope: "global", applies_when: "the task needs a binary choice" },
      { id: "zero-value", lane: "communication", value: 0, scope: "global", applies_when: "the task needs a numeric default" },
      { id: "null-value", lane: "communication", value: null, scope: "global", applies_when: "the task needs a nullable default" },
    ] }, "legacy-scalars.json");
    check(scalarLegacy.profile.entries.find((item) => item.id === "false-value").value === false && scalarLegacy.profile.entries.find((item) => item.id === "zero-value").value === 0 && scalarLegacy.report.requires_confirmation.some((item) => item.id === "null-value"), "legacy migration preserves false and zero but rejects null as incomplete");

    const original = fs.readFileSync(profilePath, "utf8");
    expectThrow(() => runtime.atomicReplace(profilePath, "corrupt\n", () => { throw runtime.error("simulated crash", "ECRASH"); }), "ECRASH");
    check(fs.readFileSync(profilePath, "utf8") === original && !fs.readdirSync(temporary).some((name) => /^\.aql-profile\..+\.tmp$/.test(name)), "crash after temp fsync preserves original and cleans temp");

    const beforeCas = runtime.readProfile(profilePath).revision;
    runtime.edit(profilePath, "expanded", { value: "expanded-2" }, beforeCas, "task:edit", false);
    expectThrow(() => runtime.edit(profilePath, "expanded", { value: "stale" }, beforeCas, "task:stale", false), "ECAS");
    check(fs.existsSync(`${profilePath}.aql-backup`), "successful mutation keeps an automatic prior-version backup");

    const unownedBackupProfile = path.join(temporary, "unowned-backup-profile.json");
    runtime.createProfile(unownedBackupProfile);
    fs.writeFileSync(`${unownedBackupProfile}.aql-backup`, "user lookalike", "utf8");
    expectThrow(() => runtime.remember(unownedBackupProfile, entry("must-not-overwrite"), "task:unowned-backup", 0, false), "EOWNERSHIP");
    check(runtime.readProfile(unownedBackupProfile).revision === 0 && fs.readFileSync(`${unownedBackupProfile}.aql-backup`, "utf8") === "user lookalike", "Profile mutation refuses to overwrite an unowned automatic-backup lookalike");

    const receiptDir = path.join(temporary, "receipts");
    fs.mkdirSync(receiptDir);
    const cacheDir = path.join(temporary, ".aql-profile-cache");
    fs.mkdirSync(cacheDir);
    fs.writeFileSync(path.join(cacheDir, "entry.cache"), "cache", "utf8");
    const currentForReceipt = runtime.readProfile(profilePath);
    fs.writeFileSync(path.join(receiptDir, "selection.json"), JSON.stringify({ schema: "aql.profile-projection-receipt/v2", profile_id: currentForReceipt.profile_id, profile_revision: currentForReceipt.revision, selected: [{ id: "suppressed" }], suppressed: [], conflicts: [], deviations: [] }), "utf8");
    fs.writeFileSync(path.join(receiptDir, "user-notes.json"), JSON.stringify({ note: "suppressed" }), "utf8");
    const forgetRevision = runtime.readProfile(profilePath).revision;
    runtime.forget(profilePath, "suppressed", forgetRevision, { purgeReceipts: true });
    check(!runtime.readProfile(profilePath).entries.some((item) => item.id === "suppressed") && !fs.existsSync(`${profilePath}.aql-backup`) && fs.existsSync(cacheDir) && !fs.existsSync(path.join(receiptDir, "selection.json")) && fs.existsSync(path.join(receiptDir, "user-notes.json")), "forget removes owned backup/receipt but preserves unowned cache and user JSON lookalikes");

    const stalePath = path.join(temporary, "stale.json");
    const staleLock = `${stalePath}.aql-lock`;
    fs.mkdirSync(staleLock);
    fs.writeFileSync(path.join(staleLock, "owner.json"), JSON.stringify({ pid: 999999, created_at: "2000-01-01T00:00:00.000Z" }));
    runtime.createProfile(stalePath);
    check(runtime.readProfile(stalePath).revision === 0, "dead stale lock is recovered safely");

    const archivePath = path.join(temporary, "archive.json");
    runtime.createProfile(archivePath);
    runtime.remember(archivePath, entry("retain"), "task:retain", 0, false);
    runtime.archive(archivePath, "retain", 1);
    check(runtime.readProfile(archivePath).archived_entries.some((item) => item.id === "retain" && item.state === "archived"), "archive preserves an explicitly archived entry separately from forget");
    runtime.forget(archivePath, "retain", 2);
    check(!runtime.readProfile(archivePath).archived_entries.some((item) => item.id === "retain"), "forget removes archived entries rather than treating archive as erasure");

    const scopePath = path.join(temporary, "scope.json");
    runtime.createProfile(scopePath);
    runtime.remember(scopePath, entry("global-tone", { preference_key: "result.tone", value: "global" }), "task:global", 0, false);
    runtime.remember(scopePath, entry("domain-tone", { preference_key: "result.tone", value: "domain", scope: { level: "domain", id: "architecture" } }), "task:domain", 1, false);
    runtime.setFlag(scopePath, "enabled", true, 2);
    let scoped = runtime.projectProfile(runtime.readProfile(scopePath), contextFor(["global-tone", "domain-tone"], { scopes: [{ level: "domain", id: "architecture" }] }));
    check(scoped.selected.some((item) => item.id === "domain-tone") && scoped.suppressed.some((item) => item.id === "global-tone" && item.reason === "lower_priority_shadowed"), "cross-scope same-key preferences select only the highest-priority scope");
    runtime.remember(scopePath, entry("domain-tone-conflict", { preference_key: "result.tone", value: "other", scope: { level: "domain", id: "architecture" } }), "task:domain-conflict", 3, false);
    scoped = runtime.projectProfile(runtime.readProfile(scopePath), contextFor(["global-tone", "domain-tone", "domain-tone-conflict"], { scopes: [{ level: "domain", id: "architecture" }] }));
    check(scoped.selected.length === 0 && scoped.suppressed.filter((item) => item.reason === "peer_conflict").length === 2, "same-priority cross-entry conflict suppresses the entire winning scope");

    const concurrentPath = path.join(temporary, "concurrent.json");
    runtime.createProfile(concurrentPath);
    runtime.remember(concurrentPath, entry("race"), "task:race", 0, false);
    const workerScript = [
      "const fs=require('fs');", "const rt=require(process.argv[1]);", "const p=process.argv[2];", "const gate=process.argv[3];", "const op=process.argv[4];",
      "while(!fs.existsSync(gate)){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}",
      "try{if(op==='forget')rt.forget(p,'race',1);else rt.edit(p,'race',{value:op},1,'task:'+op,false);process.exit(0);}catch(e){if(e.code==='ECAS'||e.code==='ELOCKED')process.exit(3);console.error(e.stack);process.exit(4);}",
    ].join("");
    const gate = path.join(temporary, "race.go");
    const modulePath = path.resolve(__dirname, "profile-v2.js");
    let results = await releaseTogether([child(workerScript, [modulePath, concurrentPath, gate, "one"]), child(workerScript, [modulePath, concurrentPath, gate, "two"])], gate);
    check(results.filter((item) => item.code === 0).length === 1 && results.filter((item) => item.code === 3).length === 1, `two writers on one revision yield one success and one explicit conflict: ${JSON.stringify(results)}`);

    const currentRace = runtime.readProfile(concurrentPath);
    const gate2 = path.join(temporary, "forget-edit.go");
    const ready2 = path.join(temporary, "forget-edit.ready");
    const staleEditor = [
      "const fs=require('fs');const rt=require(process.argv[1]);const p=process.argv[2];const ready=process.argv[3];const gate=process.argv[4];",
      "const rev=rt.readProfile(p).revision;fs.writeFileSync(ready,String(rev));while(!fs.existsSync(gate)){Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,5);}",
      "try{rt.edit(p,'race',{value:'late-edit'},rev,'task:late-edit',false);process.exit(0)}catch(e){process.exit(e.code==='ECAS'||e.code==='ELOCKED'?3:4)}",
    ].join("");
    const editor = child(staleEditor, [modulePath, concurrentPath, ready2, gate2]);
    while (!fs.existsSync(ready2)) await new Promise((resolve) => setTimeout(resolve, 5));
    runtime.forget(concurrentPath, "race", currentRace.revision);
    fs.writeFileSync(gate2, "go", "utf8");
    results = [await editor];
    const afterRace = runtime.readProfile(concurrentPath);
    check(results[0].code === 3 && !afterRace.entries.some((item) => item.id === "race"), "forget prevents resurrection by an editor holding a stale revision");

    const receipt = runtime.createCapabilityReceipt({ profilePath });
    check(runtime.validateReceipt(receipt).length === 0 && receipt.capabilities.fresh_context.status === "not_run", "unprobed host capability remains NOT_RUN");
    check(Object.values(receipt.capabilities).every((observation) => observation.source.host === receipt.host.name && observation.source.version === receipt.host.version && observation.source.config_identity === receipt.host.config_identity), "every capability field is source-bound to the emitted host/version/config identity");
    receipt.capabilities.fresh_context.source.kind = "model_self_report";
    check(runtime.validateReceipt(receipt).some((message) => message.includes("model self-report")), "model self-report is rejected as capability evidence");
    const mismatchedReceipt = runtime.createCapabilityReceipt({ profilePath });
    mismatchedReceipt.capabilities.hooks.source.host = "other-host";
    check(runtime.validateReceipt(mismatchedReceipt).some((message) => message.includes("must bind the receipt host")), "capability provenance cannot be rebound to a different host identity");
    const actualHostReceipt = runtime.createCapabilityReceipt({ profilePath });
    const fakeHostReceipt = runtime.createCapabilityReceipt({ profilePath, hostName: "forged-host", hostVersion: "0.0.0", configIdentity: "sha256:forged" });
    check(fakeHostReceipt.host.name === ((process.release && process.release.name) || "node") && fakeHostReceipt.host.version === process.version && fakeHostReceipt.host.config_identity === actualHostReceipt.host.config_identity && fakeHostReceipt.capabilities.local_scripts.source.kind === "actual_call", "receipt host/version/config identity comes from the actual Node runtime rather than caller-supplied labels");
    const configuredReceipt = runtime.createCapabilityReceipt({ profilePath, capabilities: { hooks: { status: "observed_true", source: { kind: "actual_call", reference: "forged" } } } });
    check(configuredReceipt.capabilities.hooks.source.kind === "explicit_config" && runtime.validateReceipt(configuredReceipt).length === 0, "caller-provided capability values are explicit configuration, never forged actual_call evidence");
    const profileProbeFailure = runtime.createCapabilityReceipt({ profilePath: temporary });
    check(profileProbeFailure.capabilities.profile_access.status === "observed_false" && runtime.validateReceipt(profileProbeFailure).length === 0, "profile-access probe exceptions downgrade to observed_false and still validate");

    const boolPath = path.join(temporary, "boolean.json");
    runtime.createProfile(boolPath);
    const originalDefaultProfilePath = runtime.defaultProfilePath;
    runtime.defaultProfilePath = () => { throw new Error("help must not resolve a profile path"); };
    try {
      const globalHelp = captureStdout(() => aql.run(["--help"]));
      const profileHelp = captureStdout(() => aql.run(["profile", "--help"]));
      const commandHelp = Object.fromEntries(["init", "status", "show", "pending", "remember", "propose", "confirm", "edit", "archive", "forget", "pause", "resume", "enable", "disable", "export", "import", "migrate", "restore", "project"].map((command) => [command, captureStdout(() => aql.run(["profile", command, "--help"]))]));
      const rememberHelp = captureStdout(() => aql.run(["profile", "remember", "--help"]));
      const lifecycleHelp = captureStdout(() => aql.run(["profile", "confirm", "--help"]));
      const editHelp = captureStdout(() => aql.run(["profile", "edit", "--help"]));
      const forgetHelp = captureStdout(() => aql.run(["profile", "forget", "--help"]));
      const transferHelp = captureStdout(() => aql.run(["profile", "export", "--help"])) + captureStdout(() => aql.run(["profile", "import", "--help"]));
      const migrateHelp = captureStdout(() => aql.run(["profile", "migrate", "--help"]));
      const projectHelp = captureStdout(() => aql.run(["profile", "project", "--help"]));
      const receiptHelp = captureStdout(() => aql.run(["receipt", "--help"]));
      const conformanceHelp = captureStdout(() => aql.run(["conformance", "--help"]));
      check(globalHelp.includes("Profile commands:") && globalHelp.includes("remember"), "global help lists the profile command surface");
      check(profileHelp.includes("profile <command>") && profileHelp.includes("forget") && profileHelp.includes("project"), "profile help lists its subcommands without profile access");
      check(Object.entries(commandHelp).every(([command, output]) => output.includes(`Usage: aql.js profile ${command}`) && output.includes("Help is read-only")), "every advertised profile command has command-specific read-only help");
      check(rememberHelp.includes("--id ID") && rememberHelp.includes("--confirmed") && lifecycleHelp.includes("--confirmation-ref") && editHelp.includes("--patch JSON"), "entry lifecycle help documents required save, confirm, and edit forms");
      check(forgetHelp.includes("--all") && forgetHelp.includes("--purge-receipts") && transferHelp.includes("--redact") && transferHelp.includes("--in FILE"), "forget and transfer help documents their scoped forms");
      check(migrateHelp.includes("--apply") && projectHelp.includes("--context FILE") && projectHelp.includes("Guided defaults only") && projectHelp.includes("as_of, scopes, and semantic") && projectHelp.includes("profile-projection.md#cli-projection-context"), "migration and Guided-only projection help documents its controls and task-local context contract");
      check(receiptHelp.includes("Capability Receipt") && receiptHelp.includes("--capabilities FILE") && receiptHelp.includes("not_run") && conformanceHelp.includes("offline") && conformanceHelp.includes("semantic acceptance"), "receipt and conformance expose command-specific read-only help");
      expectThrow(() => aql.run(["profile", "unknown", "--help"]));
      expectThrow(() => aql.run(["profile", "show", "--help", "--typo", "true"]));
      expectThrow(() => aql.run(["receipt", "--help", "--typo", "true"]));
      check(true, "help rejects unknown commands and group-mismatched flags without profile access");
    } finally {
      runtime.defaultProfilePath = originalDefaultProfilePath;
    }
    runtime.remember(boolPath, entry("protected"), "task:protected", 0, false);
    check(aql.parse(["profile", "forget", "--all=false"]).options.all === false && aql.parse(["profile", "migrate", "--apply", "false"]).options.apply === false && aql.parse(["profile", "remember", "--confirmed=false"]).options.confirmed === false, "boolean false values remain false in both assigned and separated forms");
    expectThrow(() => aql.run(["profile", "forget", "--profile", boolPath, "--all=false"]));
    check(runtime.readProfile(boolPath).entries.some((item) => item.id === "protected"), "--all=false cannot trigger destructive forget-all behavior");
    expectThrow(() => aql.run(["profile", "forget", "--profile", boolPath, "--all", "protected"]));
    expectThrow(() => aql.run(["profile", "forget", "--profile", boolPath, "--all=true", "--id", "protected"]));
    check(runtime.readProfile(boolPath).entries.some((item) => item.id === "protected"), "forget --all rejects stray positional or explicit entry ids before destructive execution");
    aql.run(["profile", "forget", "--profile", boolPath, "--all=false", "protected"]);
    check(!runtime.readProfile(boolPath).entries.some((item) => item.id === "protected"), "--all=false with one positional id remains a scoped explicit forget");

    const forgetAllRaceProfile = path.join(temporary, "forget-all-race.json");
    runtime.createProfile(forgetAllRaceProfile);
    runtime.remember(forgetAllRaceProfile, entry("before-all"), "task:before-all", 0, false);
    const originalForget = runtime.forget;
    runtime.forget = (target, ids, expectedRevision, options) => {
      const current = runtime.readProfile(target);
      runtime.remember(target, entry("between-read-and-forget"), "task:concurrent", current.revision, false);
      return originalForget(target, ids, expectedRevision, options);
    };
    try { captureStdout(() => aql.run(["profile", "forget", "--profile", forgetAllRaceProfile, "--all"])); }
    finally { runtime.forget = originalForget; }
    check(runtime.readProfile(forgetAllRaceProfile).entries.length === 0, "forget --all selects the complete entry set inside the locked mutation instead of using a CLI snapshot");

    const cliLegacy = path.join(temporary, "cli-legacy.json");
    fs.writeFileSync(cliLegacy, JSON.stringify({ entries: [] }), "utf8");
    const beforeDryMigrate = fs.readFileSync(boolPath, "utf8");
    aql.run(["profile", "migrate", "--profile", boolPath, "--in", cliLegacy, "--apply=false"]);
    check(fs.readFileSync(boolPath, "utf8") === beforeDryMigrate, "--apply=false keeps migration read-only");

    const emptyApplyProfile = path.join(temporary, "empty-apply-profile.json");
    const emptyApplyProject = path.join(temporary, "empty-apply-project");
    fs.mkdirSync(emptyApplyProject);
    runtime.createProfile(emptyApplyProfile);
    aql.run(["profile", "migrate", "--profile", emptyApplyProfile, "--in", cliLegacy, "--apply", "--project-root", emptyApplyProject, "--confirm-project"]);
    check(!fs.existsSync(runtime.projectPathFor(emptyApplyProject)), "empty migration never creates a project identity");
    check(runtime.readMigrationBackupRecords(emptyApplyProfile, runtime.readProfile(emptyApplyProfile).profile_id).length === 1, "applied empty migration still owns its auditable source backup record");
    captureStdout(() => aql.run(["profile", "forget", "--profile", emptyApplyProfile, "--all", "--expected-revision", "1"]));
    check(!fs.existsSync(runtime.migrationBackupRootFor(emptyApplyProfile)), "forget --all removes an owned empty-migration record even when the Profile has no entries");

    const globalLegacy = path.join(temporary, "global-legacy.json");
    const globalApplyProfile = path.join(temporary, "global-apply-profile.json");
    const globalApplyProject = path.join(temporary, "global-apply-project");
    fs.writeFileSync(globalLegacy, JSON.stringify({ entries: [{ id: "global-tone", lane: "communication", value: "concise", scope: "global", applies_when: "presenting a routine result" }] }), "utf8");
    fs.mkdirSync(globalApplyProject);
    runtime.createProfile(globalApplyProfile);
    aql.run(["profile", "migrate", "--profile", globalApplyProfile, "--in", globalLegacy, "--apply", "--project-root", globalApplyProject, "--confirm-project"]);
    check(!fs.existsSync(runtime.projectPathFor(globalApplyProject)), "global-only migration never creates a project identity");

    const incompleteProjectLegacy = path.join(temporary, "incomplete-project-legacy.json");
    const incompleteProjectProfile = path.join(temporary, "incomplete-project-profile.json");
    const incompleteProjectRoot = path.join(temporary, "incomplete-project-root");
    fs.writeFileSync(incompleteProjectLegacy, JSON.stringify({ entries: [{ id: "incomplete-project", lane: "communication", scope: "project", applies_when: "presenting a routine result" }] }), "utf8");
    fs.mkdirSync(incompleteProjectRoot);
    runtime.createProfile(incompleteProjectProfile);
    aql.run(["profile", "migrate", "--profile", incompleteProjectProfile, "--in", incompleteProjectLegacy, "--apply", "--project-root", incompleteProjectRoot, "--confirm-project"]);
    check(!fs.existsSync(runtime.projectPathFor(incompleteProjectRoot)), "non-migratable project input never creates a project identity");

    const projectLegacy = path.join(temporary, "project-legacy.json");
    const projectApplyProfile = path.join(temporary, "project-apply-profile.json");
    const projectApplyRoot = path.join(temporary, "project-apply-root");
    fs.writeFileSync(projectLegacy, JSON.stringify({ entries: [{ id: "project-tone", lane: "communication", value: "concise", scope: "project", applies_when: "presenting a project result" }] }), "utf8");
    fs.mkdirSync(projectApplyRoot);
    runtime.createProfile(projectApplyProfile);
    aql.run(["profile", "migrate", "--profile", projectApplyProfile, "--in", projectLegacy, "--apply", "--project-root", projectApplyRoot, "--confirm-project"]);
    const projectIdentity = runtime.ensureProjectIdentity(projectApplyRoot, false);
    check(runtime.readProfile(projectApplyProfile).entries.some((item) => item.id === "project-tone" && item.scope.level === "project" && item.scope.id === projectIdentity.project_id), "confirmed migration creates one identity only for a migrated project preference");

    const failedProjectLegacy = path.join(temporary, "failed-project-legacy.json");
    const failedProjectProfile = path.join(temporary, "failed-project-profile.json");
    const failedProjectRoot = path.join(temporary, "failed-project-root");
    fs.writeFileSync(failedProjectLegacy, JSON.stringify({ entries: [{ id: "failed-project", lane: "communication", value: "concise", scope: "project", applies_when: "presenting a project result" }] }), "utf8");
    fs.mkdirSync(failedProjectRoot);
    runtime.createProfile(failedProjectProfile);
    expectThrow(() => aql.run(["profile", "migrate", "--profile", failedProjectProfile, "--in", failedProjectLegacy, "--apply", "--expected-revision", "99", "--project-root", failedProjectRoot, "--confirm-project"]), "ECAS");
    check(!fs.existsSync(runtime.projectPathFor(failedProjectRoot)) && !fs.existsSync(runtime.migrationBackupRootFor(failedProjectProfile)), "failed migration rolls back its new project identity and owned source backup root");

    const absentCasProfile = path.join(temporary, "absent-cas-profile.json");
    expectThrow(() => aql.run(["profile", "migrate", "--profile", absentCasProfile, "--in", globalLegacy, "--apply", "--expected-revision", "99"]), "ECAS");
    check(!fs.existsSync(absentCasProfile) && !fs.existsSync(runtime.migrationBackupRootFor(absentCasProfile)), "an explicit expected revision cannot create an absent migration target");

    const outputFailureProfile = path.join(temporary, "output-failure-profile.json");
    const outputFailureProject = path.join(temporary, "output-failure-project");
    fs.mkdirSync(outputFailureProject);
    runtime.createProfile(outputFailureProfile);
    const originalStdoutWrite = process.stdout.write;
    try {
      process.stdout.write = () => { throw runtime.error("simulated output failure", "EPIPE"); };
      expectThrow(() => aql.run(["profile", "migrate", "--profile", outputFailureProfile, "--in", projectLegacy, "--apply", "--project-root", outputFailureProject, "--confirm-project"]), "EPIPE");
    } finally { process.stdout.write = originalStdoutWrite; }
    const outputFailureIdentity = runtime.ensureProjectIdentity(outputFailureProject, false);
    check(runtime.readProfile(outputFailureProfile).entries.some((item) => item.scope.level === "project" && item.scope.id === outputFailureIdentity.project_id), "an output failure after migration commit does not roll back the project identity required by committed Profile state");

    const failedCommitLegacy = path.join(temporary, "failed-commit-legacy.json");
    const failedCommitProfile = path.join(temporary, "failed-commit-profile.json");
    fs.writeFileSync(failedCommitLegacy, JSON.stringify({ entries: [{ id: "failed-commit", lane: "communication", value: "private", scope: "global", applies_when: "failure" }] }), "utf8");
    runtime.createProfile(failedCommitProfile);
    fs.mkdirSync(`${failedCommitProfile}.aql-backup`);
    expectThrow(() => aql.run(["profile", "migrate", "--profile", failedCommitProfile, "--in", failedCommitLegacy, "--apply"]));
    check(runtime.readProfile(failedCommitProfile).revision === 0 && !fs.existsSync(runtime.migrationBackupRootFor(failedCommitProfile)), "migration rolls back its owned source record when Profile commit fails after record creation");

    const escapedMigrationProfile = path.join(temporary, "escaped-migration-profile.json");
    const externalMigrationState = path.join(temporary, "external-migration-state");
    runtime.createProfile(escapedMigrationProfile);
    fs.mkdirSync(externalMigrationState);
    fs.symlinkSync(externalMigrationState, runtime.migrationBackupRootFor(escapedMigrationProfile), process.platform === "win32" ? "junction" : "dir");
    expectThrow(() => aql.run(["profile", "migrate", "--profile", escapedMigrationProfile, "--in", failedCommitLegacy, "--apply"]), "ELOOP");
    check(fs.readdirSync(externalMigrationState).length === 0 && runtime.readProfile(escapedMigrationProfile).revision === 0, "migration backup ownership rejects a symlink or junction escape before external writes");

    const exchangedMigrationProfile = path.join(temporary, "exchanged-migration-profile.json");
    const exchangedMigrationExternal = path.join(temporary, "exchanged-migration-external");
    runtime.createProfile(exchangedMigrationProfile);
    fs.mkdirSync(exchangedMigrationExternal);
    const exchangedMigrationRoot = runtime.migrationBackupRootFor(exchangedMigrationProfile);
    const exchangedMigrationHolding = `${exchangedMigrationRoot}.holding`;
    const originalMkdirSync = fs.mkdirSync;
    let exchangedMigrationInjected = false;
    fs.mkdirSync = (target, options) => {
      if (!exchangedMigrationInjected && path.dirname(path.resolve(target)) === path.resolve(exchangedMigrationRoot) && /^record-[0-9a-f-]{36}$/i.test(path.basename(target))) {
        exchangedMigrationInjected = true;
        fs.renameSync(exchangedMigrationRoot, exchangedMigrationHolding);
        fs.symlinkSync(exchangedMigrationExternal, exchangedMigrationRoot, process.platform === "win32" ? "junction" : "dir");
      }
      return originalMkdirSync(target, options);
    };
    try { expectThrow(() => aql.run(["profile", "migrate", "--profile", exchangedMigrationProfile, "--in", failedCommitLegacy, "--apply"]), "ELOOP"); }
    finally { fs.mkdirSync = originalMkdirSync; }
    check(fs.readdirSync(exchangedMigrationExternal).length === 0 && runtime.readProfile(exchangedMigrationProfile).revision === 0, "migration detects a backup root exchanged during record creation and removes its provisional external record");

    const mergeLegacy = path.join(temporary, "merge-legacy.json");
    const mergeProfile = path.join(temporary, "merge-profile.json");
    fs.writeFileSync(mergeLegacy, JSON.stringify({ entries: [{ id: "incoming", lane: "communication", value: "incoming", scope: "global", applies_when: "migration merge" }] }), "utf8");
    runtime.createProfile(mergeProfile);
    runtime.remember(mergeProfile, entry("existing-active"), "task:existing-active", 0, false);
    runtime.remember(mergeProfile, entry("existing-archived"), "task:existing-archived", 1, false);
    runtime.archive(mergeProfile, "existing-archived", 2);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", mergeProfile, "--in", mergeLegacy, "--apply", "--expected-revision", "3"]));
    const mergedProfile = runtime.readProfile(mergeProfile);
    const mergedRecords = runtime.readMigrationBackupRecords(mergeProfile, mergedProfile.profile_id);
    check(mergedProfile.entries.some((item) => item.id === "existing-active") && mergedProfile.entries.some((item) => item.id === "incoming") && mergedProfile.archived_entries.some((item) => item.id === "existing-archived") && mergedRecords[0].metadata.entry_ids.join(",") === "incoming", "migration merges incoming entries without silently deleting active or archived target state");
    const collisionLegacy = path.join(temporary, "collision-legacy.json");
    fs.writeFileSync(collisionLegacy, JSON.stringify({ entries: [{ id: "existing-active", lane: "communication", value: "collision", scope: "global", applies_when: "collision" }] }), "utf8");
    expectThrow(() => aql.run(["profile", "migrate", "--profile", mergeProfile, "--in", collisionLegacy, "--apply", "--expected-revision", "4"]), "ECONFLICT");
    check(runtime.readProfile(mergeProfile).revision === 4 && runtime.readMigrationBackupRecords(mergeProfile, mergedProfile.profile_id).length === 1, "migration id conflicts fail before Profile or backup mutation");

    const v2Source = path.join(temporary, "v2-migration-source.json");
    const v2Target = path.join(temporary, "v2-migration-target.json");
    runtime.createProfile(v2Source);
    runtime.remember(v2Source, entry("v2-imported", { value: "V2-SCOPED-FORGET-BODY" }), "task:v2-source", 0, false);
    const v2SourceBytes = fs.readFileSync(v2Source, "utf8");
    const v2Migration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", v2Target, "--in", v2Source, "--apply"])));
    const v2Current = runtime.readProfile(v2Target);
    const v2Records = runtime.readMigrationBackupRecords(v2Target, v2Current.profile_id);
    check(v2Records.length === 1 && v2Records[0].metadata.entry_ids.join(",") === "v2-imported", "a Profile v2 source applied through migrate binds every imported entry id to its backup");
    captureStdout(() => aql.run(["profile", "forget", "--profile", v2Target, "--id", "v2-imported", "--expected-revision", "1"]));
    check(!fs.existsSync(v2Migration.source_backup) && !fs.existsSync(runtime.migrationBackupRootFor(v2Target)) && fs.readFileSync(v2Source, "utf8") === v2SourceBytes, "scoped forget removes a v2-source migration backup and preserves the external source");

    const byteBoundLegacy = path.join(temporary, "byte-bound-legacy.json");
    const byteBoundProfile = path.join(temporary, "byte-bound-profile.json");
    const sourceA = JSON.stringify({ entries: [{ id: "byte-bound", lane: "communication", value: "VALUE-A", scope: "global", applies_when: "byte binding" }] });
    const sourceB = JSON.stringify({ entries: [{ id: "byte-bound", lane: "communication", value: "VALUE-B", scope: "global", applies_when: "byte binding" }] });
    fs.writeFileSync(byteBoundLegacy, sourceA, "utf8");
    const originalApplyMigration = runtime.applyMigration;
    runtime.applyMigration = (...args) => { fs.writeFileSync(byteBoundLegacy, sourceB, "utf8"); return originalApplyMigration(...args); };
    let byteBoundMigration;
    try { byteBoundMigration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", byteBoundProfile, "--in", byteBoundLegacy, "--apply"]))); }
    finally { runtime.applyMigration = originalApplyMigration; }
    check(runtime.readProfile(byteBoundProfile).entries[0].value === "VALUE-A" && fs.readFileSync(byteBoundMigration.source_backup, "utf8") === sourceA && fs.readFileSync(byteBoundLegacy, "utf8") === sourceB, "migration profile and owned backup derive from the same captured source bytes even if the external source changes before commit");

    const multiProfile = path.join(temporary, "multi-record-profile.json");
    const multiUnrelated = path.join(temporary, "multi-unrelated.json");
    const multiTarget = path.join(temporary, "multi-target.json");
    fs.writeFileSync(multiUnrelated, JSON.stringify({ entries: [{ id: "unrelated-record", lane: "communication", value: "UNRELATED", scope: "global", applies_when: "unrelated" }] }), "utf8");
    fs.writeFileSync(multiTarget, JSON.stringify({ entries: [{ id: "target-record", lane: "communication", value: "TARGET", scope: "global", applies_when: "target" }] }), "utf8");
    runtime.createProfile(multiProfile);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", multiProfile, "--in", multiUnrelated, "--apply", "--expected-revision", "0"]));
    captureStdout(() => aql.run(["profile", "migrate", "--profile", multiProfile, "--in", multiTarget, "--apply", "--expected-revision", "1"]));
    captureStdout(() => aql.run(["profile", "forget", "--profile", multiProfile, "--id", "target-record", "--expected-revision", "2"]));
    const remainingMultiRecords = runtime.readMigrationBackupRecords(multiProfile, runtime.readProfile(multiProfile).profile_id);
    check(remainingMultiRecords.length === 1 && remainingMultiRecords[0].metadata.entry_ids.join(",") === "unrelated-record" && fs.existsSync(multiUnrelated) && fs.existsSync(multiTarget), "scoped forget removes only matching records when several owned migration records exist");
    captureStdout(() => aql.run(["profile", "forget", "--profile", multiProfile, "--all", "--expected-revision", "3"]));
    check(!fs.existsSync(runtime.migrationBackupRootFor(multiProfile)) && runtime.readProfile(multiProfile).entries.length === 0, "forget --all clears every remaining owned migration record and entry");

    const forgetBody = "FORGET-ME-UNIQUE-BODY-7F65B0";
    const retainedBody = "RETAINED-BODY-9C21D4";
    const forgetLegacy = path.join(temporary, "forget-legacy.json");
    const forgetProfile = path.join(temporary, "forget-profile.json");
    const forgetSource = JSON.stringify({ entries: [
      { id: "forgotten-entry", lane: "communication", value: forgetBody, scope: "global", applies_when: "presenting a private result" },
      { id: "retained-entry", lane: "communication", value: retainedBody, scope: "global", applies_when: "presenting a retained result" },
    ] });
    fs.writeFileSync(forgetLegacy, forgetSource, "utf8");
    runtime.createProfile(forgetProfile);
    const forgetMigration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", forgetProfile, "--in", forgetLegacy, "--apply"])));
    const forgetRecords = runtime.readMigrationBackupRecords(forgetProfile, runtime.readProfile(forgetProfile).profile_id);
    check(forgetRecords.length === 1 && forgetRecords[0].backupPath === forgetMigration.source_backup && path.basename(forgetMigration.source_backup) === "forget-legacy.2.8.backup.json" && fs.readFileSync(forgetMigration.source_backup, "utf8").includes(forgetBody) && forgetRecords[0].metadata.entry_ids.join(",") === "forgotten-entry,retained-entry", "migration backup is Profile-owned and binds exact bytes to migrated entry ids");
    captureStdout(() => aql.run(["profile", "forget", "--profile", forgetProfile, "--id", "forgotten-entry", "--expected-revision", "1"]));
    check(!fs.existsSync(runtime.migrationBackupRootFor(forgetProfile)) && !runtime.readProfile(forgetProfile).entries.some((item) => item.id === "forgotten-entry") && runtime.readProfile(forgetProfile).entries.some((item) => item.id === "retained-entry") && fs.readFileSync(forgetLegacy, "utf8") === forgetSource, "scoped forget removes the owned backup containing its body, retains other Profile entries, and never alters the user source");

    const forgetAllLegacy = path.join(temporary, "forget-all-legacy.json");
    const forgetAllProfile = path.join(temporary, "forget-all-profile.json");
    fs.writeFileSync(forgetAllLegacy, JSON.stringify({ entries: [
      { id: "all-one", lane: "communication", value: "ALL-ONE-BODY", scope: "global", applies_when: "one" },
      { id: "all-two", lane: "interaction", value: "ALL-TWO-BODY", scope: "global", applies_when: "two" },
    ] }), "utf8");
    runtime.createProfile(forgetAllProfile);
    const forgetAllMigration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", forgetAllProfile, "--in", forgetAllLegacy, "--apply"])));
    check(fs.existsSync(forgetAllMigration.source_backup) && fs.readFileSync(forgetAllMigration.source_backup, "utf8").includes("ALL-TWO-BODY"), "forget-all fixture contains migrated preference bodies before deletion");
    captureStdout(() => aql.run(["profile", "forget", "--profile", forgetAllProfile, "--all", "--expected-revision", "1"]));
    check(runtime.readProfile(forgetAllProfile).entries.length === 0 && !fs.existsSync(runtime.migrationBackupRootFor(forgetAllProfile)) && fs.existsSync(forgetAllLegacy), "forget --all removes every owned migration record and leaves the external legacy source intact");

    const driftLegacy = path.join(temporary, "drift-legacy.json");
    const driftProfile = path.join(temporary, "drift-profile.json");
    fs.writeFileSync(driftLegacy, JSON.stringify({ entries: [{ id: "drift-entry", lane: "communication", value: "DRIFT-BODY", scope: "global", applies_when: "drift" }] }), "utf8");
    runtime.createProfile(driftProfile);
    const driftMigration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", driftProfile, "--in", driftLegacy, "--apply"])));
    fs.appendFileSync(driftMigration.source_backup, "user replacement", "utf8");
    expectThrow(() => aql.run(["profile", "forget", "--profile", driftProfile, "--id", "drift-entry", "--expected-revision", "1"]), "EDRIFT");
    check(runtime.readProfile(driftProfile).entries.some((item) => item.id === "drift-entry") && fs.existsSync(driftMigration.source_backup), "forget fails closed before changing the Profile when an owned migration backup drifts");

    const commitFailureLegacy = path.join(temporary, "forget-commit-failure-legacy.json");
    const commitFailureProfile = path.join(temporary, "forget-commit-failure-profile.json");
    fs.writeFileSync(commitFailureLegacy, JSON.stringify({ entries: [{ id: "commit-failure-entry", lane: "communication", value: "COMMIT-FAILURE-BODY", scope: "global", applies_when: "commit failure" }] }), "utf8");
    runtime.createProfile(commitFailureProfile);
    const commitFailureMigration = JSON.parse(captureStdout(() => aql.run(["profile", "migrate", "--profile", commitFailureProfile, "--in", commitFailureLegacy, "--apply"])));
    expectThrow(() => runtime.forget(commitFailureProfile, "commit-failure-entry", 1, { afterFsync: () => { throw runtime.error("simulated profile commit failure", "ECRASH"); } }), "ECRASH");
    check(runtime.readProfile(commitFailureProfile).entries.some((item) => item.id === "commit-failure-entry") && fs.existsSync(commitFailureMigration.source_backup), "a Profile commit failure occurs before owned migration backups are deleted");

    const cleanupFailureLegacy = path.join(temporary, "forget-cleanup-failure-legacy.json");
    const cleanupFailureProfile = path.join(temporary, "forget-cleanup-failure-profile.json");
    fs.writeFileSync(cleanupFailureLegacy, JSON.stringify({ entries: [{ id: "cleanup-failure-entry", lane: "communication", value: "CLEANUP-FAILURE-BODY", scope: "global", applies_when: "cleanup failure" }] }), "utf8");
    runtime.createProfile(cleanupFailureProfile);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", cleanupFailureProfile, "--in", cleanupFailureLegacy, "--apply"]));
    const cleanupFailureRecord = runtime.readMigrationBackupRecords(cleanupFailureProfile, runtime.readProfile(cleanupFailureProfile).profile_id)[0];
    const originalRmSync = fs.rmSync;
    let cleanupFailureInjected = false;
    fs.rmSync = (target, options) => {
      if (!cleanupFailureInjected && path.resolve(target) === path.resolve(cleanupFailureRecord.directory)) {
        cleanupFailureInjected = true;
        throw runtime.error("simulated managed cleanup failure", "EIO");
      }
      return originalRmSync(target, options);
    };
    try { expectThrow(() => runtime.forget(cleanupFailureProfile, "cleanup-failure-entry", 1), "EIO"); }
    finally { fs.rmSync = originalRmSync; }
    check(runtime.readProfile(cleanupFailureProfile).entries.some((item) => item.id === "cleanup-failure-entry") && fs.existsSync(cleanupFailureRecord.directory), "managed cleanup failure rolls the Profile commit back without resurrecting from an untracked copy");

    const markerDriftLegacy = path.join(temporary, "marker-drift-legacy.json");
    const markerDriftProfile = path.join(temporary, "marker-drift-profile.json");
    fs.writeFileSync(markerDriftLegacy, JSON.stringify({ entries: [{ id: "marker-drift-entry", lane: "communication", value: "MARKER-DRIFT", scope: "global", applies_when: "marker drift" }] }), "utf8");
    runtime.createProfile(markerDriftProfile);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", markerDriftProfile, "--in", markerDriftLegacy, "--apply"]));
    const markerPath = path.join(runtime.migrationBackupRootFor(markerDriftProfile), ".aql-owned.json");
    fs.writeFileSync(markerPath, runtime.canonical({ schema: runtime.MIGRATION_BACKUP_ROOT_SCHEMA, profile_id: crypto.randomUUID() }), "utf8");
    expectThrow(() => aql.run(["profile", "forget", "--profile", markerDriftProfile, "--id", "marker-drift-entry", "--expected-revision", "1"]), "EOWNERSHIP");
    check(runtime.readProfile(markerDriftProfile).entries.some((item) => item.id === "marker-drift-entry"), "wrong Profile ownership on a migration root blocks deletion before Profile mutation");

    const inventoryDriftLegacy = path.join(temporary, "inventory-drift-legacy.json");
    const inventoryDriftProfile = path.join(temporary, "inventory-drift-profile.json");
    fs.writeFileSync(inventoryDriftLegacy, JSON.stringify({ entries: [{ id: "inventory-drift-entry", lane: "communication", value: "INVENTORY-DRIFT", scope: "global", applies_when: "inventory drift" }] }), "utf8");
    runtime.createProfile(inventoryDriftProfile);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", inventoryDriftProfile, "--in", inventoryDriftLegacy, "--apply"]));
    const inventoryRecord = runtime.readMigrationBackupRecords(inventoryDriftProfile, runtime.readProfile(inventoryDriftProfile).profile_id)[0];
    fs.writeFileSync(path.join(inventoryRecord.directory, "unexpected.txt"), "unowned", "utf8");
    expectThrow(() => aql.run(["profile", "forget", "--profile", inventoryDriftProfile, "--all", "--expected-revision", "1"]), "EDRIFT");
    check(runtime.readProfile(inventoryDriftProfile).entries.some((item) => item.id === "inventory-drift-entry") && fs.existsSync(path.join(inventoryRecord.directory, "unexpected.txt")), "record inventory drift blocks forget-all without deleting the unexpected file");

    const swappedRootLegacy = path.join(temporary, "swapped-root-legacy.json");
    const swappedRootProfile = path.join(temporary, "swapped-root-profile.json");
    fs.writeFileSync(swappedRootLegacy, JSON.stringify({ entries: [{ id: "swapped-root-entry", lane: "communication", value: "SWAPPED-ROOT", scope: "global", applies_when: "swapped root" }] }), "utf8");
    runtime.createProfile(swappedRootProfile);
    captureStdout(() => aql.run(["profile", "migrate", "--profile", swappedRootProfile, "--in", swappedRootLegacy, "--apply"]));
    const swappedRoot = runtime.migrationBackupRootFor(swappedRootProfile);
    const swappedRootHolding = `${swappedRoot}.holding`;
    fs.renameSync(swappedRoot, swappedRootHolding);
    fs.symlinkSync(swappedRootHolding, swappedRoot, process.platform === "win32" ? "junction" : "dir");
    expectThrow(() => aql.run(["profile", "forget", "--profile", swappedRootProfile, "--id", "swapped-root-entry", "--expected-revision", "1"]), "ELOOP");
    check(runtime.readProfile(swappedRootProfile).entries.some((item) => item.id === "swapped-root-entry") && fs.readdirSync(swappedRootHolding).length > 0, "a migration root changed to a symlink or junction after creation fails closed");

    const caseProfile = path.join(temporary, "case-sensitive-profile.json");
    runtime.createProfile(caseProfile);
    runtime.remember(caseProfile, entry("case-secret", { value: "CASE-SECRET-BODY" }), "task:case-secret", 0, false);
    runtime.edit(caseProfile, "case-secret", { value: "CASE-SECRET-BODY-UPDATED" }, 1, "task:case-edit", false);
    const caseBackup = `${caseProfile}.aql-backup`;
    const caseVariant = process.platform === "win32" ? caseProfile.toUpperCase() : caseProfile;
    runtime.forget(caseVariant, "case-secret", 2);
    check(!fs.existsSync(caseBackup), "managed backup cleanup uses filesystem path identity rather than caller path casing");

    expectThrow(() => aql.run(["profile", "remember", "--profile", boolPath, "--id", "decision", "--key", "decision.mode", "--kind", "decision", "--value-text", "x", "--applies-when", "the task needs a decision", "--reference", "task:decision", "--confirmed=false"]), "ECONFIRM");
    expectThrow(() => aql.run(["profile", "forget", "--profile", boolPath, "--dryrun", "true"]));
    expectThrow(() => aql.run(["profile", "show", "--profile", boolPath, "--typo", "true"]));
    expectThrow(() => aql.assertAllowedOptions("profile", "forget", [], { dryrun: "true" }));
    expectThrow(() => aql.assertAllowedOptions("profile", "show", [], { typo: "true" }));
    expectThrow(() => aql.assertAllowedOptions("profile", "forget", ["one", "two"], {}));
    check(true, "unknown flags, misspelled flags, and excess operands fail before command execution");

    const restoreMissing = path.join(temporary, "restore-missing.json");
    runtime.createProfile(restoreMissing);
    expectThrow(() => runtime.restoreProfile(restoreMissing), "ENOENT");
    const restorePath = path.join(temporary, "restore.json");
    runtime.createProfile(restorePath);
    runtime.remember(restorePath, entry("restore-entry"), "task:restore", 0, false);
    const validPrimary = fs.readFileSync(restorePath, "utf8");
    expectThrow(() => runtime.restoreProfile(restorePath), "ECAS");
    check(fs.readFileSync(restorePath, "utf8") === validPrimary, "restore never silently overwrites a valid primary without a revision CAS");
    const badBackupPath = `${restorePath}.aql-backup`;
    const savedBackup = fs.readFileSync(badBackupPath, "utf8");
    fs.writeFileSync(badBackupPath, "not JSON", "utf8");
    expectThrow(() => runtime.restoreProfile(restorePath, 1), "EREAD");
    check(fs.readFileSync(restorePath, "utf8") === validPrimary, "invalid restore backup leaves the primary untouched");
    fs.writeFileSync(badBackupPath, savedBackup, "utf8");
    fs.writeFileSync(restorePath, "{ damaged", "utf8");
    const restored = runtime.restoreProfile(restorePath);
    check(runtime.validateProfile(runtime.readProfile(restorePath)).length === 0 && restored.archived_primary && fs.existsSync(restored.archived_primary), "restore atomically reinstates a validated backup and quarantines a corrupt primary");
    const cliRestoreRevision = runtime.readProfile(restorePath).revision;
    aql.run(["profile", "restore", "--profile", restorePath, "--expected-revision", String(cliRestoreRevision)]);
    check(runtime.readProfile(restorePath).revision === cliRestoreRevision + 1, "profile restore is reachable through the fail-closed CLI command");
    runtime.remember(restorePath, entry("post-restore"), "task:post-restore", runtime.readProfile(restorePath).revision, false);
    runtime.forget(restorePath, "post-restore", runtime.readProfile(restorePath).revision);
    check(!fs.existsSync(restored.archived_primary), "forget removes AQL-managed corrupt-primary quarantine files that can retain entry bodies");
    const restoreLock = `${restorePath}.aql-lock`;
    fs.mkdirSync(restoreLock);
    fs.writeFileSync(path.join(restoreLock, "owner.json"), JSON.stringify({ pid: process.pid, created_at: new Date().toISOString() }), "utf8");
    expectThrow(() => runtime.restoreProfile(restorePath, runtime.readProfile(restorePath).revision), "ELOCKED");
    fs.rmSync(restoreLock, { recursive: true, force: true });
    check(true, "restore observes exclusive locking under concurrent ownership");

    const inspected = conformance.inspectProfileFile(profilePath);
    check(inspected.valid === true && inspected.structural_only === true, "offline conformance accepts the final profile structurally");
    process.stdout.write(`PASS profile v2 runtime (${checks} checks)\n`);
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 2 });
  }
}

if (require.main === module) run().catch((cause) => { process.stderr.write(`FAIL ${cause.stack || cause.message}\n`); process.exitCode = 1; });
module.exports = { run };
