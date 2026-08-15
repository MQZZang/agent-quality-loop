#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REQUIRED_FIELDS = ["id", "lane", "value", "scope", "applies_when", "source", "status", "last_fired"];
const LANES = new Set([
  "phrase_lexicon",
  "communication",
  "collaboration_habit",
  "writing_preference",
  "growth_focus",
  "rejected_option",
  "route_alias",
]);
const SOURCES = new Set(["explicit_statement", "explicit_confirmation", "repeated_correction", "repeated_choice"]);
const STATUSES = new Set(["candidate", "active", "archived"]);
const WRITING_POSTURES = new Set(["deliver", "co-create", "coach"]);
const ROUTE_IDS = new Set(["diagnose", "accept", "release-check", "resume"]);
const CONFIRM_ONLY_LANES = new Set(["route_alias", "rejected_option", "growth_focus"]);
const PROJECT_PROFILE_RELATIVE = path.join(".ai", "knowledge", "collaboration-profile.md");
const PROJECT_PROFILE_REF = ".ai/knowledge/collaboration-profile.md";
const USER_PROFILE_REF = "~/.ai/knowledge/collaboration-profile.md";
const PROJECT_FIXTURE_ROOT = path.resolve(__dirname, "..", "fixtures", "profile-project");
const USER_FIXTURE_PATH = path.resolve(__dirname, "..", "fixtures", "profile-user", PROJECT_PROFILE_RELATIVE);
const GENERIC_CONDITIONS = new Set([
  "appropriate",
  "when appropriate",
  "when relevant",
  "relevant",
  "if needed",
  "as needed",
  "tbd",
  "todo",
  "适用时",
  "相关时",
  "需要时",
]);

function normalizeLf(value) {
  return String(value).replace(/\r\n?/g, "\n");
}

function sha256(value) {
  return crypto.createHash("sha256").update(Buffer.from(String(value), "utf8")).digest("hex");
}

function canonicalizeBlock(value) {
  const lines = normalizeLf(value).split("\n");
  while (lines.length > 0 && lines[0].trim() === "") lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === "") lines.pop();
  return `${lines.join("\n")}\n`;
}

function isCalendarDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isConcreteCondition(value) {
  if (typeof value !== "string" || value.trim().length < 8) return false;
  const normalized = value.trim().toLowerCase().replace(/[.!?。！？]+$/, "");
  if (GENERIC_CONDITIONS.has(normalized)) return false;
  return !/[<{[]\s*(?:specific|condition|applies|tbd|todo|placeholder|具体|条件)[^>}\]]*[>}\]]/i.test(value);
}

function safeReference(value) {
  if (typeof value !== "string" || value.trim().length < 4 || /[\r\n]/.test(value)) return false;
  const trimmed = value.trim();
  return !path.isAbsolute(trimmed) && !/^[A-Za-z]:[\\/]/.test(trimmed) && !/^raw[-_ ]?prompt:/i.test(trimmed);
}

function hasUserProfileOptInAssumption(assumptions) {
  const isRecord = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
  const candidates = Array.isArray(assumptions)
    ? assumptions
    : isRecord(assumptions)
      ? [assumptions, ...Object.values(assumptions)]
      : [];
  return candidates.some((entry) => (
    isRecord(entry) &&
    entry.kind === "user_profile_opt_in" &&
    entry.enabled === true &&
    entry.scope === "current_session" &&
    safeReference(entry.source_ref)
  ));
}

function parseFields(block) {
  const fields = {};
  const duplicates = [];
  let inFence = false;
  for (const line of normalizeLf(block).split("\n").slice(1)) {
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const match = line.match(/^- ([a-z][a-z0-9_]*):\s*(.*)$/);
    if (!match) continue;
    const [, key, value] = match;
    if (Object.prototype.hasOwnProperty.call(fields, key)) duplicates.push(key);
    else fields[key] = value.trim();
  }
  return { fields, duplicates };
}

function extractBlocks(text) {
  const lines = normalizeLf(text).split("\n");
  const blocks = [];
  let inFence = false;
  let current = null;
  const close = (end) => {
    if (!current) return;
    const block = canonicalizeBlock(lines.slice(current.start, end).join("\n"));
    blocks.push({ headingId: current.headingId, block, content_sha256: sha256(block) });
    current = null;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(?:```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const heading = line.match(/^(#{2,3})\s+(.+?)\s*$/);
    if (!heading) continue;
    close(index);
    if (heading[1] === "###" && /^[a-z0-9][a-z0-9._-]*$/.test(heading[2])) {
      current = { start: index, headingId: heading[2] };
    }
  }
  close(lines.length);
  return blocks;
}

function validateEntry(blockRecord) {
  const { fields, duplicates } = parseFields(blockRecord.block);
  const errors = duplicates.map((field) => `duplicate field ${field}`);
  const missing = REQUIRED_FIELDS.filter((field) => typeof fields[field] !== "string" || fields[field].trim() === "");
  if (fields.id && fields.id !== blockRecord.headingId) errors.push("heading id must equal explicit id");
  if (missing.length === 0) {
    if (!LANES.has(fields.lane)) errors.push("lane is invalid");
    if (!SOURCES.has(fields.source)) errors.push("source is invalid");
    if (!STATUSES.has(fields.status)) errors.push("status is invalid");
    if (!/^(?:project|user|domain:[^\s:]+|task_class:[^\s:]+)$/.test(fields.scope)) errors.push("scope is invalid");
    if (fields.last_fired !== "never" && !isCalendarDate(fields.last_fired)) errors.push("last_fired is not a real calendar date");
    if (fields.observed_at && !isCalendarDate(fields.observed_at)) errors.push("observed_at is not a real calendar date");
    if (!isConcreteCondition(fields.applies_when)) errors.push("applies_when is generic or a placeholder");
    if (fields.conflict_key && !/^[a-z0-9][a-z0-9._-]*$/.test(fields.conflict_key)) errors.push("conflict_key is invalid");

    const posture = fields.writing_posture;
    if (posture && !WRITING_POSTURES.has(posture)) errors.push("writing_posture is invalid");
    if (fields.lane === "writing_preference" && WRITING_POSTURES.has((fields.value || "").trim().toLowerCase()) && !posture) {
      errors.push("posture-shaped writing preference requires writing_posture");
    }
    if (fields.lane === "route_alias") {
      if (!fields.trigger_phrase) errors.push("route_alias requires trigger_phrase");
      if (!ROUTE_IDS.has(fields.route_id)) errors.push("route_alias route_id is invalid");
    }

    const confirmOnly = CONFIRM_ONLY_LANES.has(fields.lane) || Boolean(posture);
    if (confirmOnly && fields.status === "active" && fields.source !== "explicit_confirmation") errors.push("active confirmation-only entry requires source explicit_confirmation");
    if (confirmOnly && fields.status === "active" && !safeReference(fields.confirmation_ref)) errors.push("active confirmation-only entry requires a safe confirmation_ref");
  }

  return {
    ...blockRecord,
    id: blockRecord.headingId,
    fields,
    missing,
    errors,
    complete: missing.length === 0 && errors.length === 0,
    projectable: missing.length === 0 && errors.length === 0 && fields.status === "active",
  };
}

function parseProfile(text) {
  const entries = extractBlocks(text).map(validateEntry);
  const errors = [];
  const seen = new Set();
  for (const entry of entries) {
    if (seen.has(entry.id)) errors.push(`duplicate profile entry id ${entry.id}`);
    seen.add(entry.id);
    for (const error of entry.errors) errors.push(`${entry.id}: ${error}`);
  }
  return {
    entries,
    byId: new Map(entries.map((entry) => [entry.id, entry])),
    errors,
    projectable: entries.filter((entry) => entry.projectable),
    complete: entries.filter((entry) => entry.complete),
    inactive: entries.filter((entry) => entry.complete && !entry.projectable),
    legacy: entries.filter((entry) => !entry.projectable && entry.missing.length > 0),
  };
}

function readProfile(filePath) {
  return parseProfile(fs.readFileSync(filePath, "utf8"));
}

function comparablePath(value) {
  const resolved = path.resolve(value);
  return process.platform === "win32" ? resolved.toLowerCase() : resolved;
}

function hasCanonicalProfileSuffix(value) {
  return path.resolve(value).replace(/\\/g, "/").toLowerCase().endsWith(`/${PROJECT_PROFILE_REF}`);
}

function verifyProfileRefs(options = {}) {
  const {
    refs,
    baseDir = process.cwd(),
    projectProfilePath = null,
    userProfilePath = null,
    userProfileOptedIn = false,
  } = options;
  const errors = [];
  const receipts = [];
  if (Object.prototype.hasOwnProperty.call(options, "projectProfileText") || Object.prototype.hasOwnProperty.call(options, "userProfileText")) {
    errors.push("raw carrier text is not accepted for source binding; supply canonical carrier paths");
  }

  const projectRoot = path.resolve(baseDir);
  const expectedProjectPath = path.resolve(projectRoot, PROJECT_PROFILE_RELATIVE);
  const resolvedProjectPath = projectProfilePath ? path.resolve(projectProfilePath) : expectedProjectPath;
  const resolvedUserPath = userProfilePath ? path.resolve(userProfilePath) : null;
  if (projectProfilePath && comparablePath(resolvedProjectPath) !== comparablePath(expectedProjectPath)) {
    errors.push(`project profile path must be canonical under baseDir: ${PROJECT_PROFILE_REF}`);
  }
  if (resolvedUserPath && !hasCanonicalProfileSuffix(resolvedUserPath)) {
    errors.push(`user profile path must end with ${PROJECT_PROFILE_REF}`);
  }

  const carriers = { project: null, user: null };
  if (!errors.some((error) => error.startsWith("project profile path")) && fs.existsSync(resolvedProjectPath)) {
    carriers.project = readProfile(resolvedProjectPath);
  }
  if (resolvedUserPath && !errors.some((error) => error.startsWith("user profile path")) && fs.existsSync(resolvedUserPath)) {
    carriers.user = readProfile(resolvedUserPath);
  }
  for (const [kind, carrier] of Object.entries(carriers)) {
    if (carrier) for (const error of carrier.errors) errors.push(`${kind} profile: ${error}`);
  }

  for (const ref of Array.isArray(refs) ? refs.filter((item) => item && item.kind === "profile") : []) {
    const match = String(ref.ref || "").match(/^(\.ai\/knowledge\/collaboration-profile\.md|~\/\.ai\/knowledge\/collaboration-profile\.md)#([a-z0-9][a-z0-9._-]*)$/);
    if (!match) {
      errors.push(`profile ref is not canonical: ${ref.ref || "<missing>"}`);
      continue;
    }
    const carrierKind = match[1].startsWith("~/") ? "user" : "project";
    if (carrierKind === "user" && !userProfileOptedIn) {
      errors.push(`user profile ref requires explicit opt-in: ${ref.ref}`);
      continue;
    }
    const carrier = carriers[carrierKind];
    if (!carrier) {
      receipts.push({ ref: ref.ref, status: "NOT_RUN", reason: `${carrierKind} profile carrier was not supplied` });
      continue;
    }
    const entry = carrier.byId.get(match[2]);
    if (!entry || !entry.projectable) {
      errors.push(`profile ref does not resolve to a projectable entry: ${ref.ref}`);
      continue;
    }
    if (carrierKind === "project" && entry.fields.scope === "user") {
      errors.push(`project profile ref cannot resolve a user-scoped entry: ${ref.ref}`);
      continue;
    }
    if (carrierKind === "user" && entry.fields.scope !== "user") {
      errors.push(`user profile ref must resolve a user-scoped entry: ${ref.ref}`);
      continue;
    }
    if (ref.content_sha256 !== entry.content_sha256) {
      errors.push(`profile ref digest does not match canonical entry block: ${ref.ref}`);
      continue;
    }
    receipts.push({ ref: ref.ref, status: "PASS", content_sha256: entry.content_sha256 });
  }

  const status = errors.length > 0 ? "FAIL" : receipts.some((item) => item.status === "NOT_RUN") ? "NOT_RUN" : "PASS";
  return { status, errors, receipts, carriers };
}

function loadRefs(filePath) {
  const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
  return Array.isArray(value) ? value : value.injected_refs;
}

function runSelfTest() {
  const projectProfilePath = path.join(PROJECT_FIXTURE_ROOT, PROJECT_PROFILE_RELATIVE);
  const projectText = fs.readFileSync(projectProfilePath, "utf8");
  const userText = fs.readFileSync(USER_FIXTURE_PATH, "utf8");
  const parsed = parseProfile(projectText);
  const userParsed = parseProfile(userText);
  const first = parsed.byId.get("project-architecture-detail");
  const refs = [{
    kind: "profile",
    ref: `${PROJECT_PROFILE_REF}#project-architecture-detail`,
    content_sha256: first.content_sha256,
  }];
  const userRefs = [{
    kind: "profile",
    ref: `${USER_PROFILE_REF}#route-review-accept`,
    content_sha256: userParsed.byId.get("route-review-accept").content_sha256,
  }];
  const checks = [
    [parsed.errors.length === 0 && parsed.projectable.length === 2, "valid carrier parses two projectable entries"],
    [canonicalizeBlock(first.block.replace(/\n/g, "\r\n")) === first.block, "CRLF and LF canonicalize identically"],
    [verifyProfileRefs({ refs, baseDir: PROJECT_FIXTURE_ROOT }).status === "PASS", "real canonical carrier path binds canonical digest"],
    [verifyProfileRefs({ refs: [{ ...refs[0], content_sha256: sha256("forged caller block") }], baseDir: PROJECT_FIXTURE_ROOT }).status === "FAIL", "forged caller digest is rejected"],
    [verifyProfileRefs({ refs, projectProfileText: projectText }).status === "FAIL", "caller-supplied raw carrier text is rejected"],
    [verifyProfileRefs({ refs, baseDir: PROJECT_FIXTURE_ROOT, projectProfilePath: USER_FIXTURE_PATH }).status === "FAIL", "noncanonical project carrier path is rejected"],
    [verifyProfileRefs({ refs: userRefs, userProfilePath: USER_FIXTURE_PATH }).status === "FAIL", "user carrier requires opt-in"],
    [verifyProfileRefs({ refs: userRefs, userProfilePath: USER_FIXTURE_PATH, userProfileOptedIn: true }).status === "PASS", "opted-in canonical user carrier binds"],
    [hasUserProfileOptInAssumption([{ kind: "user_profile_opt_in", enabled: true, scope: "current_session", source_ref: "current-turn:user-profile-opt-in" }]), "structured current-session user opt-in assumption is recognized"],
    [!hasUserProfileOptInAssumption([{ kind: "user_profile_opt_in", enabled: true, scope: "persistent", source_ref: "current-turn:user-profile-opt-in" }]), "persistent or malformed user opt-in assumption is rejected"],
    [parseProfile(projectText.replace("last_fired: never", "last_fired: 2026-02-31")).errors.some((e) => e.includes("real calendar date")), "impossible date is rejected"],
    [parseProfile(projectText.replace("the task is an architecture decision in this project", "appropriate")).errors.some((e) => e.includes("generic or a placeholder")), "generic applies_when is rejected"],
    [parseProfile(`${projectText}\n### project-architecture-detail\n\n- id: project-architecture-detail\n`).errors.some((e) => e.includes("duplicate profile entry id")), "duplicate ids are rejected"],
    [parseProfile("### legacy-entry\n\n- applies_when: appropriate\n").errors.length === 0, "incomplete legacy entry stays readable and inactive"],
  ];
  const failures = checks.filter(([ok]) => !ok).map(([, label]) => label);
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  for (const [, label] of checks) console.log(`PASS ${label}`);
  return 0;
}

function parseArgs(argv) {
  const options = { selfTest: false, baseDir: process.cwd(), projectProfile: null, userProfile: null, userProfileOptedIn: false, refs: null };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--base-dir") options.baseDir = path.resolve(argv[++index]);
    else if (arg === "--project-profile") options.projectProfile = path.resolve(argv[++index]);
    else if (arg === "--user-profile") options.userProfile = path.resolve(argv[++index]);
    else if (arg === "--user-profile-opt-in") options.userProfileOptedIn = true;
    else if (arg === "--refs") options.refs = path.resolve(argv[++index]);
    else if (!arg.startsWith("-") && !options.projectProfile) options.projectProfile = path.resolve(arg);
    else throw new Error(`Unknown or incomplete argument: ${arg}`);
  }
  return options;
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    return 2;
  }
  if (options.selfTest) return runSelfTest();
  if (!options.projectProfile && !options.userProfile && !options.refs) {
    console.error("Usage: validate-profile.js --self-test | [--base-dir <project>] [--project-profile <canonical-path>] [--user-profile <path> --user-profile-opt-in] --refs <json> | --project-profile <path>");
    return 2;
  }
  if (options.userProfile && !options.userProfileOptedIn) {
    console.error("FAIL --user-profile requires --user-profile-opt-in");
    return 1;
  }
  try {
    const projectProfileText = options.projectProfile ? fs.readFileSync(options.projectProfile, "utf8") : undefined;
    const userProfileText = options.userProfile ? fs.readFileSync(options.userProfile, "utf8") : undefined;
    if (options.refs) {
      const result = verifyProfileRefs({
        refs: loadRefs(options.refs),
        baseDir: options.baseDir,
        projectProfilePath: options.projectProfile,
        userProfilePath: options.userProfile,
        userProfileOptedIn: options.userProfileOptedIn,
      });
      for (const error of result.errors) console.error(`FAIL ${error}`);
      console.log(`${result.status} profile source binding checked=${result.receipts.length}`);
      return result.status === "PASS" ? 0 : 1;
    }
    for (const [label, text] of [["project", projectProfileText], ["user", userProfileText]]) {
      if (text === undefined) continue;
      const result = parseProfile(text);
      for (const error of result.errors) console.error(`FAIL ${label} profile: ${error}`);
      console.log(`${result.errors.length === 0 ? "PASS" : "FAIL"} ${label} profile active_projectable=${result.projectable.length} complete_inactive=${result.inactive.length} legacy=${result.legacy.length}`);
      if (result.errors.length > 0) return 1;
    }
    return 0;
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = {
  REQUIRED_FIELDS,
  canonicalizeBlock,
  hasUserProfileOptInAssumption,
  isCalendarDate,
  isConcreteCondition,
  main,
  parseProfile,
  readProfile,
  runSelfTest,
  sha256,
  verifyProfileRefs,
};
