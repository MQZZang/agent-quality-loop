"use strict";

// Optional local control plane. AQL Core never imports this module and does
// not require a profile, CLI, user directory, or writable filesystem.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PROFILE_SCHEMA = "aql.collaboration-profile/v2";
const RECEIPT_SCHEMA = "aql.capability-receipt/v1";
const PROJECT_SCHEMA = "aql.project/v1";
const PROJECTION_RECEIPT_SCHEMA = "aql.profile-projection-receipt/v2";
const MIGRATION_BACKUP_ROOT_SCHEMA = "aql.migration-backup-root/v1";
const MIGRATION_BACKUP_SCHEMA = "aql.migration-backup/v1";
const KINDS = new Set(["communication", "interaction", "decision", "semantic_alias", "working_context"]);
const STATES = new Set(["candidate", "active", "superseded", "archived"]);
const SCOPE_LEVELS = new Set(["global", "domain", "task_class", "project"]);
const PROVENANCE_TYPES = new Set(["explicit_memory_command", "explicit_confirmation", "migration"]);
const CONFIRM_ONLY_KINDS = new Set(["decision", "semantic_alias", "working_context"]);
const CAPABILITY_IDS = [
  "skill_arguments",
  "fresh_context",
  "subagents",
  "hooks",
  "profile_access",
  "tool_receipts",
  "filesystem_write",
  "external_action_gate",
  "local_scripts",
];
const CAPABILITY_STATUSES = new Set(["observed_true", "observed_false", "not_run"]);
const CAPABILITY_SOURCE_KINDS = new Set([
  "actual_call",
  "explicit_config",
  "host_api",
  "installer_receipt",
  "local_probe",
]);
const LOCK_STALE_MS = 5 * 60 * 1000;

function defaultProfilePath(environment = process.env) {
  return environment.AQL_HOME
    ? path.resolve(environment.AQL_HOME, "profile.json")
    : path.resolve(os.homedir(), ".aql", "profile.json");
}

function now() { return new Date().toISOString(); }
function today() { return now().slice(0, 10); }
function deepCopy(value) { return JSON.parse(JSON.stringify(value)); }
function isObject(value) { return value !== null && typeof value === "object" && !Array.isArray(value); }
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RFC3339_RE = /^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-](\d{2}):(\d{2}))$/;
function isDateTime(value) {
  if (typeof value !== "string") return false;
  const match = RFC3339_RE.exec(value);
  if (!match || !isDate(match[1])) return false;
  const [, , hour, minute, second, offsetHour, offsetMinute] = match;
  if (Number(hour) > 23 || Number(minute) > 59 || Number(second) > 59) return false;
  if (offsetHour !== undefined && (Number(offsetHour) > 23 || Number(offsetMinute) > 59)) return false;
  return Number.isFinite(Date.parse(value));
}
function isDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
function canonical(value) { return `${JSON.stringify(value, null, 2)}\n`; }
function error(message, code = "EAQL") { const result = new Error(message); result.code = code; return result; }
function sha256(value) { return crypto.createHash("sha256").update(value).digest("hex"); }
function fsyncDirectory(directory) {
  try { const fd = fs.openSync(directory, "r"); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); } } catch { /* unavailable on some hosts */ }
}
function writeExclusiveDurable(filePath, contents) {
  const fd = fs.openSync(filePath, "wx", 0o600);
  try { fs.writeFileSync(fd, contents); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
}
function comparablePath(value) { const resolved = path.resolve(value); return process.platform === "win32" ? resolved.toLowerCase() : resolved; }

function newProfile(date = now()) {
  return {
    schema: PROFILE_SCHEMA,
    profile_id: crypto.randomUUID(),
    subject: "self",
    revision: 0,
    memory_policy: "explicit_only",
    enabled: false,
    paused: false,
    created_at: date,
    updated_at: date,
    entries: [],
    archived_entries: [],
  };
}

function validateScope(scope, label, errors) {
  if (!isObject(scope)) { errors.push(`${label}.scope must be an object`); return; }
  for (const key of Object.keys(scope)) if (!new Set(["level", "id"]).has(key)) errors.push(`${label}.scope has unknown field ${key}`);
  if (!SCOPE_LEVELS.has(scope.level)) errors.push(`${label}.scope.level is invalid`);
  if (scope.level === "global" && scope.id !== undefined) errors.push(`${label}.scope.id is forbidden for global scope`);
  if (scope.level !== "global" && (typeof scope.id !== "string" || !scope.id.trim() || scope.id.length > 128)) {
    errors.push(`${label}.scope.id is required outside global scope`);
  }
}

function validateProvenance(provenance, label, errors) {
  if (!isObject(provenance)) { errors.push(`${label}.provenance must be an object`); return; }
  for (const key of Object.keys(provenance)) if (!new Set(["type", "refs"]).has(key)) errors.push(`${label}.provenance has unknown field ${key}`);
  if (!PROVENANCE_TYPES.has(provenance.type)) errors.push(`${label}.provenance.type is invalid`);
  if (!Array.isArray(provenance.refs) || provenance.refs.length === 0 || provenance.refs.length > 8) {
    errors.push(`${label}.provenance.refs must contain 1-8 references`);
  } else {
    provenance.refs.forEach((ref, index) => {
      if (typeof ref !== "string" || !ref.trim() || ref.length > 256) errors.push(`${label}.provenance.refs[${index}] is invalid`);
    });
  }
}

function validateEntry(entry, label, errors, archived) {
  if (!isObject(entry)) { errors.push(`${label} must be an object`); return; }
  const allowed = new Set([
    "id", "revision", "preference_key", "kind", "value", "scope", "applies_when", "suppress_when",
    "provenance", "state", "valid_from", "review_after", "valid_until", "supersedes", "created_at", "updated_at",
  ]);
  for (const key of Object.keys(entry)) if (!allowed.has(key)) errors.push(`${label} has unknown field ${key}`);
  if (typeof entry.id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.id)) errors.push(`${label}.id is invalid`);
  if (!Number.isInteger(entry.revision) || entry.revision < 1) errors.push(`${label}.revision must be a positive integer`);
  if (typeof entry.preference_key !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.preference_key)) errors.push(`${label}.preference_key is invalid`);
  if (!KINDS.has(entry.kind)) errors.push(`${label}.kind is invalid`);
  if (!Object.prototype.hasOwnProperty.call(entry, "value")) errors.push(`${label}.value is required`);
  validateScope(entry.scope, label, errors);
  if (typeof entry.applies_when !== "string" || !entry.applies_when.trim() || entry.applies_when.length > 512) errors.push(`${label}.applies_when is invalid`);
  if (entry.suppress_when !== null && (typeof entry.suppress_when !== "string" || !entry.suppress_when.trim() || entry.suppress_when.length > 512)) errors.push(`${label}.suppress_when is invalid`);
  validateProvenance(entry.provenance, label, errors);
  if (!STATES.has(entry.state)) errors.push(`${label}.state is invalid`);
  if (!isDate(entry.valid_from)) errors.push(`${label}.valid_from is invalid`);
  if (entry.review_after !== null && !isDate(entry.review_after)) errors.push(`${label}.review_after is invalid`);
  if (entry.valid_until !== null && !isDate(entry.valid_until)) errors.push(`${label}.valid_until is invalid`);
  if (entry.supersedes !== null && (typeof entry.supersedes !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(entry.supersedes))) errors.push(`${label}.supersedes is invalid`);
  if (!isDateTime(entry.created_at) || !isDateTime(entry.updated_at)) errors.push(`${label} timestamps are invalid`);
  if (entry.kind === "working_context" && entry.review_after === null && entry.valid_until === null) errors.push(`${label}.working_context requires review_after or valid_until`);
  if (archived && entry.state !== "archived") errors.push(`${label} must have archived state`);
  if (!archived && entry.state === "archived") errors.push(`${label} must be placed in archived_entries`);
  if (entry.state === "active" && entry.provenance && entry.provenance.type === "migration") errors.push(`${label}.migration provenance cannot be active without confirmation`);
  if (entry.state === "candidate" && entry.provenance && !new Set(["explicit_memory_command", "migration"]).has(entry.provenance.type)) errors.push(`${label}.candidate requires explicit_memory_command or migration provenance`);
  if (CONFIRM_ONLY_KINDS.has(entry.kind) && entry.state === "active" && entry.provenance && entry.provenance.type !== "explicit_confirmation") errors.push(`${label}.${entry.kind} requires explicit_confirmation to become active`);
}

function validateProfile(profile) {
  const errors = [];
  if (!isObject(profile)) return ["profile must be an object"];
  const allowed = new Set(["schema", "profile_id", "subject", "revision", "memory_policy", "enabled", "paused", "created_at", "updated_at", "entries", "archived_entries"]);
  for (const key of Object.keys(profile)) if (!allowed.has(key)) errors.push(`profile has unknown field ${key}`);
  if (profile.schema !== PROFILE_SCHEMA) errors.push(`schema must equal ${PROFILE_SCHEMA}`);
  if (typeof profile.profile_id !== "string" || !UUID_RE.test(profile.profile_id)) errors.push("profile_id must be an opaque UUID");
  if (profile.subject !== "self") errors.push("subject must equal self");
  if (!Number.isInteger(profile.revision) || profile.revision < 0) errors.push("revision must be a non-negative integer");
  if (profile.memory_policy !== "explicit_only") errors.push("memory_policy must equal explicit_only");
  if (typeof profile.enabled !== "boolean" || typeof profile.paused !== "boolean") errors.push("enabled and paused must be boolean");
  if (!isDateTime(profile.created_at) || !isDateTime(profile.updated_at)) errors.push("profile timestamps are invalid");
  if (!Array.isArray(profile.entries) || !Array.isArray(profile.archived_entries)) errors.push("entries and archived_entries must be arrays");
  const ids = new Set();
  for (const [name, collection, archived] of [["entries", profile.entries, false], ["archived_entries", profile.archived_entries, true]]) {
    if (!Array.isArray(collection)) continue;
    collection.forEach((entry, index) => {
      validateEntry(entry, `${name}[${index}]`, errors, archived);
      if (entry && typeof entry.id === "string") {
        if (ids.has(entry.id)) errors.push(`duplicate entry id ${entry.id}`);
        ids.add(entry.id);
      }
    });
  }
  for (const entry of Array.isArray(profile.entries) ? profile.entries : []) if (entry.supersedes && !ids.has(entry.supersedes)) errors.push(`entry ${entry.id} supersedes missing entry ${entry.supersedes}`);
  return errors;
}

function assertValidProfile(profile) {
  const errors = validateProfile(profile);
  if (errors.length) throw error(`profile schema validation failed: ${errors.join("; ")}`, "ESCHEMA");
}
function exists(filePath) { try { fs.lstatSync(filePath); return true; } catch (cause) { if (cause.code === "ENOENT") return false; throw cause; } }
function assertPlainPath(filePath, label) {
  if (!exists(filePath)) return;
  if (fs.lstatSync(filePath).isSymbolicLink()) throw error(`${label} must not be a symlink: ${filePath}`, "ELOOP");
}
function directoryIdentity(directory, label) {
  assertPlainPath(directory, label);
  const stat = fs.statSync(directory);
  if (!stat.isDirectory()) throw error(`${label} is not a directory: ${directory}`, "EOWNERSHIP");
  return { realpath: comparablePath(fs.realpathSync(directory)), dev: String(stat.dev), ino: String(stat.ino) };
}
function sameDirectoryIdentity(left, right) {
  return left.realpath === right.realpath && left.dev === right.dev && left.ino === right.ino;
}
function readProfile(profilePath) {
  assertPlainPath(profilePath, "profile");
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(profilePath, "utf8")); }
  catch (cause) { throw error(`cannot read profile ${profilePath}: ${cause.message}`, cause.code || "EREAD"); }
  assertValidProfile(parsed);
  return parsed;
}

function lockPathFor(profilePath) { return `${profilePath}.aql-lock`; }
function backupPathFor(profilePath) { return `${profilePath}.aql-backup`; }
function processAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try { process.kill(pid, 0); return true; } catch (cause) { return cause.code === "EPERM"; }
}
function readLock(lockPath) { try { return JSON.parse(fs.readFileSync(path.join(lockPath, "owner.json"), "utf8")); } catch { return null; } }
function staleLock(lockPath) {
  const owner = readLock(lockPath);
  const parsed = owner && typeof owner.created_at === "string" ? Date.parse(owner.created_at) : Number.NaN;
  const fallback = fs.statSync(lockPath).mtimeMs;
  const age = Date.now() - (Number.isFinite(parsed) ? parsed : fallback);
  return age > LOCK_STALE_MS && (!owner || !processAlive(owner.pid));
}
function acquireLock(profilePath) {
  const lockPath = lockPathFor(profilePath);
  fs.mkdirSync(path.dirname(profilePath), { recursive: true, mode: 0o700 });
  assertPlainPath(lockPath, "profile lock");
  try { fs.mkdirSync(lockPath, { mode: 0o700 }); }
  catch (cause) {
    if (cause.code !== "EEXIST") throw cause;
    if (!staleLock(lockPath)) throw error(`profile is locked by another process: ${lockPath}`, "ELOCKED");
    assertPlainPath(lockPath, "stale profile lock");
    const quarantine = `${lockPath}.stale.${process.pid}.${crypto.randomBytes(4).toString("hex")}`;
    try { fs.renameSync(lockPath, quarantine); }
    catch (renameCause) {
      if (renameCause.code === "ENOENT" || renameCause.code === "EEXIST") throw error(`profile is locked by another process: ${lockPath}`, "ELOCKED");
      throw renameCause;
    }
    try { fs.rmSync(quarantine, { recursive: true, force: false, maxRetries: 1 }); } catch { /* recoverable quarantine */ }
    try { fs.mkdirSync(lockPath, { mode: 0o700 }); }
    catch (mkdirCause) { if (mkdirCause.code === "EEXIST") throw error(`profile is locked by another process: ${lockPath}`, "ELOCKED"); throw mkdirCause; }
  }
  fs.writeFileSync(path.join(lockPath, "owner.json"), canonical({ pid: process.pid, created_at: now() }), { encoding: "utf8", mode: 0o600, flag: "wx" });
  return lockPath;
}
function releaseLock(lockPath) { try { fs.rmSync(lockPath, { recursive: true, force: true, maxRetries: 1 }); } catch { /* stale recovery handles leftovers */ } }
function withLock(profilePath, operation) { const lockPath = acquireLock(profilePath); try { return operation(); } finally { releaseLock(lockPath); } }

function atomicReplace(filePath, contents, afterFsync) {
  const directory = path.dirname(filePath);
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  assertPlainPath(filePath, "atomic replace target");
  const temporary = path.join(directory, `.aql-profile.${process.pid}.${Date.now()}.${crypto.randomBytes(6).toString("hex")}.tmp`);
  const fd = fs.openSync(temporary, "wx", 0o600);
  try {
    fs.writeFileSync(fd, contents, "utf8");
    fs.fsyncSync(fd);
    if (afterFsync) afterFsync(temporary);
  } catch (cause) {
    try { fs.closeSync(fd); } catch { /* already closed */ }
    try { fs.unlinkSync(temporary); } catch { /* best effort */ }
    throw cause;
  }
  fs.closeSync(fd);
  try {
    fs.renameSync(temporary, filePath);
    fsyncDirectory(directory);
  } catch (cause) {
    try { fs.unlinkSync(temporary); } catch { /* best effort */ }
    throw cause;
  }
}
function writeBackup(profilePath) {
  if (!exists(profilePath)) return;
  const current = readProfile(profilePath);
  const backupPath = backupPathFor(profilePath);
  if (exists(backupPath)) {
    assertPlainPath(backupPath, "AQL profile backup");
    if (!fs.lstatSync(backupPath).isFile()) throw error(`AQL profile backup is not a regular file: ${backupPath}`, "EOWNERSHIP");
    let previous;
    try { previous = readProfile(backupPath); }
    catch (cause) { throw error(`existing AQL profile backup ownership cannot be proven: ${cause.message}`, "EOWNERSHIP"); }
    if (previous.profile_id !== current.profile_id) throw error("existing AQL profile backup belongs to another Profile", "EOWNERSHIP");
  }
  atomicReplace(backupPath, canonical(current));
}
function corruptArchivePathFor(profilePath) {
  return `${profilePath}.aql-corrupt.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.json`;
}
function createProfile(profilePath) {
  return withLock(profilePath, () => {
    if (exists(profilePath)) throw error(`profile already exists: ${profilePath}`, "EEXISTS");
    const profile = newProfile();
    assertValidProfile(profile);
    atomicReplace(profilePath, canonical(profile));
    return profile;
  });
}
function mutateProfile(profilePath, mutate, expectedRevision, options = {}) {
  const baseline = readProfile(profilePath);
  if (expectedRevision !== undefined && expectedRevision !== baseline.revision) throw error(`expected revision ${expectedRevision}, found ${baseline.revision}`, "ECAS");
  return withLock(profilePath, () => {
    const current = readProfile(profilePath);
    if (current.revision !== baseline.revision) throw error(`profile changed concurrently (expected revision ${baseline.revision}, found ${current.revision})`, "ECAS");
    const next = deepCopy(current);
    mutate(next, current);
    next.revision = current.revision + 1;
    next.updated_at = now();
    assertValidProfile(next);
    if (options.beforeWrite) options.beforeWrite();
    if (options.backup !== false) writeBackup(profilePath);
    atomicReplace(profilePath, canonical(next), options.afterFsync);
    if (options.afterWrite) {
      try { options.afterWrite(next, current); }
      catch (cause) {
        try { atomicReplace(profilePath, canonical(current)); }
        catch (rollbackCause) { throw error(`${cause.message}; profile rollback failed: ${rollbackCause.message}`, cause.code || "EIO"); }
        throw cause;
      }
    }
    return next;
  });
}

function restoreProfile(profilePath, expectedRevision, options = {}) {
  const backupPath = options.backupPath || backupPathFor(profilePath);
  if (path.resolve(backupPath) === path.resolve(profilePath)) throw error("backup path must differ from profile path", "EINVAL");
  return withLock(profilePath, () => {
    if (!exists(backupPath)) throw error(`profile backup does not exist: ${backupPath}`, "ENOENT");
    const backup = readProfile(backupPath);
    let primary = null;
    let primaryError = null;
    if (exists(profilePath)) {
      assertPlainPath(profilePath, "profile");
      try { primary = readProfile(profilePath); } catch (cause) { primaryError = cause; }
    }
    if (primary) {
      if (expectedRevision === undefined) throw error("restoring over a valid profile requires --expected-revision", "ECAS");
      if (primary.revision !== expectedRevision) throw error(`expected revision ${expectedRevision}, found ${primary.revision}`, "ECAS");
    } else if (expectedRevision !== undefined && primaryError === null) {
      throw error("expected revision cannot be checked because the primary profile is absent", "ECAS");
    }
    const restored = deepCopy(backup);
    restored.revision = primary ? primary.revision + 1 : backup.revision + 1;
    restored.updated_at = now();
    assertValidProfile(restored);
    let archivedPrimary = null;
    if (primaryError) {
      archivedPrimary = corruptArchivePathFor(profilePath);
      fs.renameSync(profilePath, archivedPrimary);
    }
    try { atomicReplace(profilePath, canonical(restored)); }
    catch (cause) {
      if (archivedPrimary && !exists(profilePath)) {
        try { fs.renameSync(archivedPrimary, profilePath); } catch { /* quarantine remains recoverable */ }
      }
      throw cause;
    }
    return { profile: restored, backup_path: backupPath, archived_primary: archivedPrimary };
  });
}

function findEntry(profile, id) {
  const index = profile.entries.findIndex((entry) => entry.id === id);
  if (index < 0) throw error(`profile entry not found: ${id}`, "ENOENT");
  return index;
}
function normalizeEntryInput(input, state, provenance) {
  if (!isObject(input)) throw error("entry input must be an object", "EINVAL");
  const timestamp = now();
  const entry = {
    id: input.id, revision: 1, preference_key: input.preference_key, kind: input.kind, value: input.value,
    scope: input.scope || { level: "global" }, applies_when: input.applies_when,
    suppress_when: input.suppress_when === undefined ? null : input.suppress_when, provenance, state,
    valid_from: input.valid_from || today(), review_after: input.review_after === undefined ? null : input.review_after,
    valid_until: input.valid_until === undefined ? null : input.valid_until,
    supersedes: input.supersedes === undefined ? null : input.supersedes, created_at: timestamp, updated_at: timestamp,
  };
  const errors = [];
  validateEntry(entry, "entry", errors, false);
  if (errors.length) throw error(`entry validation failed: ${errors.join("; ")}`, "ESCHEMA");
  return entry;
}
function remember(profilePath, input, reference, expectedRevision, confirmed = false) {
  if (!reference) throw error("remember requires an explicit memory reference", "EINVAL");
  const provenance = { type: confirmed ? "explicit_confirmation" : "explicit_memory_command", refs: [reference] };
  if (CONFIRM_ONLY_KINDS.has(input.kind) && !confirmed) throw error(`${input.kind} requires explicit confirmation`, "ECONFIRM");
  if (input.scope && input.scope.level === "project" && !confirmed) throw error("project-scoped preference save requires explicit confirmation", "ECONFIRM");
  const entry = normalizeEntryInput(input, "active", provenance);
  return mutateProfile(profilePath, (profile) => {
    if (profile.entries.some((candidate) => candidate.id === entry.id) || profile.archived_entries.some((candidate) => candidate.id === entry.id)) throw error(`duplicate entry id ${entry.id}`, "EEXISTS");
    if (entry.supersedes) {
      const prior = profile.entries[findEntry(profile, entry.supersedes)];
      prior.state = "superseded"; prior.revision += 1; prior.updated_at = now();
    }
    profile.entries.push(entry);
  }, expectedRevision);
}
function propose(profilePath, input, reference, expectedRevision) {
  if (!reference) throw error("propose requires an explicit user reference", "EINVAL");
  const entry = normalizeEntryInput(input, "candidate", { type: "explicit_memory_command", refs: [reference] });
  if (entry.scope.level === "project") throw error("project-scoped preference requires confirmation before save", "ECONFIRM");
  return mutateProfile(profilePath, (profile) => {
    if (profile.entries.some((candidate) => candidate.id === entry.id) || profile.archived_entries.some((candidate) => candidate.id === entry.id)) throw error(`duplicate entry id ${entry.id}`, "EEXISTS");
    profile.entries.push(entry);
  }, expectedRevision);
}
function confirm(profilePath, id, reference, expectedRevision) {
  if (!reference) throw error("confirm requires an explicit confirmation reference", "EINVAL");
  return mutateProfile(profilePath, (profile) => {
    const entry = profile.entries[findEntry(profile, id)];
    if (entry.state !== "candidate") throw error(`only candidate entries can be confirmed: ${id}`, "EINVAL");
    entry.state = "active";
    entry.provenance = { type: "explicit_confirmation", refs: [...entry.provenance.refs, reference].slice(-8) };
    entry.revision += 1; entry.updated_at = now();
    if (entry.supersedes) {
      const prior = profile.entries[findEntry(profile, entry.supersedes)];
      prior.state = "superseded"; prior.revision += 1; prior.updated_at = now();
    }
  }, expectedRevision);
}
function edit(profilePath, id, patch, expectedRevision, reference, confirmed = false) {
  if (!reference) throw error("edit requires an explicit memory reference", "EINVAL");
  return mutateProfile(profilePath, (profile) => {
    const entry = profile.entries[findEntry(profile, id)];
    if (entry.state === "superseded") throw error("superseded entries are immutable; create a replacement", "EINVAL");
    const allowed = new Set(["preference_key", "kind", "value", "scope", "applies_when", "suppress_when", "valid_from", "review_after", "valid_until"]);
    for (const key of Object.keys(patch)) {
      if (!allowed.has(key)) throw error(`edit field is not allowed: ${key}`, "EINVAL");
      entry[key] = deepCopy(patch[key]);
    }
    if (CONFIRM_ONLY_KINDS.has(entry.kind) && !confirmed) throw error(`${entry.kind} edit requires explicit confirmation`, "ECONFIRM");
    if (entry.scope.level === "project" && !confirmed) throw error("project-scoped preference edit requires explicit confirmation", "ECONFIRM");
    entry.provenance = { type: confirmed ? "explicit_confirmation" : "explicit_memory_command", refs: [reference] };
    entry.revision += 1; entry.updated_at = now();
  }, expectedRevision);
}
function archive(profilePath, id, expectedRevision) {
  return mutateProfile(profilePath, (profile) => {
    const index = findEntry(profile, id);
    const [entry] = profile.entries.splice(index, 1);
    entry.state = "archived"; entry.revision += 1; entry.updated_at = now();
    profile.archived_entries.push(entry);
  }, expectedRevision);
}

function migrationBackupRootFor(profilePath) { return `${path.resolve(profilePath)}.aql-migration-backups`; }
function migrationBackupMarkerFor(profilePath) { return path.join(migrationBackupRootFor(profilePath), ".aql-owned.json"); }
function validateMigrationBackupMarker(marker, profileId) {
  if (!isObject(marker) || marker.schema !== MIGRATION_BACKUP_ROOT_SCHEMA || marker.profile_id !== profileId || Object.keys(marker).some((key) => !new Set(["schema", "profile_id"]).has(key))) {
    throw error("migration backup root ownership does not match the profile", "EOWNERSHIP");
  }
}
function ensureMigrationBackupRoot(profilePath, profileId) {
  const root = migrationBackupRootFor(profilePath);
  const markerPath = migrationBackupMarkerFor(profilePath);
  let created = false;
  if (!exists(root)) {
    const parent = path.dirname(root);
    fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
    const staging = `${root}.creating.${process.pid}.${crypto.randomBytes(6).toString("hex")}`;
    fs.mkdirSync(staging, { mode: 0o700 });
    try {
      writeExclusiveDurable(path.join(staging, ".aql-owned.json"), canonical({ schema: MIGRATION_BACKUP_ROOT_SCHEMA, profile_id: profileId }));
      fsyncDirectory(staging);
      try { fs.renameSync(staging, root); created = true; fsyncDirectory(parent); }
      catch (cause) {
        if (!exists(root)) throw cause;
        fs.rmSync(staging, { recursive: true, force: false, maxRetries: 1 });
      }
    } catch (cause) {
      try { if (exists(staging)) fs.rmSync(staging, { recursive: true, force: false, maxRetries: 1 }); } catch { /* preserve the original failure */ }
      throw cause;
    }
  }
  try {
    const before = directoryIdentity(root, "migration backup root");
    assertPlainPath(markerPath, "migration backup ownership marker");
    if (!exists(markerPath) || !fs.lstatSync(markerPath).isFile()) throw error(`migration backup ownership marker is missing: ${markerPath}`, "EOWNERSHIP");
    validateMigrationBackupMarker(JSON.parse(fs.readFileSync(markerPath, "utf8")), profileId);
    const after = directoryIdentity(root, "migration backup root");
    if (!sameDirectoryIdentity(before, after)) throw error("migration backup root changed while ownership was checked", "ELOOP");
    return root;
  } catch (cause) {
    if (created) {
      try { if (exists(markerPath)) fs.rmSync(markerPath, { force: false }); } catch { /* preserve the original failure */ }
      try { fs.rmdirSync(root); } catch { /* preserve evidence for manual recovery */ }
    }
    throw cause;
  }
}
function validateMigrationBackupMetadata(metadata, profileId, recordId) {
  const allowed = new Set(["schema", "profile_id", "record_id", "created_at", "backup_file", "backup_sha256", "backup_size", "entry_ids"]);
  if (!isObject(metadata) || metadata.schema !== MIGRATION_BACKUP_SCHEMA || metadata.profile_id !== profileId || metadata.record_id !== recordId || Object.keys(metadata).some((key) => !allowed.has(key))) {
    throw error(`invalid migration backup metadata for ${recordId}`, "EDRIFT");
  }
  if (!isDateTime(metadata.created_at) || typeof metadata.backup_file !== "string" || path.basename(metadata.backup_file) !== metadata.backup_file || !metadata.backup_file.includes(".2.8.backup")) {
    throw error(`invalid migration backup identity for ${recordId}`, "EDRIFT");
  }
  if (typeof metadata.backup_sha256 !== "string" || !/^[0-9a-f]{64}$/.test(metadata.backup_sha256) || !Number.isSafeInteger(metadata.backup_size) || metadata.backup_size < 0) {
    throw error(`invalid migration backup digest for ${recordId}`, "EDRIFT");
  }
  if (!Array.isArray(metadata.entry_ids) || new Set(metadata.entry_ids).size !== metadata.entry_ids.length || metadata.entry_ids.some((id) => typeof id !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id))) {
    throw error(`invalid migration backup entry ids for ${recordId}`, "EDRIFT");
  }
}
function readMigrationBackupRecords(profilePath, profileId) {
  const root = migrationBackupRootFor(profilePath);
  if (!exists(root)) return [];
  ensureMigrationBackupRoot(profilePath, profileId);
  const records = [];
  for (const name of fs.readdirSync(root)) {
    if (name === ".aql-owned.json") continue;
    const match = /^record-([0-9a-f-]{36})$/i.exec(name);
    if (!match || !UUID_RE.test(match[1])) throw error(`unexpected entry in migration backup root: ${name}`, "EDRIFT");
    const directory = path.join(root, name);
    assertPlainPath(directory, "migration backup record");
    if (!fs.lstatSync(directory).isDirectory()) throw error(`migration backup record is not a directory: ${directory}`, "EDRIFT");
    const metadataPath = path.join(directory, "metadata.json");
    assertPlainPath(metadataPath, "migration backup metadata");
    if (!exists(metadataPath) || !fs.lstatSync(metadataPath).isFile()) throw error(`migration backup metadata is missing: ${metadataPath}`, "EDRIFT");
    let metadata;
    try { metadata = JSON.parse(fs.readFileSync(metadataPath, "utf8")); }
    catch (cause) { throw error(`cannot read migration backup metadata ${metadataPath}: ${cause.message}`, "EDRIFT"); }
    validateMigrationBackupMetadata(metadata, profileId, match[1]);
    const backupPath = path.join(directory, metadata.backup_file);
    const names = fs.readdirSync(directory).sort();
    if (names.join("\0") !== ["metadata.json", metadata.backup_file].sort().join("\0")) throw error(`migration backup record inventory drift: ${directory}`, "EDRIFT");
    assertPlainPath(backupPath, "migration backup");
    if (!exists(backupPath) || !fs.lstatSync(backupPath).isFile()) throw error(`migration backup is missing: ${backupPath}`, "EDRIFT");
    const body = fs.readFileSync(backupPath);
    if (body.length !== metadata.backup_size || sha256(body) !== metadata.backup_sha256) throw error(`migration backup content drift: ${backupPath}`, "EDRIFT");
    records.push({ directory, backupPath, metadata });
  }
  return records;
}
function pruneEmptyMigrationBackupRoot(profilePath, profileId) {
  const root = migrationBackupRootFor(profilePath);
  if (!exists(root)) return;
  ensureMigrationBackupRoot(profilePath, profileId);
  if (fs.readdirSync(root).some((name) => name !== ".aql-owned.json")) return;
  fs.rmSync(migrationBackupMarkerFor(profilePath), { force: false });
  fs.rmdirSync(root);
}
function removeMigrationBackupRecord(profilePath, profileId, record) {
  const root = migrationBackupRootFor(profilePath);
  if (comparablePath(path.dirname(record.directory)) !== comparablePath(root) || !/^record-[0-9a-f-]{36}$/i.test(path.basename(record.directory))) throw error("migration backup record escapes its owned root", "EOWNERSHIP");
  fs.rmSync(record.directory, { recursive: true, force: false, maxRetries: 1 });
  pruneEmptyMigrationBackupRoot(profilePath, profileId);
}
function cleanMigrationBackups(profilePath, profileId, ids, all = false) {
  const wanted = new Set(ids);
  const records = readMigrationBackupRecords(profilePath, profileId);
  const selected = records.filter((record) => all || record.metadata.entry_ids.some((id) => wanted.has(id)));
  for (const record of selected) removeMigrationBackupRecord(profilePath, profileId, record);
  return selected.map((record) => record.backupPath);
}
function inspectManagedArtifacts(profilePath, profileId) {
  const directory = path.dirname(profilePath);
  if (!exists(directory)) return [];
  const targets = [];
  const backupPath = backupPathFor(profilePath);
  if (exists(backupPath)) {
    assertPlainPath(backupPath, "AQL profile backup");
    if (!fs.lstatSync(backupPath).isFile()) throw error(`AQL profile backup is not a regular file: ${backupPath}`, "EOWNERSHIP");
    let backup;
    try { backup = readProfile(backupPath); }
    catch (cause) { throw error(`AQL profile backup ownership cannot be proven: ${cause.message}`, "EOWNERSHIP"); }
    if (backup.profile_id !== profileId) throw error("AQL profile backup belongs to another Profile", "EOWNERSHIP");
    targets.push(backupPath);
  }
  const profileName = path.basename(profilePath);
  const normalizedProfileName = process.platform === "win32" ? profileName.toLowerCase() : profileName;
  const corruptPrefix = `${normalizedProfileName}.aql-corrupt.`;
  for (const name of fs.readdirSync(directory)) {
    const normalizedName = process.platform === "win32" ? name.toLowerCase() : name;
    if (comparablePath(path.join(directory, name)) === comparablePath(backupPath)) continue;
    const corruptSuffix = normalizedName.startsWith(corruptPrefix) ? normalizedName.slice(corruptPrefix.length) : "";
    const managed = /^\d+\.[0-9a-f]{8}\.json$/.test(corruptSuffix) || /^\.aql-profile\.\d+\.\d+\.[0-9a-f]{12}\.tmp$/i.test(name);
    if (!managed) continue;
    const target = path.join(directory, name);
    assertPlainPath(target, "AQL-managed artifact");
    if (!fs.lstatSync(target).isFile()) throw error(`AQL-managed artifact is not a regular file: ${target}`, "EOWNERSHIP");
    targets.push(target);
  }
  return targets;
}
function cleanManagedArtifacts(profilePath, profileId) {
  const targets = inspectManagedArtifacts(profilePath, profileId);
  for (const target of targets) fs.rmSync(target, { force: false });
  return targets;
}
function isOwnedProjectionReceipt(value, profileId) {
  const fields = ["schema", "profile_id", "profile_revision", "selected", "suppressed", "conflicts", "deviations"];
  return isObject(value) && value.schema === PROJECTION_RECEIPT_SCHEMA && value.profile_id === profileId
    && fields.every((field) => Object.prototype.hasOwnProperty.call(value, field))
    && Object.keys(value).every((field) => fields.includes(field)) && Array.isArray(value.selected);
}
function inspectReceiptReferences(profilePath, profileId, ids, all = false) {
  const receiptDirectory = path.join(path.dirname(profilePath), "receipts");
  if (!exists(receiptDirectory)) return [];
  assertPlainPath(receiptDirectory, "receipt directory");
  if (!fs.lstatSync(receiptDirectory).isDirectory()) throw error(`receipt directory is not a directory: ${receiptDirectory}`, "EOWNERSHIP");
  const targets = [];
  const wanted = new Set(ids);
  for (const name of fs.readdirSync(receiptDirectory)) {
    if (!name.endsWith(".json")) continue;
    const target = path.join(receiptDirectory, name);
    assertPlainPath(target, "receipt");
    if (!fs.lstatSync(target).isFile()) throw error(`receipt is not a regular file: ${target}`, "EOWNERSHIP");
    let receipt;
    try { receipt = JSON.parse(fs.readFileSync(target, "utf8")); } catch { continue; }
    if (!isOwnedProjectionReceipt(receipt, profileId) || (!all && !receipt.selected.some((entry) => isObject(entry) && wanted.has(entry.id)))) continue;
    targets.push(target);
  }
  return targets;
}
function purgeReceiptReferences(profilePath, profileId, ids, all = false) {
  const targets = inspectReceiptReferences(profilePath, profileId, ids, all);
  for (const target of targets) fs.rmSync(target, { force: false });
  return targets.map((target) => path.basename(target));
}
function forget(profilePath, ids, expectedRevision, options = {}) {
  const list = Array.isArray(ids) ? ids : [ids];
  if ((!list.length && !options.all) || list.some((id) => typeof id !== "string" || !id)) throw error("forget requires at least one entry id or all=true", "EINVAL");
  let profileId;
  let removedIds = [];
  const result = mutateProfile(profilePath, (profile) => {
    profileId = profile.profile_id;
    const known = new Set([...profile.entries, ...profile.archived_entries].map((entry) => entry.id));
    removedIds = options.all ? [...known] : list;
    for (const id of removedIds) if (!known.has(id)) throw error(`profile entry not found: ${id}`, "ENOENT");
    const removed = new Set(removedIds);
    profile.entries = profile.entries.filter((entry) => !removed.has(entry.id));
    profile.archived_entries = profile.archived_entries.filter((entry) => !removed.has(entry.id));
    for (const entry of profile.entries) if (entry.supersedes && removed.has(entry.supersedes)) entry.supersedes = null;
  }, expectedRevision, {
    backup: false,
    afterFsync: options.afterFsync,
    beforeWrite: () => {
      const wanted = new Set(removedIds);
      readMigrationBackupRecords(profilePath, profileId).filter((record) => options.all || record.metadata.entry_ids.some((id) => wanted.has(id)));
      inspectManagedArtifacts(profilePath, profileId);
      if (options.purgeReceipts) inspectReceiptReferences(profilePath, profileId, removedIds, Boolean(options.all));
    },
    afterWrite: () => {
      cleanMigrationBackups(profilePath, profileId, removedIds, Boolean(options.all));
      cleanManagedArtifacts(profilePath, profileId);
      if (options.purgeReceipts) purgeReceiptReferences(profilePath, profileId, removedIds, Boolean(options.all));
    },
  });
  return result;
}
function setFlag(profilePath, field, value, expectedRevision) {
  if (!new Set(["enabled", "paused"]).has(field)) throw error(`unsupported profile flag ${field}`, "EINVAL");
  return mutateProfile(profilePath, (profile) => { profile[field] = value; }, expectedRevision);
}

function isPathWithin(base, candidate) {
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}
function guardProjectIdentityPath(projectRoot, target) {
  const absoluteRoot = path.resolve(projectRoot);
  if (!exists(absoluteRoot) || !fs.statSync(absoluteRoot).isDirectory()) throw error(`project root must be an existing directory: ${absoluteRoot}`, "EINVAL");
  const resolvedRoot = fs.realpathSync(absoluteRoot);
  for (const candidate of [path.dirname(target), target]) {
    if (!exists(candidate)) continue;
    if (!isPathWithin(resolvedRoot, fs.realpathSync(candidate))) throw error(`project identity path escapes project root: ${candidate}`, "ELOOP");
  }
}
function projectPathFor(projectRoot) { return path.join(path.resolve(projectRoot), ".aql", "project.json"); }
function ensureProjectIdentityWithStatus(projectRoot, confirmed) {
  const target = projectPathFor(projectRoot);
  guardProjectIdentityPath(projectRoot, target);
  if (exists(target)) {
    assertPlainPath(target, "project identity");
    const parsed = JSON.parse(fs.readFileSync(target, "utf8"));
    if (!isObject(parsed) || parsed.schema !== PROJECT_SCHEMA || typeof parsed.project_id !== "string" || !UUID_RE.test(parsed.project_id) || Object.keys(parsed).some((key) => !new Set(["schema", "project_id"]).has(key))) throw error(`invalid project identity: ${target}`, "ESCHEMA");
    return { identity: parsed, created: false };
  }
  if (!confirmed) throw error("creating .aql/project.json requires confirmed project-scoped preference creation", "ECONFIRM");
  const identity = { schema: PROJECT_SCHEMA, project_id: crypto.randomUUID() };
  const parent = path.dirname(target);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  guardProjectIdentityPath(projectRoot, target);
  const before = directoryIdentity(parent, "project identity directory");
  let created = false;
  try {
    writeExclusiveDurable(target, canonical(identity));
    created = true;
    guardProjectIdentityPath(projectRoot, target);
    const after = directoryIdentity(parent, "project identity directory");
    if (!sameDirectoryIdentity(before, after)) throw error("project identity directory changed during creation", "ELOOP");
    fsyncDirectory(parent);
    return { identity, created: true };
  } catch (cause) {
    if (created) {
      try {
        if (exists(target) && fs.lstatSync(target).isFile() && fs.readFileSync(target, "utf8") === canonical(identity)) fs.rmSync(target, { force: false });
      } catch { /* preserve the path-integrity failure */ }
    }
    if (cause.code !== "EEXIST") throw cause;
    return ensureProjectIdentityWithStatus(projectRoot, false);
  }
}
function ensureProjectIdentity(projectRoot, confirmed) { return ensureProjectIdentityWithStatus(projectRoot, confirmed).identity; }

function parseLegacyMarkdown(markdown) {
  const entries = [];
  let current = null;
  let fenced = false;
  for (const line of String(markdown).replace(/\r\n?/g, "\n").split("\n")) {
    if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
    if (fenced) continue;
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) { if (current) entries.push(current); current = { id: heading[1].trim() }; continue; }
    if (!current) continue;
    const field = line.match(/^\s*-\s+([A-Za-z0-9_-]+):\s*(.*?)\s*$/);
    if (field) current[field[1]] = field[2];
  }
  if (current) entries.push(current);
  return entries;
}
function legacyScope(raw, options, report, id) {
  const scope = String(raw || "").trim();
  if (scope === "project") {
    if (!options.projectId) { report.requires_project_binding.push({ id, reason: "project-scoped legacy content needs an explicitly confirmed opaque project_id" }); return null; }
    return { level: "project", id: options.projectId };
  }
  if (scope === "user" || scope === "global") return { level: "global" };
  const match = scope.match(/^(domain|task_class):(.+)$/);
  if (match) return { level: match[1], id: match[2].trim() };
  report.requires_confirmation.push({ id, reason: "legacy scope is absent or ambiguous" });
  return null;
}
function migrateLegacy(input, sourceName = "legacy", options = {}) {
  if (isObject(input) && input.schema === PROFILE_SCHEMA) {
    assertValidProfile(input);
    return { profile: deepCopy(input), report: { source_schema: PROFILE_SCHEMA, already_v2: true, source_unchanged: true, migrated: [], requires_confirmation: [], requires_project_binding: [], project_policy_candidates: [], unsupported: [], conflicts: [], dropped_fields: [] } };
  }
  const rawEntries = typeof input === "string" ? parseLegacyMarkdown(input) : (Array.isArray(input && input.entries) ? input.entries : []);
  const profile = newProfile();
  const report = { source_schema: typeof input === "string" ? "aql-collaboration-profile/v1-markdown" : "legacy-json", already_v2: false, source_unchanged: true, migrated: [], requires_confirmation: [], requires_project_binding: [], project_policy_candidates: [], unsupported: [], conflicts: [], dropped_fields: [] };
  const seen = new Set();
  const keyValues = new Map();
  for (let index = 0; index < rawEntries.length; index += 1) {
    const raw = isObject(rawEntries[index]) ? rawEntries[index] : { value: rawEntries[index] };
    let id = typeof raw.id === "string" ? raw.id : `migrated-${index + 1}`;
    id = id.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "") || `migrated-${index + 1}`;
    while (seen.has(id)) id = `${id}-${index + 1}`;
    seen.add(id);
    const lane = raw.lane || raw.kind;
    if (lane === "growth_focus") { report.unsupported.push({ id, lane, reason: "Growth Focus is not part of AQL 3.0 Profile v2" }); continue; }
    if (lane === "rejected_option") { report.project_policy_candidates.push({ id, value: raw.value, reason: "review as Task Contract non_goal, decision preference, or project policy" }); continue; }
    const kindMap = { communication: "communication", collaboration_habit: "interaction", interaction: "interaction", decision: "decision", phrase_lexicon: "semantic_alias", semantic_alias: "semantic_alias", route_alias: "semantic_alias", writing_preference: "communication", working_context: "working_context" };
    const kind = kindMap[lane];
    if (!kind) { report.unsupported.push({ id, lane: lane || null, reason: "legacy lane has no safe Profile v2 mapping" }); continue; }
    if (!Object.prototype.hasOwnProperty.call(raw, "value") || raw.value === null || typeof raw.applies_when !== "string" || !raw.applies_when.trim()) { report.requires_confirmation.push({ id, reason: "legacy value or applies_when is incomplete" }); continue; }
    const scope = legacyScope(raw.scope, options, report, id);
    if (!scope) continue;
    const preferenceKey = String(raw.preference_key || raw.conflict_key || `legacy.${id}`).replace(/[^A-Za-z0-9._-]+/g, "-");
    const valueKey = JSON.stringify(raw.value);
    if (keyValues.has(preferenceKey) && keyValues.get(preferenceKey) !== valueKey) report.conflicts.push({ preference_key: preferenceKey, ids: [keyValues.get(`${preferenceKey}:id`), id] });
    keyValues.set(preferenceKey, valueKey); keyValues.set(`${preferenceKey}:id`, id);
    const timestamp = now();
    const entry = {
      id, revision: 1, preference_key: preferenceKey, kind, value: raw.value, scope, applies_when: raw.applies_when,
      suppress_when: null, provenance: { type: "migration", refs: [`migration:${path.basename(sourceName)}`] },
      state: "candidate", valid_from: today(), review_after: kind === "working_context" ? today() : null,
      valid_until: null, supersedes: null, created_at: timestamp, updated_at: timestamp,
    };
    profile.entries.push(entry);
    report.migrated.push({ id, state: "candidate", kind, requires_confirmation: true });
    for (const dropped of ["last_fired", "source", "status", "route_id", "trigger_phrase", "outcome"]) if (raw[dropped] !== undefined) report.dropped_fields.push({ id, field: dropped });
  }
  assertValidProfile(profile);
  return { profile, report };
}
function importProfile(profilePath, imported, expectedRevision) {
  assertValidProfile(imported);
  if (!exists(profilePath)) {
    if (expectedRevision !== undefined) throw error("expected revision cannot be checked because the target Profile is absent", "ECAS");
    return withLock(profilePath, () => {
      if (exists(profilePath)) throw error("profile appeared while importing", "ECAS");
      atomicReplace(profilePath, canonical(imported)); return imported;
    });
  }
  return mutateProfile(profilePath, (target) => {
    const replacement = deepCopy(imported);
    replacement.profile_id = target.profile_id; replacement.created_at = target.created_at;
    Object.keys(target).forEach((key) => delete target[key]); Object.assign(target, replacement);
  }, expectedRevision);
}
function createMigrationBackupRecord(profilePath, profileId, sourcePath, sourceBytes, entryIds) {
  if (!Buffer.isBuffer(sourceBytes)) throw error("migration source bytes must be captured before apply", "EINVAL");
  const root = ensureMigrationBackupRoot(profilePath, profileId);
  const rootIdentity = directoryIdentity(root, "migration backup root");
  const recordId = crypto.randomUUID();
  const directory = path.join(root, `record-${recordId}`);
  const parsed = path.parse(sourcePath);
  const backupFile = `${parsed.name}.2.8.backup${parsed.ext || ".txt"}`;
  fs.mkdirSync(directory, { mode: 0o700 });
  try {
    const backupPath = path.join(directory, backupFile);
    writeExclusiveDurable(backupPath, sourceBytes);
    try { fs.chmodSync(backupPath, 0o600); } catch { /* host may not expose POSIX modes */ }
    const body = fs.readFileSync(backupPath);
    const metadata = {
      schema: MIGRATION_BACKUP_SCHEMA,
      profile_id: profileId,
      record_id: recordId,
      created_at: now(),
      backup_file: backupFile,
      backup_sha256: sha256(body),
      backup_size: body.length,
      entry_ids: [...new Set(entryIds)].sort(),
    };
    atomicReplace(path.join(directory, "metadata.json"), canonical(metadata));
    fsyncDirectory(directory);
    const after = directoryIdentity(root, "migration backup root");
    if (!sameDirectoryIdentity(rootIdentity, after)) throw error("migration backup root changed during record creation", "ELOOP");
    fsyncDirectory(root);
    return { directory, backupPath, metadata };
  } catch (cause) {
    try { fs.rmSync(directory, { recursive: true, force: true, maxRetries: 1 }); } catch { /* preserve the original failure */ }
    try { pruneEmptyMigrationBackupRoot(profilePath, profileId); } catch { /* preserve evidence for manual recovery */ }
    throw cause;
  }
}
function applyMigration(profilePath, imported, sourcePath, sourceBytes, expectedRevision) {
  assertValidProfile(imported);
  const hadProfile = exists(profilePath);
  const baseline = hadProfile ? readProfile(profilePath) : null;
  if (!baseline && expectedRevision !== undefined) throw error("expected revision cannot be checked because the target Profile is absent", "ECAS");
  if (baseline && expectedRevision !== undefined && expectedRevision !== baseline.revision) throw error(`expected revision ${expectedRevision}, found ${baseline.revision}`, "ECAS");
  return withLock(profilePath, () => {
    let current = null;
    if (exists(profilePath)) {
      if (!baseline) throw error("profile appeared while migrating", "ECAS");
      current = readProfile(profilePath);
      if (current.revision !== baseline.revision) throw error(`profile changed concurrently (expected revision ${baseline.revision}, found ${current.revision})`, "ECAS");
    } else if (baseline) {
      throw error("profile disappeared while migrating", "ECAS");
    }
    const incoming = deepCopy(imported);
    const incomingEntries = [...incoming.entries, ...incoming.archived_entries];
    const incomingIds = incomingEntries.map((entry) => entry.id);
    let next = incoming;
    if (current) {
      const existingIds = new Set([...current.entries, ...current.archived_entries].map((entry) => entry.id));
      const collisions = incomingIds.filter((id) => existingIds.has(id));
      if (collisions.length) throw error(`migration entry id conflicts with the target Profile: ${collisions.join(", ")}`, "ECONFLICT");
      next = deepCopy(current);
      next.entries.push(...incoming.entries);
      next.archived_entries.push(...incoming.archived_entries);
      next.revision = current.revision + 1;
      next.updated_at = now();
    }
    assertValidProfile(next);
    const record = createMigrationBackupRecord(profilePath, next.profile_id, sourcePath, sourceBytes, incomingIds);
    try {
      if (current) writeBackup(profilePath);
      atomicReplace(profilePath, canonical(next));
      return { profile: next, backup_path: record.backupPath };
    } catch (cause) {
      const rollbackErrors = [];
      try { removeMigrationBackupRecord(profilePath, next.profile_id, record); } catch (rollbackCause) { rollbackErrors.push(rollbackCause.message); }
      if (rollbackErrors.length) throw error(`${cause.message}; migration backup rollback failed: ${rollbackErrors.join("; ")}`, cause.code || "EIO");
      throw cause;
    }
  });
}

function scopeRank(scope) { return ({ task_class: 4, domain: 3, project: 2, global: 1 })[scope.level] || 0; }
function projectionEntryDigest(entry) { return `sha256:${sha256(canonical(entry))}`; }
function projectProfile(profile, context = {}) {
  assertValidProfile(profile);
  const selected = [];
  const suppressed = [];
  const deviations = Array.isArray(context.deviations) ? deepCopy(context.deviations) : [];
  const semantic = isObject(context.semantic) ? context.semantic : {};
  const currentOverrides = new Set(context.current_turn_overrides || []);
  const policyConflicts = new Set(context.policy_conflicts || []);
  const availableScopes = new Set((context.scopes || []).map((scope) => `${scope.level}:${scope.id || ""}`));
  const asOf = isDate(context.as_of) ? context.as_of : today();
  const candidates = [];
  for (const entry of profile.entries) {
    let reason = null;
    const match = semantic[entry.id];
    if (!profile.enabled) reason = "profile_disabled";
    else if (profile.paused) reason = "profile_paused";
    else if (context.fresh_mode === true) reason = "fresh_mode";
    else if (entry.state !== "active") reason = entry.state;
    else if (currentOverrides.has(entry.preference_key)) reason = "current_turn_override";
    else if (policyConflicts.has(entry.preference_key)) reason = "project_policy_conflict";
    else if (entry.review_after && entry.review_after <= asOf) reason = "review_due";
    else if (entry.valid_until && entry.valid_until < asOf) reason = "expired";
    else if (entry.valid_from > asOf) reason = "not_yet_valid";
    else if (entry.scope.level !== "global" && !availableScopes.has(`${entry.scope.level}:${entry.scope.id}`)) reason = "scope_mismatch_or_unknown";
    else if (!isObject(match) || match.applies_when_matches !== true) reason = "applicability_unknown_or_false";
    else if (entry.suppress_when !== null && match.suppress_when_matches !== false) reason = "suppression_unknown_or_true";
    else if (match.material_effect !== true || typeof match.effect !== "string" || !match.effect.trim()) reason = "no_material_guided_effect";
    if (reason) suppressed.push({ id: entry.id, reason }); else candidates.push({ entry, match });
  }
  const conflicts = new Set();
  const eligible = [];
  const grouped = new Map();
  for (const candidate of candidates) {
    const key = candidate.entry.preference_key;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key).push(candidate);
  }
  for (const [key, group] of grouped) {
    const winningRank = Math.max(...group.map((candidate) => scopeRank(candidate.entry.scope)));
    const winners = group.filter((candidate) => scopeRank(candidate.entry.scope) === winningRank);
    for (const candidate of group) {
      if (scopeRank(candidate.entry.scope) < winningRank) suppressed.push({ id: candidate.entry.id, reason: "lower_priority_shadowed" });
    }
    if (new Set(winners.map((candidate) => JSON.stringify(candidate.entry.value))).size > 1) {
      conflicts.add(key);
      for (const candidate of winners) suppressed.push({ id: candidate.entry.id, reason: "peer_conflict" });
      continue;
    }
    winners.sort((left, right) => left.entry.id.localeCompare(right.entry.id));
    eligible.push(winners[0]);
    for (const candidate of winners.slice(1)) suppressed.push({ id: candidate.entry.id, reason: "equivalent_peer_shadowed" });
  }
  eligible.sort((left, right) => scopeRank(right.entry.scope) - scopeRank(left.entry.scope) || left.entry.id.localeCompare(right.entry.id));
  for (const { entry, match } of eligible.slice(0, 2)) selected.push({ id: entry.id, entry_revision: entry.revision, entry_sha256: projectionEntryDigest(entry), target: "guided", reason: match.reason || `matched ${entry.scope.level} scope and explicit applicability`, effect: match.effect });
  for (const { entry } of eligible.slice(2)) suppressed.push({ id: entry.id, reason: "two_entry_budget" });
  suppressed.sort((left, right) => left.id.localeCompare(right.id) || left.reason.localeCompare(right.reason));
  return { schema: "aql.profile-projection-receipt/v2", profile_id: profile.profile_id, profile_revision: profile.revision, selected, suppressed, conflicts: [...conflicts].sort().map((preference_key) => ({ preference_key })), deviations };
}

function capabilitySource(kind, reference, observedAt, host) {
  return { kind, reference, observed_at: observedAt, host: host.name, version: host.version, config_identity: host.config_identity };
}
function capability(status, source) { return { status, source }; }
function probeFilesystemWrite() {
  const target = path.join(os.tmpdir(), `.aql-capability-${process.pid}-${crypto.randomBytes(4).toString("hex")}`);
  try { fs.writeFileSync(target, "probe", { flag: "wx", mode: 0o600 }); fs.unlinkSync(target); return "observed_true"; }
  catch { try { fs.unlinkSync(target); } catch { /* best effort */ } return "observed_false"; }
}
function probeProfileAccess(profilePath) { try { if (!exists(profilePath)) return "not_run"; readProfile(profilePath); return "observed_true"; } catch { return "observed_false"; } }
function validateCapabilitySource(source, label, errors) {
  if (!isObject(source)) { errors.push(`${label}.source must be an object`); return; }
  for (const key of Object.keys(source)) if (!new Set(["kind", "reference", "observed_at", "host", "version", "config_identity"]).has(key)) errors.push(`${label}.source has unknown field ${key}`);
  if (!CAPABILITY_SOURCE_KINDS.has(source.kind)) errors.push(`${label}.source.kind is invalid; model self-report is forbidden`);
  if (typeof source.reference !== "string" || !source.reference.trim() || source.reference.length > 256) errors.push(`${label}.source.reference is invalid`);
  if (!isDateTime(source.observed_at)) errors.push(`${label}.source.observed_at is invalid`);
  for (const field of ["host", "version", "config_identity"]) if (typeof source[field] !== "string" || !source[field].trim()) errors.push(`${label}.source.${field} is required`);
}
function validateReceipt(receipt) {
  const errors = [];
  if (!isObject(receipt)) return ["receipt must be an object"];
  const allowed = new Set(["schema", "receipt_id", "collected_at", "host", "capabilities"]);
  for (const key of Object.keys(receipt)) if (!allowed.has(key)) errors.push(`receipt has unknown field ${key}`);
  if (receipt.schema !== RECEIPT_SCHEMA) errors.push(`schema must equal ${RECEIPT_SCHEMA}`);
  if (typeof receipt.receipt_id !== "string" || !receipt.receipt_id.trim() || receipt.receipt_id.length > 128) errors.push("receipt_id is invalid");
  if (!isDateTime(receipt.collected_at)) errors.push("collected_at is invalid");
  if (!isObject(receipt.host)) errors.push("host must be an object");
  else {
    for (const key of Object.keys(receipt.host)) if (!new Set(["name", "version", "config_identity"]).has(key)) errors.push(`host has unknown field ${key}`);
    for (const key of ["name", "version", "config_identity"]) if (typeof receipt.host[key] !== "string" || !receipt.host[key].trim()) errors.push(`host.${key} is required`);
  }
  if (!isObject(receipt.capabilities)) errors.push("capabilities must be an object");
  else {
    for (const id of Object.keys(receipt.capabilities)) if (!CAPABILITY_IDS.includes(id)) errors.push(`unknown capability ${id}`);
    for (const id of CAPABILITY_IDS) {
      const observation = receipt.capabilities[id];
      if (!isObject(observation)) { errors.push(`capabilities.${id} is required`); continue; }
      for (const key of Object.keys(observation)) if (!new Set(["status", "source"]).has(key)) errors.push(`capabilities.${id} has unknown field ${key}`);
      if (!CAPABILITY_STATUSES.has(observation.status)) errors.push(`capabilities.${id}.status is invalid`);
      validateCapabilitySource(observation.source, `capabilities.${id}`, errors);
      if (isObject(receipt.host) && isObject(observation.source)) {
        if (observation.source.host !== receipt.host.name || observation.source.version !== receipt.host.version || observation.source.config_identity !== receipt.host.config_identity) {
          errors.push(`capabilities.${id}.source must bind the receipt host/version/config_identity`);
        }
      }
    }
  }
  return errors;
}
function assertValidReceipt(receipt) { const errors = validateReceipt(receipt); if (errors.length) throw error(`capability receipt validation failed: ${errors.join("; ")}`, "ESCHEMA"); }
function createCapabilityReceipt(options = {}) {
  const collectedAt = now();
  // Host identity is observed from this process. Callers cannot relabel
  // actual_call evidence by supplying hostName or hostVersion options.
  const hostName = (process.release && process.release.name) || "node";
  const hostVersion = process.version;
  const profilePath = options.profilePath || defaultProfilePath();
  const host = {
    name: hostName,
    version: hostVersion,
    config_identity: `sha256:${sha256(canonical({ runtime: "profile-v2", exec_path: process.execPath, platform: process.platform, arch: process.arch, node: process.version }))}`,
  };
  const unknown = capability("not_run", capabilitySource("local_probe", "not probed by this runtime", collectedAt, host));
  const capabilities = Object.fromEntries(CAPABILITY_IDS.map((id) => [id, deepCopy(unknown)]));
  capabilities.local_scripts = capability("observed_true", capabilitySource("actual_call", "packaged profile-v2 runtime executed", collectedAt, host));
  capabilities.filesystem_write = capability(probeFilesystemWrite(), capabilitySource("local_probe", "temporary create-delete probe", collectedAt, host));
  capabilities.profile_access = capability(probeProfileAccess(profilePath), capabilitySource("local_probe", "configured profile path read", collectedAt, host));
  if (isObject(options.capabilities)) {
    for (const [id, observation] of Object.entries(options.capabilities)) {
      if (!CAPABILITY_IDS.includes(id)) throw error(`unknown configured capability ${id}`, "EINVAL");
      const copy = deepCopy(observation);
      if (typeof copy === "string") capabilities[id] = capability(copy, capabilitySource("explicit_config", "configured capability status", collectedAt, host));
      else {
        const reference = isObject(copy.source) && typeof copy.source.reference === "string" && copy.source.reference.trim()
          ? copy.source.reference
          : "configured capability status";
        // Supplied data is configuration, never an observed local call.
        copy.source = capabilitySource("explicit_config", reference, collectedAt, host);
        capabilities[id] = copy;
      }
    }
  }
  const receipt = { schema: RECEIPT_SCHEMA, receipt_id: `cap-${crypto.randomUUID()}`, collected_at: collectedAt, host, capabilities };
  assertValidReceipt(receipt);
  return receipt;
}

module.exports = {
  PROFILE_SCHEMA, RECEIPT_SCHEMA, PROJECT_SCHEMA, MIGRATION_BACKUP_ROOT_SCHEMA, MIGRATION_BACKUP_SCHEMA, KINDS, STATES, CAPABILITY_IDS, CAPABILITY_STATUSES,
  defaultProfilePath, newProfile, validateProfile, assertValidProfile, readProfile,
  createProfile, mutateProfile, remember, propose, confirm, edit, archive, forget, setFlag,
  ensureProjectIdentity, ensureProjectIdentityWithStatus, projectPathFor, parseLegacyMarkdown, migrateLegacy, importProfile, restoreProfile,
  applyMigration, migrationBackupRootFor, readMigrationBackupRecords, cleanMigrationBackups, projectProfile, cleanManagedArtifacts, purgeReceiptReferences,
  validateReceipt, assertValidReceipt, createCapabilityReceipt, atomicReplace,
  canonical, sha256, error,
};
