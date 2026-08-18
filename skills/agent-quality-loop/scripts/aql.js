#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const profile = require("./profile-v2");

function usage() {
  return [
    "Usage: node <SKILL_ROOT>/scripts/aql.js profile <command> [options]",
    "       node <SKILL_ROOT>/scripts/aql.js receipt [options]",
    "       node <SKILL_ROOT>/scripts/aql.js conformance [file]",
    "",
    "Profile commands:",
    "  init, status, show, pending, remember, propose, confirm, edit, archive, forget",
    "  pause, resume, enable, disable, export, import, migrate, restore, project",
    "",
    "The profile defaults to $AQL_HOME/profile.json or ~/.aql/profile.json.",
    "Core AQL does not require this CLI or profile. All mutations use a lock, revision CAS, backup, and atomic replace.",
    "Migration is read-only unless --apply is present. This package does not claim an npx command.",
  ].join("\n");
}

const PROFILE_HELP = {
  init: ["Create an opt-in, explicit_only profile.", "Usage: aql.js profile init [--profile FILE]"],
  status: ["Report profile availability and summary without creating one.", "Usage: aql.js profile status [--profile FILE]"],
  show: ["Print the full local profile.", "Usage: aql.js profile show [--profile FILE]"],
  pending: ["Print candidate entries awaiting confirmation.", "Usage: aql.js profile pending [--profile FILE]"],
  remember: ["Save an explicit entry; use --confirmed and --confirmation-ref when confirmation is required.", "Usage: aql.js profile remember --id ID --key KEY --kind KIND (--value JSON | --value-text TEXT) --applies-when TEXT --reference REF [--profile FILE] [--expected-revision N] [--scope-level global|project|other] [--scope-id ID] [--project-root DIR --confirm-project] [--suppress-when TEXT] [--valid-from DATE] [--review-after DATE] [--valid-until DATE] [--supersedes ID] [--confirmed --confirmation-ref REF]"],
  propose: ["Save an explicit candidate; confirmation promotes it later.", "Usage: aql.js profile propose --id ID --key KEY --kind KIND (--value JSON | --value-text TEXT) --applies-when TEXT --reference REF [--profile FILE] [--expected-revision N] [--scope-level global|project|other] [--scope-id ID] [--project-root DIR] [--suppress-when TEXT] [--valid-from DATE] [--review-after DATE] [--valid-until DATE] [--supersedes ID]"],
  confirm: ["Confirm a candidate entry.", "Usage: aql.js profile confirm (--id ID | ID) --confirmation-ref REF [--profile FILE] [--expected-revision N]"],
  edit: ["Apply a JSON patch to an entry. Meaning-sensitive and project-scoped edits require explicit confirmation.", "Usage: aql.js profile edit (--id ID | ID) --patch JSON --reference REF [--profile FILE] [--expected-revision N] [--confirmed --confirmation-ref REF] [--project-root DIR --confirm-project]"],
  archive: ["Archive one entry.", "Usage: aql.js profile archive (--id ID | ID) [--profile FILE] [--expected-revision N]"],
  forget: ["Permanently remove one entry or all entries. --all cannot be combined with an entry ID.", "Usage: aql.js profile forget (--id ID | ID | --all) [--profile FILE] [--expected-revision N] [--purge-receipts]"],
  pause: ["Pause profile application for Guided defaults.", "Usage: aql.js profile pause [--profile FILE] [--expected-revision N]"],
  resume: ["Resume profile application for Guided defaults.", "Usage: aql.js profile resume [--profile FILE] [--expected-revision N]"],
  enable: ["Enable profile application for Guided defaults.", "Usage: aql.js profile enable [--profile FILE] [--expected-revision N]"],
  disable: ["Disable profile application for Guided defaults.", "Usage: aql.js profile disable [--profile FILE] [--expected-revision N]"],
  export: ["Export a profile. Redacted exports are not importable.", "Usage: aql.js profile export [--profile FILE] [--redact] [--out FILE]"],
  import: ["Validate and import a profile; --dry-run performs no write.", "Usage: aql.js profile import --in FILE [--profile FILE] [--expected-revision N] [--dry-run]"],
  migrate: ["Inspect legacy input by default; --apply imports it after backing up the source.", "Usage: aql.js profile migrate --in FILE [--profile FILE] [--expected-revision N] [--apply] [--project-root DIR --confirm-project]"],
  restore: ["Restore the managed backup with revision protection.", "Usage: aql.js profile restore [--profile FILE] [--expected-revision N] [--backup FILE]"],
  project: [
    "Evaluate eligible profile entries into Guided defaults only.",
    "Usage: aql.js profile project --context FILE [--profile FILE]",
    "Context FILE is task-local JSON with required as_of, scopes, and semantic fields; see references/profile-projection.md#cli-projection-context.",
  ],
};

const GROUP_HELP = {
  receipt: [
    "Create a mechanical, tri-state Capability Receipt.",
    "Usage: aql.js receipt [--profile FILE] [--capabilities FILE] [--out FILE]",
    "--capabilities accepts explicit host-supplied JSON; unknown or unprobed capabilities remain not_run.",
  ],
  conformance: [
    "Inspect one AQL conformance bundle offline without granting semantic acceptance.",
    "Usage: aql.js conformance FILE",
  ],
};

function profileUsage(command) {
  if (!command) {
    return [
      "Usage: node <SKILL_ROOT>/scripts/aql.js profile <command> [options]",
      "Commands: " + Object.keys(PROFILE_HELP).join(", "),
      "Use: node <SKILL_ROOT>/scripts/aql.js profile <command> --help",
      "Profile projection supplies Guided defaults only; it never changes Core constraints, evidence, authority, acceptance, or release.",
    ].join("\n");
  }
  const help = PROFILE_HELP[command];
  if (!help) throw new Error(`unknown profile command ${command}`);
  return [...help, "All boolean flags accept only true or false when assigned.", "Help is read-only; it does not access the profile or user directory."].join("\n");
}

function groupUsage(group) {
  const help = GROUP_HELP[group];
  if (!help) return usage();
  return [...help, "Help is read-only; it does not access the profile or user directory."].join("\n");
}

function parse(argv) {
  const positionals = [];
  const options = {};
  const booleanOptions = new Set(["all", "apply", "confirmed", "confirm-project", "dry-run", "help", "purge-receipts", "redact"]);
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) { positionals.push(token); continue; }
    const [name, inline] = token.slice(2).split("=", 2);
    if (Object.prototype.hasOwnProperty.call(options, name)) throw new Error(`--${name} may be supplied only once`);
    if (inline !== undefined) {
      if (booleanOptions.has(name)) {
        if (inline === "true") options[name] = true;
        else if (inline === "false") options[name] = false;
        else throw new Error(`--${name} accepts only true or false when assigned`);
      } else {
        options[name] = inline;
      }
      continue;
    }
    if (booleanOptions.has(name)) {
      const following = argv[index + 1];
      if (following === "true" || following === "false") { options[name] = following === "true"; index += 1; }
      else options[name] = true;
      continue;
    }
    const value = argv[index + 1];
    if (value === undefined || value.startsWith("--")) throw new Error(`--${name} requires a value`);
    options[name] = value;
    index += 1;
  }
  let group = positionals[0];
  let command = positionals[1];
  let operands = positionals.slice(2);
  if (group && group !== "profile" && !new Set(["receipt", "conformance", "help"]).has(group)) {
    command = group;
    group = "profile";
    operands = positionals.slice(1);
  }
  return { group, command, operands, options };
}

const PROFILE_OPTIONS = {
  init: ["profile"], status: ["profile"], show: ["profile"], pending: ["profile"],
  remember: ["profile", "expected-revision", "confirmed", "confirmation-ref", "reference", "id", "key", "kind", "value", "value-text", "scope-level", "scope-id", "project-root", "confirm-project", "applies-when", "suppress-when", "valid-from", "review-after", "valid-until", "supersedes"],
  propose: ["profile", "expected-revision", "reference", "id", "key", "kind", "value", "value-text", "scope-level", "scope-id", "project-root", "applies-when", "suppress-when", "valid-from", "review-after", "valid-until", "supersedes"],
  confirm: ["profile", "expected-revision", "id", "confirmation-ref"],
  edit: ["profile", "expected-revision", "id", "patch", "confirmed", "confirmation-ref", "reference", "project-root", "confirm-project"],
  archive: ["profile", "expected-revision", "id"],
  forget: ["profile", "expected-revision", "id", "all", "purge-receipts"],
  pause: ["profile", "expected-revision"], resume: ["profile", "expected-revision"],
  enable: ["profile", "expected-revision"], disable: ["profile", "expected-revision"],
  export: ["profile", "redact", "out"], import: ["profile", "expected-revision", "in", "dry-run"],
  migrate: ["profile", "expected-revision", "in", "apply", "project-root", "confirm-project"],
  restore: ["profile", "expected-revision", "backup"], project: ["profile", "context"],
};
const GROUP_OPTIONS = {
  receipt: new Set(["profile", "capabilities", "out"]),
  conformance: new Set(),
  help: new Set(),
};
function assertAllowedOptions(group, command, operands, options) {
  const allowed = group === "profile" ? PROFILE_OPTIONS[command] && new Set(PROFILE_OPTIONS[command]) : GROUP_OPTIONS[group];
  if (!allowed) throw new Error(`unknown profile command ${command || "<missing>"}`);
  for (const name of Object.keys(options)) if (name !== "help" && !allowed.has(name)) throw new Error(`--${name} is not valid for ${group}${command ? ` ${command}` : ""}`);
  const maxOperands = new Set(["confirm", "edit", "archive", "forget"]).has(command) ? 1 : 0;
  if (operands.length > maxOperands) throw new Error(`too many positional arguments for ${group}${command ? ` ${command}` : ""}`);
  if (group === "profile" && command === "forget" && options.all === true && (options.id !== undefined || operands.length > 0)) {
    throw new Error("forget --all cannot be combined with --id or a positional entry id");
  }
}

function print(value) { process.stdout.write(profile.canonical(value)); }
function profilePath(options) { return options.profile ? path.resolve(options.profile) : profile.defaultProfilePath(); }
function revision(options) {
  if (options["expected-revision"] === undefined) return undefined;
  const parsed = Number(options["expected-revision"]);
  if (!Number.isInteger(parsed) || parsed < 0) throw new Error("--expected-revision must be a non-negative integer");
  return parsed;
}
function required(options, key) { if (!options[key]) throw new Error(`--${key} is required`); return options[key]; }
function readText(inputPath) { return fs.readFileSync(path.resolve(inputPath), "utf8"); }
function readJson(inputPath) {
  try { return JSON.parse(readText(inputPath)); }
  catch (cause) { throw new Error(`cannot parse JSON ${inputPath}: ${cause.message}`); }
}
function parseJson(value, label) { try { return JSON.parse(value); } catch (cause) { throw new Error(`${label} must be JSON: ${cause.message}`); } }
function writeExplicit(outputPath, value) {
  const absolute = path.resolve(outputPath);
  if (fs.existsSync(absolute)) throw new Error(`refusing to overwrite export target: ${absolute}`);
  fs.mkdirSync(path.dirname(absolute), { recursive: true, mode: 0o700 });
  fs.writeFileSync(absolute, profile.canonical(value), { encoding: "utf8", mode: 0o600, flag: "wx" });
  return absolute;
}
function scopeFrom(options, allowCreateProject) {
  const level = options["scope-level"] || "global";
  if (level === "global") return { level: "global" };
  if (level === "project") {
    const projectRoot = required(options, "project-root");
    const identity = profile.ensureProjectIdentity(projectRoot, allowCreateProject && options["confirm-project"] === true);
    return { level: "project", id: identity.project_id };
  }
  return { level, id: required(options, "scope-id") };
}
function entryInput(options, allowCreateProject) {
  let value;
  if (options.value !== undefined) value = parseJson(options.value, "--value");
  else value = required(options, "value-text");
  return {
    id: required(options, "id"),
    preference_key: required(options, "key"),
    kind: required(options, "kind"),
    value,
    scope: scopeFrom(options, allowCreateProject),
    applies_when: required(options, "applies-when"),
    suppress_when: options["suppress-when"] === undefined ? null : options["suppress-when"],
    valid_from: options["valid-from"],
    review_after: options["review-after"] === undefined ? null : options["review-after"],
    valid_until: options["valid-until"] === undefined ? null : options["valid-until"],
    supersedes: options.supersedes === undefined ? null : options.supersedes,
  };
}
function redactExport(current) {
  const copy = JSON.parse(JSON.stringify(current));
  for (const entry of [...copy.entries, ...copy.archived_entries]) {
    entry.value = { redacted_sha256: `sha256:${profile.sha256(profile.canonical(entry.value))}` };
    entry.applies_when = "[redacted]";
    entry.suppress_when = entry.suppress_when === null ? null : "[redacted]";
    entry.provenance.refs = ["redacted"];
  }
  return { schema: "aql.profile-export/v1", redacted: true, importable: false, profile: copy };
}
function configuredCapabilities(filePath) {
  if (!filePath) return undefined;
  const statuses = readJson(filePath);
  const digest = `sha256:${profile.sha256(readText(filePath))}`;
  const observedAt = new Date().toISOString();
  const result = {};
  for (const [id, status] of Object.entries(statuses)) {
    result[id] = { status, source: { kind: "explicit_config", reference: digest, observed_at: observedAt } };
  }
  return result;
}

function runProfile(command, operands, options) {
  assertAllowedOptions("profile", command, operands, options);
  const target = profilePath(options);
  const expected = revision(options);
  let result;
  switch (command) {
    case "init": result = profile.createProfile(target); break;
    case "status": {
      if (!fs.existsSync(target)) { print({ exists: false, enabled: false, paused: false, profile_access: "not_run" }); return 0; }
      const current = profile.readProfile(target);
      print({ exists: true, schema: current.schema, profile_id: current.profile_id, revision: current.revision, enabled: current.enabled, paused: current.paused, active: current.entries.filter((entry) => entry.state === "active").length, pending: current.entries.filter((entry) => entry.state === "candidate").length, archived: current.archived_entries.length });
      return 0;
    }
    case "show": result = profile.readProfile(target); break;
    case "pending": {
      const current = profile.readProfile(target);
      result = { schema: current.schema, profile_id: current.profile_id, revision: current.revision, entries: current.entries.filter((entry) => entry.state === "candidate") };
      break;
    }
    case "remember": result = profile.remember(target, entryInput(options, Boolean(options.confirmed)), required(options, options.confirmed ? "confirmation-ref" : "reference"), expected, Boolean(options.confirmed)); break;
    case "propose": result = profile.propose(target, entryInput(options, false), required(options, "reference"), expected); break;
    case "confirm": result = profile.confirm(target, options.id || operands[0], required(options, "confirmation-ref"), expected); break;
    case "edit": {
      const patch = parseJson(required(options, "patch"), "--patch");
      if (patch.scope && patch.scope.level === "project") {
        if (!options.confirmed) throw new Error("project-scoped edit requires --confirmed and --confirmation-ref");
        const projectRoot = required(options, "project-root");
        const identity = profile.ensureProjectIdentity(projectRoot, options["confirm-project"] === true);
        patch.scope = { level: "project", id: identity.project_id };
      }
      result = profile.edit(target, options.id || operands[0], patch, expected, required(options, options.confirmed ? "confirmation-ref" : "reference"), Boolean(options.confirmed));
      break;
    }
    case "archive": result = profile.archive(target, options.id || operands[0], expected); break;
    case "forget": {
      const ids = options.all ? [] : [options.id || operands[0]];
      result = profile.forget(target, ids, expected, { all: Boolean(options.all), purgeReceipts: Boolean(options["purge-receipts"]) });
      break;
    }
    case "pause": result = profile.setFlag(target, "paused", true, expected); break;
    case "resume": result = profile.setFlag(target, "paused", false, expected); break;
    case "enable": result = profile.setFlag(target, "enabled", true, expected); break;
    case "disable": result = profile.setFlag(target, "enabled", false, expected); break;
    case "export": {
      const current = profile.readProfile(target);
      result = options.redact ? redactExport(current) : current;
      if (options.out) { const written = writeExplicit(options.out, result); print({ exported: written, redacted: Boolean(options.redact) }); return 0; }
      break;
    }
    case "import": {
      const imported = readJson(required(options, "in"));
      profile.assertValidProfile(imported);
      if (options["dry-run"]) { print({ dry_run: true, valid: true, profile_id: imported.profile_id, entries: imported.entries.length }); return 0; }
      result = profile.importProfile(target, imported, expected);
      break;
    }
    case "migrate": {
      const inputPath = path.resolve(required(options, "in"));
      const sourceBytes = fs.readFileSync(inputPath);
      const raw = sourceBytes.toString("utf8");
      let input = raw;
      if (path.extname(inputPath).toLowerCase() === ".json") input = parseJson(raw, "migration input");
      let projectId;
      let createdProjectIdentity = null;
      if (options["project-root"]) {
        const projectPath = profile.projectPathFor(options["project-root"]);
        if (fs.existsSync(projectPath)) projectId = profile.ensureProjectIdentity(options["project-root"], false).project_id;
      }
      let migrated = profile.migrateLegacy(input, inputPath, { projectId });
      if (!projectId && options.apply && options["project-root"] && options["confirm-project"] && migrated.report.requires_project_binding.length > 0) {
        const identityState = profile.ensureProjectIdentityWithStatus(options["project-root"], true);
        projectId = identityState.identity.project_id;
        if (identityState.created) createdProjectIdentity = { root: options["project-root"], id: projectId };
        migrated = profile.migrateLegacy(input, inputPath, { projectId });
      }
      if (!options.apply) { print({ dry_run: true, report: migrated.report, proposed_profile: migrated.profile }); return 0; }
      let applied;
      try { applied = profile.applyMigration(target, migrated.profile, inputPath, sourceBytes, expected); }
      catch (cause) {
        const rollbackErrors = [];
        if (createdProjectIdentity) {
          try {
            const projectPath = profile.projectPathFor(createdProjectIdentity.root);
            const current = fs.existsSync(projectPath) ? profile.ensureProjectIdentity(createdProjectIdentity.root, false) : null;
            if (current && current.project_id === createdProjectIdentity.id) fs.rmSync(projectPath, { force: false });
            try { fs.rmdirSync(path.dirname(projectPath)); } catch (rollbackCause) { if (rollbackCause.code !== "ENOTEMPTY" && rollbackCause.code !== "ENOENT") throw rollbackCause; }
          } catch (rollbackCause) { rollbackErrors.push(`project identity: ${rollbackCause.message}`); }
        }
        if (rollbackErrors.length > 0) throw profile.error(`${cause.message}; migration rollback failed: ${rollbackErrors.join("; ")}`, cause.code || "EIO");
        throw cause;
      }
      result = applied.profile;
      print({ applied: true, source_unchanged: true, source_backup: applied.backup_path, report: migrated.report, profile: result });
      return 0;
    }
    case "restore": result = profile.restoreProfile(target, expected, { backupPath: options.backup && path.resolve(options.backup) }); break;
    case "project": {
      const current = profile.readProfile(target);
      const context = readJson(required(options, "context"));
      result = profile.projectProfile(current, context);
      break;
    }
    default: throw new Error(`unknown profile command ${command || "<missing>"}\n${usage()}`);
  }
  print(result);
  return 0;
}

function run(argv = process.argv.slice(2)) {
  const { group, command, operands, options } = parse(argv);
  if (!group || group === "help") { process.stdout.write(`${usage()}\n`); return 0; }
  if (group === "profile" && options.help) {
    if (!command) {
      if (operands.length > 0 || Object.keys(options).some((name) => name !== "help")) throw new Error("profile help does not accept a command operand or options");
    } else {
      assertAllowedOptions("profile", command, operands, options);
    }
    process.stdout.write(`${profileUsage(command)}\n`);
    return 0;
  }
  if (options.help) {
    assertAllowedOptions(group, command, operands, options);
    process.stdout.write(`${groupUsage(group)}\n`);
    return 0;
  }
  if (group === "profile") return runProfile(command, operands, options);
  if (group === "receipt") {
    assertAllowedOptions(group, command, operands, options);
    const receipt = profile.createCapabilityReceipt({
      profilePath: profilePath(options),
      capabilities: configuredCapabilities(options.capabilities),
    });
    if (options.out) { const written = writeExplicit(options.out, receipt); print({ receipt: written }); return 0; }
    print(receipt);
    return 0;
  }
  if (group === "conformance") {
    assertAllowedOptions(group, command, operands, options);
    const conformance = require("./conformance");
    if (!command && !operands[0]) throw new Error("conformance requires a JSON file or --self-test through the conformance script");
    const inspected = conformance.inspectFile(path.resolve(command || operands[0]));
    print(inspected);
    return inspected.valid ? 0 : 1;
  }
  throw new Error(`unknown command group ${group}\n${usage()}`);
}

if (require.main === module) {
  try { process.exitCode = run(); }
  catch (cause) { process.stderr.write(`ERROR ${cause.message}\n`); process.exitCode = 1; }
}

module.exports = { parse, assertAllowedOptions, run, runProfile, usage, profileUsage, groupUsage };
