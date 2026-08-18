#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { MANIFEST_NAME, checkManifestConsistency, repoRoot, walkFiles } = require("./gen-manifest");

const PACKAGE_NAME = "agent-quality-loop";
const RECEIPT_SCHEMA_VERSION = 1;
const JOURNAL_SCHEMA_VERSION = 1;
const TEST_FAULT_ENV = "AQL_INSTALL_TEST_FAULT";
const activeHomeLocks = new Map();

function sha256Buffer(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function sha256File(filePath) {
  return sha256Buffer(fs.readFileSync(filePath));
}

function parseArgs(argv) {
  const options = { command: "install", to: "agents", dryRun: false, home: os.homedir() };
  if (["install", "status", "update", "uninstall"].includes(argv[0])) options.command = argv.shift();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--to") options.to = argv[++index];
    else if (arg.startsWith("--to=")) options.to = arg.slice(5);
    else if (arg === "--home") options.home = argv[++index];
    else if (arg.startsWith("--home=")) options.home = arg.slice(7);
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!options.home) throw new Error("--home requires a directory");
  if (!["agents", "cursor", "claude", "both", "all"].includes(options.to)) throw new Error("--to must be one of: agents, cursor, claude, both, all");
  return options;
}

function targetRoots(to, home = os.homedir()) {
  const targets = [];
  if (["agents", "both", "all"].includes(to)) targets.push({ label: "agents", root: path.join(home, ".agents", "skills") });
  if (["cursor", "both", "all"].includes(to)) targets.push({ label: "cursor", root: path.join(home, ".cursor", "skills") });
  if (["claude", "all"].includes(to)) targets.push({ label: "claude", root: path.join(home, ".claude", "skills") });
  return targets;
}

function sourceRootForTarget(root, label) {
  return path.join(root, label === "cursor" ? ".cursor" : ".agents", "skills");
}

function resolveSourceDir(root, destination) {
  return path.join(sourceRootForTarget(root, destination.label), PACKAGE_NAME);
}

function receiptRoot(home) { return path.join(home, ".aql", "install-receipts"); }
function transactionRoot(home) { return path.join(home, ".aql", "install-transactions"); }
function canonicalPathIdentity(candidate) {
  const absolute = path.resolve(candidate);
  return process.platform === "win32" ? absolute.toLowerCase() : absolute;
}

function samePathIdentity(left, right) {
  return canonicalPathIdentity(left) === canonicalPathIdentity(right);
}

function lockPaths(home) {
  const root = path.join(os.tmpdir(), `${PACKAGE_NAME}-installer-locks`);
  const key = sha256Buffer(canonicalPathIdentity(home));
  return { root, lock: path.join(root, `${key}.lock`), reap: path.join(root, `${key}.reap`) };
}

function receiptPath(home, destinationDir) {
  const key = sha256Buffer(canonicalPathIdentity(destinationDir));
  return path.join(receiptRoot(home), `${key}.json`);
}

function isPathWithin(base, candidate) {
  const relative = path.relative(base, candidate);
  return relative === "" || (!relative.startsWith(`..${path.sep}`) && relative !== ".." && !path.isAbsolute(relative));
}

function realpath(filePath) { return (fs.realpathSync.native || fs.realpathSync)(filePath); }

function lstatIfExists(filePath) {
  try { return fs.lstatSync(filePath); }
  catch (error) { if (error && error.code === "ENOENT") return null; throw error; }
}

function assertContainedPath(home, candidate, leafKind = "any") {
  const absoluteHome = path.resolve(home);
  const absoluteCandidate = path.resolve(candidate);
  if (!isPathWithin(absoluteHome, absoluteCandidate)) throw new Error(`path is outside home: ${absoluteCandidate}`);
  const homeStat = lstatIfExists(absoluteHome);
  if (!homeStat) return absoluteCandidate;
  if (!fs.statSync(absoluteHome).isDirectory()) throw new Error(`unsafe home directory: ${absoluteHome}`);
  const resolvedHome = realpath(absoluteHome);
  const relative = path.relative(absoluteHome, absoluteCandidate);
  const segments = relative ? relative.split(path.sep) : [];
  let current = absoluteHome;
  for (let index = 0; index < segments.length; index += 1) {
    current = path.join(current, segments[index]);
    const stat = lstatIfExists(current);
    if (!stat) break;
    let resolved;
    try { resolved = realpath(current); }
    catch (error) { throw new Error(`unsafe broken link or reparse point ${current}: ${error.message}`); }
    if (!isPathWithin(resolvedHome, resolved)) throw new Error(`path escapes home through link or reparse point: ${current}`);
    const isLeaf = index === segments.length - 1;
    if (!isLeaf || leafKind === "directory") {
      if (!fs.statSync(current).isDirectory()) throw new Error(`unsafe non-directory ancestor: ${current}`);
    } else if (leafKind === "file") {
      if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`unsafe managed file: ${current}`);
    }
  }
  return absoluteCandidate;
}

function ensureContainedDirectory(home, directory) {
  const absoluteHome = path.resolve(home);
  const absoluteDirectory = assertContainedPath(home, directory, "directory");
  if (!lstatIfExists(absoluteHome)) fs.mkdirSync(absoluteHome, { recursive: true });
  assertContainedPath(home, absoluteHome, "directory");
  const relative = path.relative(absoluteHome, absoluteDirectory);
  let current = absoluteHome;
  for (const segment of relative.split(path.sep).filter(Boolean)) {
    current = path.join(current, segment);
    if (!lstatIfExists(current)) fs.mkdirSync(current);
    assertContainedPath(home, current, "directory");
  }
  return absoluteDirectory;
}

function fsyncDirectory(directory) {
  let descriptor;
  try {
    descriptor = fs.openSync(directory, "r");
    fs.fsyncSync(descriptor);
  } catch (error) {
    if (!error || !["EACCES", "EBADF", "EINVAL", "EISDIR", "EPERM"].includes(error.code)) throw error;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function ensureLockRoot(root) {
  const existing = lstatIfExists(root);
  if (!existing) {
    try { fs.mkdirSync(root, { mode: 0o700 }); }
    catch (error) { if (!error || error.code !== "EEXIST") throw error; }
  }
  const stat = lstatIfExists(root);
  if (!stat || stat.isSymbolicLink() || !stat.isDirectory()) throw new Error(`unsafe installer lock root: ${root}`);
}

function readLockSnapshot(filePath, expectedHome) {
  const stat = lstatIfExists(filePath);
  if (!stat) return null;
  if (stat.isSymbolicLink() || !stat.isFile()) throw new Error(`unsafe installer lock: ${filePath}`);
  let text;
  let owner;
  try {
    text = fs.readFileSync(filePath, "utf8");
    owner = JSON.parse(text);
  } catch (error) {
    throw new Error(`invalid installer lock ${filePath}: ${error.message}`);
  }
  if (!owner || !Number.isSafeInteger(owner.pid) || owner.pid <= 0 || typeof owner.acquiredAt !== "string" || !Number.isFinite(Date.parse(owner.acquiredAt)) || typeof owner.token !== "string" || !/^[0-9a-f]{32}$/.test(owner.token) || owner.home !== canonicalPathIdentity(expectedHome)) {
    throw new Error(`invalid installer lock owner: ${filePath}`);
  }
  return { owner, digest: sha256Buffer(text) };
}

function processIsLive(pid) {
  if (pid === process.pid) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === "ESRCH") return false;
    if (error && error.code === "EPERM") return true;
    throw new Error(`cannot determine whether installer lock pid ${pid} is live: ${error.message}`);
  }
}

function sameLockSnapshot(left, right) {
  return Boolean(left && right && left.digest === right.digest && left.owner.token === right.owner.token);
}

function settleReap(home, paths) {
  const reaped = readLockSnapshot(paths.reap, home);
  if (!reaped) return;
  if (processIsLive(reaped.owner.pid)) throw new Error(`installer lock recovery is owned by live pid ${reaped.owner.pid} since ${reaped.owner.acquiredAt}`);
  const locked = readLockSnapshot(paths.lock, home);
  if (locked && !sameLockSnapshot(locked, reaped)) throw new Error(`installer lock changed during stale recovery: ${paths.lock}`);
  if (locked) fs.unlinkSync(paths.lock);
  fs.unlinkSync(paths.reap);
  fsyncDirectory(paths.root);
}

function publishInstallerLock(home, paths, owner) {
  const temp = path.join(paths.root, `.${path.basename(paths.lock)}.${owner.pid}.${owner.token}.tmp`);
  let descriptor;
  try {
    descriptor = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(descriptor, `${JSON.stringify(owner)}\n`, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  try {
    if (lstatIfExists(paths.reap)) throw new Error(`installer lock recovery is in progress for ${owner.home}`);
    fs.linkSync(temp, paths.lock);
    fsyncDirectory(paths.root);
  } finally {
    if (lstatIfExists(temp)) fs.unlinkSync(temp);
  }
}

function acquireInstallerLock(home) {
  const paths = lockPaths(home);
  ensureLockRoot(paths.root);
  settleReap(home, paths);
  const owner = { pid: process.pid, acquiredAt: new Date().toISOString(), token: crypto.randomBytes(16).toString("hex"), home: canonicalPathIdentity(home) };
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      publishInstallerLock(home, paths, owner);
      return { ...paths, owner };
    } catch (error) {
      if (!error || error.code !== "EEXIST") throw error;
      const locked = readLockSnapshot(paths.lock, home);
      if (!locked) {
        settleReap(home, paths);
        continue;
      }
      if (processIsLive(locked.owner.pid)) throw new Error(`installer is locked by live pid ${locked.owner.pid} since ${locked.owner.acquiredAt}`);
      try { fs.linkSync(paths.lock, paths.reap); }
      catch (claimError) {
        if (!claimError || !["EEXIST", "ENOENT"].includes(claimError.code)) throw claimError;
      }
      settleReap(home, paths);
    }
  }
  throw new Error(`could not acquire installer lock for ${canonicalPathIdentity(home)}`);
}

function releaseInstallerLock(lock) {
  if (lstatIfExists(lock.reap)) throw new Error(`installer lock recovery appeared while pid ${lock.owner.pid} was active`);
  const current = readLockSnapshot(lock.lock, lock.owner.home);
  if (!current || current.owner.token !== lock.owner.token) throw new Error(`installer lock ownership changed before release: ${lock.lock}`);
  fs.unlinkSync(lock.lock);
  fsyncDirectory(lock.root);
}

function withInstallerLock(home, callback) {
  const key = canonicalPathIdentity(home);
  if (activeHomeLocks.has(key)) return callback();
  const lock = acquireInstallerLock(home);
  activeHomeLocks.set(key, lock.owner.token);
  try { return callback(); }
  finally {
    activeHomeLocks.delete(key);
    releaseInstallerLock(lock);
  }
}

function assertInstallerUnlockedReadOnly(home) {
  const paths = lockPaths(home);
  const root = lstatIfExists(paths.root);
  if (!root) return;
  if (root.isSymbolicLink() || !root.isDirectory()) throw new Error(`unsafe installer lock root: ${paths.root}`);
  const reaping = readLockSnapshot(paths.reap, home);
  if (reaping) throw new Error(`installer lock recovery requires a non-dry command for pid ${reaping.owner.pid}`);
  const locked = readLockSnapshot(paths.lock, home);
  if (!locked) return;
  if (processIsLive(locked.owner.pid)) throw new Error(`installer is locked by live pid ${locked.owner.pid} since ${locked.owner.acquiredAt}`);
  throw new Error(`stale installer lock requires a non-dry command for pid ${locked.owner.pid}`);
}

function withReadOnlyInstallerView(home, callback) {
  assertInstallerUnlockedReadOnly(home);
  const result = callback();
  assertInstallerUnlockedReadOnly(home);
  return result;
}

function writeDurableFile(home, filePath, contents, flag = "wx") {
  const absolute = assertContainedPath(home, filePath, "file");
  ensureContainedDirectory(home, path.dirname(absolute));
  let descriptor;
  try {
    descriptor = fs.openSync(absolute, flag, 0o600);
    fs.writeFileSync(descriptor, contents, "utf8");
    fs.fsyncSync(descriptor);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
  fsyncDirectory(path.dirname(absolute));
}

function writeAtomicDurableFile(home, filePath, contents, beforeRename = null) {
  const absolute = assertContainedPath(home, filePath, "file");
  const parent = ensureContainedDirectory(home, path.dirname(absolute));
  const temp = path.join(parent, `.${path.basename(absolute)}.tmp-${process.pid}-${crypto.randomBytes(8).toString("hex")}`);
  let descriptor;
  let renamed = false;
  try {
    descriptor = fs.openSync(temp, "wx", 0o600);
    fs.writeFileSync(descriptor, contents, "utf8");
    fs.fsyncSync(descriptor);
    fs.closeSync(descriptor);
    descriptor = undefined;
    if (beforeRename) beforeRename();
    if (lstatIfExists(absolute)) throw new Error(`durable file already exists: ${absolute}`);
    fs.renameSync(temp, absolute);
    renamed = true;
    fsyncDirectory(parent);
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
    if (!renamed && lstatIfExists(temp)) fs.unlinkSync(temp);
  }
}

function removeContained(home, target, options = {}) {
  const stat = lstatIfExists(target);
  if (!stat) return;
  assertContainedPath(home, target, stat.isDirectory() ? "directory" : "file");
  fs.rmSync(target, options);
  fsyncDirectory(path.dirname(target));
}

function packageInventory(packageDir) {
  const files = {};
  for (const relativePath of walkFiles(packageDir)) files[relativePath] = sha256File(path.join(packageDir, relativePath));
  return files;
}

function inventoryDrift(packageDir, expected) {
  if (!fs.existsSync(packageDir)) return ["installed package is missing"];
  let actual;
  try { actual = packageInventory(packageDir); } catch (error) { return [`cannot inspect installed package: ${error.message}`]; }
  const errors = [];
  for (const [file, digest] of Object.entries(expected)) {
    if (!Object.prototype.hasOwnProperty.call(actual, file)) errors.push(`missing ${file}`);
    else if (actual[file] !== digest) errors.push(`modified ${file}`);
  }
  for (const file of Object.keys(actual)) if (!Object.prototype.hasOwnProperty.call(expected, file)) errors.push(`unexpected ${file}`);
  return errors;
}

function assertInventory(packageDir, expected, context) {
  const drift = inventoryDrift(packageDir, expected);
  if (drift.length > 0) throw new Error(`${context} (${drift.join(", ")})`);
}

function readReceipt(home, destinationDir) {
  const filePath = receiptPath(home, destinationDir);
  assertContainedPath(home, filePath, "file");
  if (!lstatIfExists(filePath)) return null;
  try {
    const text = fs.readFileSync(filePath, "utf8");
    const receipt = JSON.parse(text);
    if (receipt.schema_version !== RECEIPT_SCHEMA_VERSION || typeof receipt.destination !== "string" || !path.isAbsolute(receipt.destination) || !samePathIdentity(receipt.destination, destinationDir) || receipt.package !== PACKAGE_NAME) throw new Error("receipt identity does not match target");
    return { receipt, filePath, text, sha256: sha256Buffer(text) };
  } catch (error) { throw new Error(`invalid ownership receipt ${filePath}: ${error.message}`); }
}

function buildReceipt(target) {
  const manifestPath = path.join(target.sourceDir, MANIFEST_NAME);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  return { schema_version: RECEIPT_SCHEMA_VERSION, package: PACKAGE_NAME, target: target.label, destination: canonicalPathIdentity(target.destinationDir), version: manifest.version, manifest_sha256: sha256File(manifestPath), inventory: packageInventory(target.sourceDir), installed_at: new Date().toISOString() };
}

function siblingPath(target, label, id) {
  return path.join(path.dirname(target), `.${path.basename(target)}.${label}.${id}`);
}

function prepareTargets(options, root = repoRoot()) {
  return targetRoots(options.to, options.home).map((target) => ({ ...target, destinationDir: path.join(target.root, PACKAGE_NAME), sourceDir: resolveSourceDir(root, target) }));
}

function guardTarget(target, options) {
  assertContainedPath(options.home, target.root, "directory");
  assertContainedPath(options.home, target.destinationDir, "directory");
  const stat = lstatIfExists(target.destinationDir);
  if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error(`unsafe destination package: ${target.destinationDir}`);
}

function preflightSource(sourceDir, label) {
  if (!fs.existsSync(sourceDir)) throw new Error(`missing ${label} source package: ${PACKAGE_NAME}`);
  const errors = checkManifestConsistency(sourceDir);
  if (errors.length > 0) throw new Error(`source preflight ${label}/${PACKAGE_NAME}: ${errors.join("; ")}`);
}

function preflightTarget(target, options) {
  guardTarget(target, options);
  const ownership = readReceipt(options.home, target.destinationDir);
  const exists = Boolean(lstatIfExists(target.destinationDir));
  if (options.command === "install" || options.command === "update") preflightSource(target.sourceDir, target.label);
  if (options.command === "install") {
    if (exists && !ownership) throw new Error(`${target.destinationDir} is unowned; refusing to replace it`);
    if (ownership) {
      const drift = inventoryDrift(target.destinationDir, ownership.receipt.inventory);
      if (drift.length > 0) throw new Error(`${target.destinationDir} has drift; refusing to replace (${drift.join(", ")})`);
      throw new Error(`${target.destinationDir} is already installed and owned; use update`);
    }
  } else {
    if (!ownership) throw new Error(`${target.destinationDir} is unowned; refusing to ${options.command} it`);
    const drift = inventoryDrift(target.destinationDir, ownership.receipt.inventory);
    if (drift.length > 0) throw new Error(`${target.destinationDir} has drift; refusing to ${options.command} (${drift.join(", ")})`);
  }
  return { target, ownership, exists };
}

function fsyncTree(directory) {
  const directories = [];
  const collectDirectories = (current) => {
    directories.push(current);
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      if (entry.isDirectory()) collectDirectories(path.join(current, entry.name));
    }
  };
  for (const relativePath of walkFiles(directory)) {
    const descriptor = fs.openSync(path.join(directory, relativePath), "r");
    try {
      try { fs.fsyncSync(descriptor); }
      catch (error) { if (!error || !["EACCES", "EBADF", "EINVAL", "EPERM"].includes(error.code)) throw error; }
    } finally { fs.closeSync(descriptor); }
  }
  collectDirectories(directory);
  for (const item of directories.reverse()) fsyncDirectory(item);
}

function stagePlanEntry(preflight, options, transactionId, transactionDirectory) {
  const { target, ownership, exists } = preflight;
  const receiptFile = ownership ? ownership.filePath : receiptPath(options.home, target.destinationDir);
  const entry = {
    label: target.label,
    destination: path.resolve(target.destinationDir),
    packageStage: null,
    packageBackup: siblingPath(target.destinationDir, options.command === "uninstall" ? "uninstall" : "backup", transactionId),
    receipt: path.resolve(receiptFile),
    receiptStage: null,
    receiptBackup: siblingPath(receiptFile, options.command === "uninstall" ? "uninstall" : "backup", transactionId),
    hadDestination: exists,
    oldInventory: ownership ? ownership.receipt.inventory : null,
    oldReceiptSha256: ownership ? ownership.sha256 : null,
    newInventory: null,
    newReceiptSha256: null,
  };
  if (options.command !== "uninstall") {
    try {
      const nextReceipt = buildReceipt(target);
      const nextReceiptText = `${JSON.stringify(nextReceipt, null, 2)}\n`;
      ensureContainedDirectory(options.home, target.root);
      guardTarget(target, options);
      const stageDirectory = path.join(transactionDirectory, "staging", target.label);
      ensureContainedDirectory(options.home, stageDirectory);
      entry.packageStage = path.join(stageDirectory, "package");
      assertContainedPath(options.home, entry.packageStage, "directory");
      fs.cpSync(target.sourceDir, entry.packageStage, { recursive: true, errorOnExist: true, force: false });
      assertInventory(entry.packageStage, nextReceipt.inventory, "staged package verification failed");
      fsyncTree(entry.packageStage);
      entry.newInventory = nextReceipt.inventory;
      ensureContainedDirectory(options.home, path.dirname(receiptFile));
      entry.receiptStage = path.join(stageDirectory, "receipt.json");
      writeDurableFile(options.home, entry.receiptStage, nextReceiptText);
      entry.newReceiptSha256 = sha256Buffer(nextReceiptText);
    } catch (error) {
      if (entry.packageStage && lstatIfExists(entry.packageStage)) removeContained(options.home, entry.packageStage, { recursive: true, force: true });
      if (entry.receiptStage && lstatIfExists(entry.receiptStage)) removeContained(options.home, entry.receiptStage, { force: true });
      throw error;
    }
  }
  return entry;
}

function faultPoint(name) {
  if (process.env.AQL_INSTALL_SELF_TEST_CHILD !== "1" || process.env[TEST_FAULT_ENV] !== name) return;
  if (process.env.AQL_INSTALL_TEST_FAULT_MODE === "exit") process.exit(86);
  if (process.env.AQL_INSTALL_TEST_FAULT_MODE === "hold") {
    const ready = process.env.AQL_INSTALL_TEST_READY;
    const release = process.env.AQL_INSTALL_TEST_RELEASE;
    if (!ready || !release) throw new Error("hold fault requires ready and release paths");
    fs.writeFileSync(ready, `${process.pid}\n`, "utf8");
    const waiter = new Int32Array(new SharedArrayBuffer(4));
    const deadline = Date.now() + 15000;
    while (!fs.existsSync(release)) {
      if (Date.now() >= deadline) throw new Error(`timed out waiting to release fault at ${name}`);
      Atomics.wait(waiter, 0, 0, 20);
    }
    return;
  }
  throw new Error(`injected fault at ${name}`);
}

function journalPaths(home, transactionId) {
  const directory = path.join(transactionRoot(home), transactionId);
  return {
    directory,
    intent: path.join(directory, "intent.json"),
    plan: path.join(directory, "plan.json"),
    started: path.join(directory, "started"),
    commit: path.join(directory, "commit"),
    staging: path.join(directory, "staging"),
  };
}

function createTransactionJournal(home, intent) {
  const paths = journalPaths(home, intent.transactionId);
  ensureContainedDirectory(home, transactionRoot(home));
  fs.mkdirSync(paths.directory);
  fsyncDirectory(path.dirname(paths.directory));
  writeAtomicDurableFile(home, paths.intent, `${JSON.stringify(intent, null, 2)}\n`);
  return paths;
}

function publishJournalPlan(home, plan) {
  const paths = journalPaths(home, plan.transactionId);
  writeAtomicDurableFile(home, paths.plan, `${JSON.stringify(plan, null, 2)}\n`, () => faultPoint("before-plan-rename"));
}

function writeStartedMarker(home, plan) {
  const paths = journalPaths(home, plan.transactionId);
  writeDurableFile(home, paths.started, `${plan.transactionId}\n`);
}

function writeCommitMarker(home, plan) {
  const paths = journalPaths(home, plan.transactionId);
  writeDurableFile(home, paths.commit, `${plan.transactionId}\n`);
}

function hasCommitMarker(home, plan) {
  const marker = journalPaths(home, plan.transactionId).commit;
  assertContainedPath(home, marker, "file");
  return Boolean(lstatIfExists(marker)) && fs.readFileSync(marker, "utf8") === `${plan.transactionId}\n`;
}

function validateSibling(candidate, target, label, transactionId) {
  return samePathIdentity(candidate, siblingPath(target, label, transactionId));
}

function validateTransactionId(transactionId) {
  return typeof transactionId === "string" && /^\d+-\d+-[0-9a-f]{16}$/.test(transactionId);
}

function validateJournalIntent(home, intent, directory) {
  if (!intent || intent.schemaVersion !== JOURNAL_SCHEMA_VERSION || !["install", "update", "uninstall"].includes(intent.operation)) throw new Error(`invalid transaction intent ${directory}`);
  if (typeof intent.home !== "string" || !path.isAbsolute(intent.home) || !samePathIdentity(intent.home, home) || !validateTransactionId(intent.transactionId) || path.basename(directory) !== intent.transactionId) throw new Error(`transaction intent identity mismatch ${directory}`);
  if (!Array.isArray(intent.labels) || intent.labels.length === 0 || new Set(intent.labels).size !== intent.labels.length || intent.labels.some((label) => !["agents", "cursor", "claude"].includes(label))) throw new Error(`invalid transaction intent targets ${directory}`);
  return intent;
}

function validateJournalTree(home, directory, incomplete) {
  const allowed = new Set(["intent.json", "plan.json", "staging"]);
  if (!incomplete) {
    allowed.add("started");
    allowed.add("commit");
  }
  const visit = (current, root = false) => {
    for (const item of fs.readdirSync(current, { withFileTypes: true })) {
      const candidate = path.join(current, item.name);
      const stat = fs.lstatSync(candidate);
      if (stat.isSymbolicLink()) throw new Error(`unsafe link in transaction journal ${candidate}`);
      if (root && !allowed.has(item.name) && !/^\.(?:intent|plan)\.json\.tmp-\d+-[0-9a-f]{16}$/.test(item.name)) throw new Error(`unexpected transaction journal entry ${candidate}`);
      if (stat.isDirectory()) visit(candidate);
      else if (!stat.isFile()) throw new Error(`unsafe transaction journal entry ${candidate}`);
    }
  };
  assertContainedPath(home, directory, "directory");
  visit(directory, true);
}

function validateJournalPlan(home, plan, directory) {
  if (!plan || plan.schemaVersion !== JOURNAL_SCHEMA_VERSION || !["install", "update", "uninstall"].includes(plan.operation)) throw new Error(`invalid transaction journal ${directory}`);
  if (typeof plan.home !== "string" || !path.isAbsolute(plan.home) || !samePathIdentity(plan.home, home) || !validateTransactionId(plan.transactionId) || path.basename(directory) !== plan.transactionId) throw new Error(`transaction journal identity mismatch ${directory}`);
  if (!Array.isArray(plan.entries) || plan.entries.length === 0) throw new Error(`transaction journal has no targets ${directory}`);
  const labels = new Set();
  for (const entry of plan.entries) {
    if (labels.has(entry.label) || !["agents", "cursor", "claude"].includes(entry.label)) throw new Error(`invalid transaction target in ${directory}`);
    labels.add(entry.label);
    const root = targetRoots(entry.label, home)[0].root;
    const expectedDestination = path.resolve(path.join(root, PACKAGE_NAME));
    const expectedReceipt = path.resolve(receiptPath(home, expectedDestination));
    if (!samePathIdentity(entry.destination, expectedDestination) || !samePathIdentity(entry.receipt, expectedReceipt)) throw new Error(`transaction path identity mismatch in ${directory}`);
    if (!validateSibling(entry.packageBackup, entry.destination, plan.operation === "uninstall" ? "uninstall" : "backup", plan.transactionId)) throw new Error(`invalid package backup path in ${directory}`);
    if (!validateSibling(entry.receiptBackup, entry.receipt, plan.operation === "uninstall" ? "uninstall" : "backup", plan.transactionId)) throw new Error(`invalid receipt backup path in ${directory}`);
    if (plan.operation !== "uninstall") {
      const expectedStage = path.join(directory, "staging", entry.label);
      if (!samePathIdentity(entry.packageStage, path.join(expectedStage, "package")) || !samePathIdentity(entry.receiptStage, path.join(expectedStage, "receipt.json"))) throw new Error(`invalid staging path in ${directory}`);
    } else if (entry.packageStage !== null || entry.receiptStage !== null) throw new Error(`unexpected uninstall staging path in ${directory}`);
    for (const [candidate, kind] of [[entry.destination, "directory"], [entry.packageBackup, "directory"], [entry.receipt, "file"], [entry.receiptBackup, "file"]]) assertContainedPath(home, candidate, kind);
    if (entry.packageStage) assertContainedPath(home, entry.packageStage, "directory");
    if (entry.receiptStage) assertContainedPath(home, entry.receiptStage, "file");
  }
  return plan;
}

function readJournal(home, directory) {
  const paths = journalPaths(home, path.basename(directory));
  const intentStat = lstatIfExists(paths.intent);
  if (!intentStat) {
    if (lstatIfExists(paths.started) || lstatIfExists(paths.commit) || lstatIfExists(paths.staging) || lstatIfExists(paths.plan)) throw new Error(`incomplete transaction journal without intent ${directory}`);
    validateJournalTree(home, directory, true);
    return { discardable: true, intent: null, plan: null };
  }
  if (intentStat.isSymbolicLink() || !intentStat.isFile()) throw new Error(`unsafe transaction intent ${paths.intent}`);
  let intent;
  try { intent = validateJournalIntent(home, JSON.parse(fs.readFileSync(paths.intent, "utf8")), directory); }
  catch (error) { throw new Error(`invalid transaction intent ${directory}: ${error.message}`); }
  const planPath = path.join(directory, "plan.json");
  assertContainedPath(home, planPath, "file");
  if (!lstatIfExists(planPath)) {
    if (lstatIfExists(paths.started) || lstatIfExists(paths.commit)) throw new Error(`started transaction journal has no plan ${directory}`);
    validateJournalTree(home, directory, true);
    return { discardable: true, intent, plan: null };
  }
  let plan;
  try {
    plan = validateJournalPlan(home, JSON.parse(fs.readFileSync(planPath, "utf8")), directory);
    if (plan.transactionId !== intent.transactionId || plan.operation !== intent.operation || !samePathIdentity(plan.home, intent.home) || plan.entries.map((entry) => entry.label).join("\0") !== intent.labels.join("\0")) throw new Error(`transaction intent and plan mismatch ${directory}`);
  }
  catch (error) {
    if (lstatIfExists(paths.started) || lstatIfExists(paths.commit)) throw new Error(`invalid started transaction journal ${directory}: ${error.message}`);
    validateJournalTree(home, directory, true);
    return { discardable: true, intent, plan: null };
  }
  validateJournalTree(home, directory, false);
  return { discardable: false, intent, plan };
}

function exactFile(filePath, expectedSha256) {
  return Boolean(lstatIfExists(filePath)) && sha256File(filePath) === expectedSha256;
}

function rollbackPackage(home, plan, entry, errors) {
  try {
    const stageExists = entry.packageStage && lstatIfExists(entry.packageStage);
    const backupExists = lstatIfExists(entry.packageBackup);
    const destinationExists = lstatIfExists(entry.destination);
    if (plan.operation === "install") {
      if (!stageExists && destinationExists) {
        assertInventory(entry.destination, entry.newInventory, "refusing to remove non-transaction destination during recovery");
        removeContained(home, entry.destination, { recursive: true, force: false });
      }
    } else if (backupExists) {
      if (destinationExists) {
        if (stageExists) throw new Error(`destination appeared during transaction: ${entry.destination}`);
        assertInventory(entry.destination, entry.newInventory, "refusing to remove non-transaction destination during recovery");
        removeContained(home, entry.destination, { recursive: true, force: false });
      }
      fs.renameSync(entry.packageBackup, entry.destination);
      fsyncDirectory(path.dirname(entry.destination));
    } else {
      if (!destinationExists) throw new Error(`original destination and quarantine are both missing: ${entry.destination}`);
      assertInventory(entry.destination, entry.oldInventory, "original destination is not recoverable");
    }
    if (entry.packageStage && lstatIfExists(entry.packageStage)) {
      assertInventory(entry.packageStage, entry.newInventory, "refusing to remove drifted package stage during recovery");
      removeContained(home, entry.packageStage, { recursive: true, force: false });
    }
  } catch (error) { errors.push(`${entry.label} package rollback failed: ${error.message}`); }
}

function rollbackReceipt(home, plan, entry, errors) {
  try {
    const stageExists = entry.receiptStage && lstatIfExists(entry.receiptStage);
    const backupExists = lstatIfExists(entry.receiptBackup);
    const receiptExists = lstatIfExists(entry.receipt);
    if (plan.operation === "install") {
      if (!stageExists && receiptExists) {
        if (!exactFile(entry.receipt, entry.newReceiptSha256)) throw new Error(`refusing to remove non-transaction receipt ${entry.receipt}`);
        removeContained(home, entry.receipt, { force: false });
      }
    } else if (backupExists) {
      if (receiptExists) {
        if (stageExists) throw new Error(`receipt appeared during transaction: ${entry.receipt}`);
        if (!exactFile(entry.receipt, entry.newReceiptSha256)) throw new Error(`refusing to remove non-transaction receipt ${entry.receipt}`);
        removeContained(home, entry.receipt, { force: false });
      }
      fs.renameSync(entry.receiptBackup, entry.receipt);
      fsyncDirectory(path.dirname(entry.receipt));
    } else {
      if (!receiptExists || !exactFile(entry.receipt, entry.oldReceiptSha256)) throw new Error(`original receipt is not recoverable: ${entry.receipt}`);
    }
    if (entry.receiptStage && lstatIfExists(entry.receiptStage)) {
      if (!exactFile(entry.receiptStage, entry.newReceiptSha256)) throw new Error(`refusing to remove drifted receipt stage ${entry.receiptStage}`);
      removeContained(home, entry.receiptStage, { force: false });
    }
  } catch (error) { errors.push(`${entry.label} receipt rollback failed: ${error.message}`); }
}

function removeJournal(home, plan) {
  removeContained(home, journalPaths(home, plan.transactionId).directory, { recursive: true, force: false });
}

function rollbackPlan(home, plan) {
  const errors = [];
  for (const entry of [...plan.entries].reverse()) {
    const before = errors.length;
    rollbackPackage(home, plan, entry, errors);
    if (errors.length === before) rollbackReceipt(home, plan, entry, errors);
  }
  if (errors.length === 0) {
    try { removeJournal(home, plan); } catch (error) { errors.push(`journal cleanup failed: ${error.message}`); }
  }
  return errors;
}

function finishCommittedPlan(home, plan) {
  const errors = [];
  for (const entry of plan.entries) {
    try {
      if (lstatIfExists(entry.packageBackup)) {
        assertInventory(entry.packageBackup, entry.oldInventory, "refusing to delete drifted package quarantine");
        removeContained(home, entry.packageBackup, { recursive: true, force: false });
      }
      if (entry.packageStage && lstatIfExists(entry.packageStage)) {
        assertInventory(entry.packageStage, entry.newInventory, "refusing to delete drifted package stage");
        removeContained(home, entry.packageStage, { recursive: true, force: false });
      }
    } catch (error) { errors.push(`${entry.label} package cleanup failed: ${error.message}`); }
    try {
      if (lstatIfExists(entry.receiptBackup)) {
        if (!exactFile(entry.receiptBackup, entry.oldReceiptSha256)) throw new Error(`refusing to delete drifted receipt quarantine ${entry.receiptBackup}`);
        removeContained(home, entry.receiptBackup, { force: false });
      }
      if (entry.receiptStage && lstatIfExists(entry.receiptStage)) {
        if (!exactFile(entry.receiptStage, entry.newReceiptSha256)) throw new Error(`refusing to delete drifted receipt stage ${entry.receiptStage}`);
        removeContained(home, entry.receiptStage, { force: false });
      }
    } catch (error) { errors.push(`${entry.label} receipt cleanup failed: ${error.message}`); }
  }
  if (errors.length === 0) {
    try { removeJournal(home, plan); } catch (error) { errors.push(`journal cleanup failed: ${error.message}`); }
  }
  return errors;
}

function recoverTransactionsLocked(home, dryRun = false) {
  const root = transactionRoot(home);
  assertContainedPath(home, root, "directory");
  if (!lstatIfExists(root)) return [];
  const directories = fs.readdirSync(root, { withFileTypes: true });
  if (directories.length > 0 && dryRun) throw new Error("interrupted installer transaction requires recovery; dry-run is read-only");
  const reports = [];
  for (const item of directories) {
    const directory = path.join(root, item.name);
    if (!item.isDirectory() || item.isSymbolicLink()) throw new Error(`unsafe transaction journal entry ${directory}`);
    if (!validateTransactionId(item.name)) throw new Error(`unsafe transaction journal identity ${directory}`);
    const journal = readJournal(home, directory);
    if (journal.discardable) {
      removeContained(home, directory, { recursive: true, force: false });
      reports.push(`RECOVERED discarded ${journal.intent ? journal.intent.operation : "incomplete"} ${item.name}`);
      continue;
    }
    const { plan } = journal;
    const committed = hasCommitMarker(home, plan);
    const errors = committed ? finishCommittedPlan(home, plan) : rollbackPlan(home, plan);
    if (errors.length > 0) throw new Error(`transaction recovery failed: ${errors.join("; ")}`);
    reports.push(`RECOVERED ${committed ? "committed" : "rolled back"} ${plan.operation} ${plan.transactionId}`);
  }
  return reports;
}

function recoverTransactions(home, dryRun = false) {
  if (dryRun) return withReadOnlyInstallerView(home, () => recoverTransactionsLocked(home, true));
  return withInstallerLock(home, () => recoverTransactionsLocked(home, dryRun));
}

function renameContained(home, from, to) {
  const fromStat = lstatIfExists(from);
  if (!fromStat) throw new Error(`transaction source disappeared: ${from}`);
  assertContainedPath(home, from, fromStat.isDirectory() ? "directory" : "file");
  assertContainedPath(home, to, fromStat.isDirectory() ? "directory" : "file");
  if (lstatIfExists(to)) throw new Error(`transaction destination appeared: ${to}`);
  fs.renameSync(from, to);
  fsyncDirectory(path.dirname(to));
  if (!samePathIdentity(path.dirname(from), path.dirname(to))) fsyncDirectory(path.dirname(from));
}

function applyPlan(home, plan) {
  for (const entry of plan.entries) {
    if (plan.operation === "update" || plan.operation === "uninstall") {
      renameContained(home, entry.destination, entry.packageBackup);
      faultPoint(`after-package-away:${entry.label}`);
      assertInventory(entry.packageBackup, entry.oldInventory, "owned package changed after preflight; restored without overwrite");
    } else if (lstatIfExists(entry.destination)) throw new Error(`destination appeared after preflight: ${entry.destination}`);

    if (plan.operation !== "uninstall") {
      renameContained(home, entry.packageStage, entry.destination);
      faultPoint(`after-package-installed:${entry.label}`);
      assertInventory(entry.destination, entry.newInventory, "installed package verification failed");
    }

    if (plan.operation === "update" || plan.operation === "uninstall") {
      renameContained(home, entry.receipt, entry.receiptBackup);
      faultPoint(`after-receipt-away:${entry.label}`);
      if (!exactFile(entry.receiptBackup, entry.oldReceiptSha256)) throw new Error(`ownership receipt changed after preflight: ${entry.receiptBackup}`);
    } else if (lstatIfExists(entry.receipt)) throw new Error(`ownership receipt appeared after preflight: ${entry.receipt}`);

    if (plan.operation !== "uninstall") {
      renameContained(home, entry.receiptStage, entry.receipt);
      faultPoint(`after-receipt-installed:${entry.label}`);
      if (!exactFile(entry.receipt, entry.newReceiptSha256)) throw new Error(`installed receipt verification failed: ${entry.receipt}`);
    }
  }
}

function mutateLocked(options, root) {
  const preflights = prepareTargets(options, root).map((target) => preflightTarget(target, options));
  if (options.dryRun) return preflights.map(({ target }) => `PLAN ${options.command} ${target.label} ${target.destinationDir}`);
  const transactionId = `${Date.now()}-${process.pid}-${crypto.randomBytes(8).toString("hex")}`;
  const intent = { schemaVersion: JOURNAL_SCHEMA_VERSION, transactionId, operation: options.command, home: canonicalPathIdentity(options.home), labels: preflights.map(({ target }) => target.label) };
  let paths;
  try { paths = createTransactionJournal(options.home, intent); }
  catch (error) {
    const journalDirectory = journalPaths(options.home, transactionId).directory;
    if (lstatIfExists(journalDirectory)) removeContained(options.home, journalDirectory, { recursive: true, force: true });
    throw new Error(`journal initialization failed: ${error.message}`);
  }
  const entries = [];
  try {
    for (const preflight of preflights) entries.push(stagePlanEntry(preflight, options, transactionId, paths.directory));
    faultPoint("after-staging-before-plan");
  } catch (error) {
    if (lstatIfExists(paths.directory)) removeContained(options.home, paths.directory, { recursive: true, force: true });
    throw new Error(`staging failed: ${error.message}`);
  }
  const plan = { schemaVersion: JOURNAL_SCHEMA_VERSION, transactionId, operation: options.command, home: canonicalPathIdentity(options.home), entries };
  try {
    publishJournalPlan(options.home, plan);
  } catch (error) {
    if (lstatIfExists(paths.directory)) removeContained(options.home, paths.directory, { recursive: true, force: true });
    throw new Error(`journal creation failed: ${error.message}`);
  }
  faultPoint("after-journal");
  let commitDurable = false;
  try {
    writeStartedMarker(options.home, plan);
    applyPlan(options.home, plan);
    writeCommitMarker(options.home, plan);
    commitDurable = true;
    faultPoint("after-commit-marker");
  } catch (error) {
    if (commitDurable) {
      const cleanupErrors = finishCommittedPlan(options.home, plan);
      const suffix = cleanupErrors.length ? `; cleanup pending: ${cleanupErrors.join("; ")}` : "";
      throw new Error(`transaction committed${suffix}`);
    }
    const commitPath = journalPaths(options.home, transactionId).commit;
    if (lstatIfExists(commitPath)) removeContained(options.home, commitPath, { force: true });
    const rollbackErrors = rollbackPlan(options.home, plan);
    const suffix = rollbackErrors.length ? `; recovery required: ${rollbackErrors.join("; ")}` : "";
    throw new Error(`${options.command} transaction failed: ${error.message}${suffix}`);
  }
  const cleanupErrors = finishCommittedPlan(options.home, plan);
  if (cleanupErrors.length > 0) throw new Error(`${options.command} committed, but cleanup requires recovery: ${cleanupErrors.join("; ")}`);
  return preflights.map(({ target }) => `PASS ${options.command === "install" ? "installed" : options.command === "update" ? "updated" : "uninstalled"} ${target.label} ${target.destinationDir}${options.command === "uninstall" ? " (profile data preserved)" : ""}`);
}

function mutate(options, root) {
  if (options.dryRun) return withReadOnlyInstallerView(options.home, () => mutateLocked(options, root));
  return withInstallerLock(options.home, () => mutateLocked(options, root));
}

function statusTarget(target, options) {
  guardTarget(target, options);
  const ownership = readReceipt(options.home, target.destinationDir);
  if (!ownership) return lstatIfExists(target.destinationDir) ? `UNOWNED ${target.label} ${target.destinationDir}` : `ABSENT ${target.label} ${target.destinationDir}`;
  const drift = inventoryDrift(target.destinationDir, ownership.receipt.inventory);
  return drift.length === 0 ? `OWNED ${target.label} ${target.destinationDir} @${ownership.receipt.version}` : `DRIFT ${target.label} ${target.destinationDir}: ${drift.join(", ")}`;
}

function execute(options, root = repoRoot()) {
  if (options.dryRun) {
    return withReadOnlyInstallerView(options.home, () => {
      const recovery = recoverTransactionsLocked(options.home, true);
      if (options.command === "status") return [...recovery, ...prepareTargets(options, root).map((target) => statusTarget(target, options))];
      return [...recovery, ...mutateLocked(options, root)];
    });
  }
  return withInstallerLock(options.home, () => {
    const recovery = recoverTransactionsLocked(options.home, options.dryRun);
    if (options.command === "status") return [...recovery, ...prepareTargets(options, root).map((target) => statusTarget(target, options))];
    return [...recovery, ...mutateLocked(options, root)];
  });
}

function throws(fn, pattern) { try { fn(); return false; } catch (error) { return pattern.test(error.message); } }

function runSelfTest() {
  const fixture = fs.mkdtempSync(path.join(os.tmpdir(), "aql-install-"));
  let failed = false;
  const check = (condition, label) => { console.log(`${condition ? "PASS" : "FAIL"} ${label}`); failed ||= !condition; };
  const writeSource = (source, contents, generatedAt) => {
    fs.mkdirSync(source, { recursive: true });
    fs.writeFileSync(path.join(source, "SKILL.md"), contents, "utf8");
    require("./gen-manifest").writeManifest(source, { generatedAt, name: PACKAGE_NAME });
  };
  const baseFor = (home, to = "agents") => ({ command: "install", to, dryRun: false, home });
  const targetFor = (home, label = "agents") => path.join(home, `.${label}`, "skills", PACKAGE_NAME);
  const childScript = [
    "const fs = require('fs');",
    "try {",
    "  const lines = require(process.env.AQL_INSTALL_MODULE).execute(JSON.parse(process.env.AQL_INSTALL_OPTIONS), process.env.AQL_INSTALL_ROOT);",
    "  if (process.env.AQL_INSTALL_TEST_RESULT) fs.writeFileSync(process.env.AQL_INSTALL_TEST_RESULT, JSON.stringify({ ok: true, lines }));",
    "} catch (error) {",
    "  if (process.env.AQL_INSTALL_TEST_RESULT) fs.writeFileSync(process.env.AQL_INSTALL_TEST_RESULT, JSON.stringify({ ok: false, error: error.message }));",
    "  console.error(error.message);",
    "  process.exitCode = 73;",
    "}",
  ].join("\n");
  const childEnvironment = (options, root, extra = {}) => ({ ...process.env, AQL_INSTALL_MODULE: __filename, AQL_INSTALL_OPTIONS: JSON.stringify(options), AQL_INSTALL_ROOT: root, AQL_INSTALL_SELF_TEST_CHILD: "1", ...extra });
  const runChild = (options, root, extra = {}) => require("child_process").spawnSync(process.execPath, ["-e", childScript], { env: childEnvironment(options, root, extra), encoding: "utf8" });
  const runCrash = (options, root, fault) => {
    const child = runChild(options, root, { [TEST_FAULT_ENV]: fault, AQL_INSTALL_TEST_FAULT_MODE: "exit" });
    return child.status;
  };
  const waitForFile = (filePath, label) => {
    const waiter = new Int32Array(new SharedArrayBuffer(4));
    const deadline = Date.now() + 15000;
    while (!fs.existsSync(filePath)) {
      if (Date.now() >= deadline) throw new Error(`timed out waiting for ${label}`);
      Atomics.wait(waiter, 0, 0, 20);
    }
  };
  try {
    const agentsSource = path.join(fixture, ".agents", "skills", PACKAGE_NAME);
    const cursorSource = path.join(fixture, ".cursor", "skills", PACKAGE_NAME);
    writeSource(agentsSource, "agents v1\n", "2000-01-01T00:00:00.000Z");
    writeSource(cursorSource, "cursor v1\n", "2000-01-01T00:00:00.000Z");

    const home = path.join(fixture, "happy-home");
    const base = baseFor(home);
    const profilePath = path.join(home, ".aql", "profile.json");
    const projectPath = path.join(home, "project", ".aql", "project.json");
    fs.mkdirSync(path.dirname(profilePath), { recursive: true });
    fs.mkdirSync(path.dirname(projectPath), { recursive: true });
    fs.writeFileSync(profilePath, "{\"schema_version\":2}\n", "utf8");
    fs.writeFileSync(projectPath, "{\"schema_version\":1}\n", "utf8");
    const dryHome = path.join(fixture, "dry-home");
    check(execute({ ...base, home: dryHome, dryRun: true }, fixture)[0].startsWith("PLAN install") && !fs.existsSync(dryHome), "install dry-run writes nothing");
    const isolatedTemp = path.join(fixture, "dry-run-temp");
    fs.mkdirSync(isolatedTemp);
    const savedTemp = { TEMP: process.env.TEMP, TMP: process.env.TMP, TMPDIR: process.env.TMPDIR };
    process.env.TEMP = isolatedTemp;
    process.env.TMP = isolatedTemp;
    process.env.TMPDIR = isolatedTemp;
    const isolatedDryHome = path.join(fixture, "isolated-dry-home");
    try {
      check(execute({ ...base, home: isolatedDryHome, dryRun: true }, fixture)[0].startsWith("PLAN install") && !fs.existsSync(isolatedDryHome) && !fs.existsSync(lockPaths(isolatedDryHome).root), "install dry-run creates no target or coordination state");
    } finally {
      for (const [name, value] of Object.entries(savedTemp)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
      }
    }
    const absentDryStatusHome = path.join(fixture, "absent-dry-status-home");
    check(execute({ ...base, command: "status", home: absentDryStatusHome, dryRun: true }, fixture)[0].startsWith("ABSENT") && !fs.existsSync(absentDryStatusHome), "status dry-run reports state without mutation preflight or writes");
    check(execute(base, fixture)[0].startsWith("PASS installed"), "install happy path records ownership");
    const target = targetFor(home);
    check(execute({ ...base, command: "status" }, fixture)[0].startsWith("OWNED"), "status recognizes owned snapshot");
    check(execute({ ...base, command: "update", dryRun: true }, fixture)[0].startsWith("PLAN update"), "update dry-run is read-only");
    writeSource(agentsSource, "agents v2\n", "2000-01-02T00:00:00.000Z");
    check(execute({ ...base, command: "update" }, fixture)[0].startsWith("PASS updated") && fs.readFileSync(path.join(target, "SKILL.md"), "utf8") === "agents v2\n", "update happy path replaces exact snapshot");
    fs.writeFileSync(path.join(target, "SKILL.md"), "drift\n", "utf8");
    check(execute({ ...base, command: "status" }, fixture)[0].startsWith("DRIFT"), "status reports drift");
    check(throws(() => execute({ ...base, command: "update" }, fixture), /has drift/), "drift blocks update");
    check(throws(() => execute({ ...base, command: "uninstall" }, fixture), /has drift/), "drift blocks uninstall");
    fs.writeFileSync(path.join(target, "SKILL.md"), "agents v2\n", "utf8");
    check(execute({ ...base, command: "uninstall", dryRun: true }, fixture)[0].startsWith("PLAN uninstall") && fs.existsSync(target), "uninstall dry-run is read-only");
    check(execute({ ...base, command: "uninstall" }, fixture)[0].startsWith("PASS uninstalled"), "uninstall happy path removes owned state");
    check(execute({ ...base, command: "status" }, fixture)[0].startsWith("ABSENT"), "status recognizes uninstalled target");
    check(fs.existsSync(profilePath) && fs.existsSync(projectPath), "uninstall preserves profile and project identity");

    if (process.platform === "win32") {
      const casingHome = path.join(fixture, "Case-Identity-Home");
      const casingVariant = path.join(fixture, "case-identity-home");
      const casingTarget = targetFor(casingHome);
      const casingVariantTarget = targetFor(casingVariant);
      writeSource(agentsSource, "case identity v1\n", "2000-01-02T12:00:00.000Z");
      const casingInstall = execute(baseFor(casingHome), fixture);
      const casingReceipt = readReceipt(casingVariant, casingVariantTarget);
      check(casingInstall[0].startsWith("PASS installed") && Boolean(casingReceipt) && casingReceipt.receipt.destination === canonicalPathIdentity(casingTarget) && path.basename(receiptPath(casingHome, casingTarget)) === path.basename(receiptPath(casingVariant, casingVariantTarget)) && lockPaths(casingHome).lock === lockPaths(casingVariant).lock, "Windows casing variants share canonical install, receipt, and lock identity");
      check(execute({ ...baseFor(casingVariant), command: "status" }, fixture)[0].startsWith("OWNED") && execute({ ...baseFor(casingVariant), command: "status", dryRun: true }, fixture)[0].startsWith("OWNED"), "Windows casing-variant status and status dry-run recognize ownership");
      writeSource(agentsSource, "case identity v2\n", "2000-01-02T13:00:00.000Z");
      check(execute({ ...baseFor(casingVariant), command: "update" }, fixture)[0].startsWith("PASS updated") && fs.readFileSync(path.join(casingTarget, "SKILL.md"), "utf8") === "case identity v2\n", "Windows casing-variant update preserves one owned target");
      check(execute({ ...baseFor(casingHome), command: "uninstall" }, fixture)[0].startsWith("PASS uninstalled") && execute({ ...baseFor(casingVariant), command: "status" }, fixture)[0].startsWith("ABSENT"), "Windows casing variants uninstall and report one ownership state");

      const casingCrashHome = path.join(fixture, "Crash-Case-Home");
      const casingCrashVariant = path.join(fixture, "crash-case-home");
      writeSource(agentsSource, "case crash old\n", "2000-01-02T14:00:00.000Z");
      execute(baseFor(casingCrashHome), fixture);
      writeSource(agentsSource, "case crash new\n", "2000-01-02T15:00:00.000Z");
      check(runCrash({ ...baseFor(casingCrashHome), command: "update" }, fixture, "after-receipt-installed:agents") === 86, "Windows casing recovery child terminates with a durable mixed-case journal");
      const casingRecovery = execute({ ...baseFor(casingCrashVariant), command: "status" }, fixture);
      check(casingRecovery.some((line) => line.startsWith("RECOVERED rolled back update")) && casingRecovery.some((line) => line.startsWith("OWNED")) && fs.readFileSync(path.join(targetFor(casingCrashVariant), "SKILL.md"), "utf8") === "case crash old\n", "Windows casing-variant restart validates journal identity and restores ownership");
      execute({ ...baseFor(casingCrashVariant), command: "uninstall" }, fixture);
    } else {
      check(true, "Windows casing identity lifecycle and crash recovery are platform-specific");
    }

    const unownedHome = path.join(fixture, "unowned-home");
    const unownedTarget = targetFor(unownedHome);
    fs.mkdirSync(unownedTarget, { recursive: true });
    fs.writeFileSync(path.join(unownedTarget, "mine.txt"), "keep\n", "utf8");
    check(throws(() => execute(baseFor(unownedHome), fixture), /unowned/), "install refuses unowned destination");
    check(fs.readFileSync(path.join(unownedTarget, "mine.txt"), "utf8") === "keep\n", "unowned destination is untouched");

    const stagingFailureHome = path.join(fixture, "staging-failure-home");
    const originalCopy = fs.cpSync;
    fs.cpSync = (from, to) => {
      fs.mkdirSync(to);
      fs.writeFileSync(path.join(to, "partial.txt"), "partial\n", "utf8");
      throw new Error("injected staging copy failure");
    };
    try { check(throws(() => execute(baseFor(stagingFailureHome), fixture), /staging copy failure/), "staging copy failure aborts before mutation"); }
    finally { fs.cpSync = originalCopy; }
    const stagingRoot = path.join(stagingFailureHome, ".agents", "skills");
    check(fs.existsSync(stagingRoot) && fs.readdirSync(stagingRoot).length === 0 && fs.readdirSync(transactionRoot(stagingFailureHome)).length === 0, "partial staging failure leaves no package, receipt, or transaction artifact");

    const concurrentHome = path.join(fixture, "concurrent-home");
    const concurrentReady = path.join(fixture, "concurrent.ready");
    const concurrentRelease = path.join(fixture, "concurrent.release");
    const concurrentResult = path.join(fixture, "concurrent.result.json");
    const holder = require("child_process").spawn(process.execPath, ["-e", childScript], {
      env: childEnvironment(baseFor(concurrentHome), fixture, { [TEST_FAULT_ENV]: "after-journal", AQL_INSTALL_TEST_FAULT_MODE: "hold", AQL_INSTALL_TEST_READY: concurrentReady, AQL_INSTALL_TEST_RELEASE: concurrentRelease, AQL_INSTALL_TEST_RESULT: concurrentResult }),
      stdio: "ignore",
    });
    waitForFile(concurrentReady, "active transaction holder");
    const activeTransactions = fs.readdirSync(transactionRoot(concurrentHome));
    const activePlan = path.join(transactionRoot(concurrentHome), activeTransactions[0], "plan.json");
    const lockOwner = JSON.parse(fs.readFileSync(lockPaths(concurrentHome).lock, "utf8"));
    const contender = runChild({ ...baseFor(concurrentHome), command: "status" }, fixture);
    check(lockOwner.pid === Number(fs.readFileSync(concurrentReady, "utf8").trim()) && Number.isFinite(Date.parse(lockOwner.acquiredAt)), "per-home lock durably records its live pid and acquisition time");
    check(activeTransactions.length === 1 && fs.existsSync(activePlan) && !fs.existsSync(targetFor(concurrentHome)) && contender.status === 73 && /locked by live pid/.test(contender.stderr), "concurrent process cannot recover an active transaction");
    check(fs.existsSync(activePlan) && fs.readdirSync(transactionRoot(concurrentHome)).length === 1, "contending command leaves the active journal untouched");
    fs.writeFileSync(concurrentRelease, "release\n", "utf8");
    waitForFile(concurrentResult, "active transaction completion");
    const holderResult = JSON.parse(fs.readFileSync(concurrentResult, "utf8"));
    check(holderResult.ok && execute({ ...baseFor(concurrentHome), command: "status" }, fixture)[0].startsWith("OWNED"), "lock holder completes after contention without rollback");
    holder.unref();

    const partialPlanHome = path.join(fixture, "partial-plan-home");
    check(runCrash(baseFor(partialPlanHome), fixture, "before-plan-rename") === 86, "abrupt child termination before atomic plan rename injected");
    const partialTransaction = path.join(transactionRoot(partialPlanHome), fs.readdirSync(transactionRoot(partialPlanHome))[0]);
    const partialEntries = fs.readdirSync(partialTransaction);
    check(fs.existsSync(lockPaths(partialPlanHome).lock) && fs.existsSync(path.join(partialTransaction, "intent.json")) && !fs.existsSync(path.join(partialTransaction, "plan.json")) && partialEntries.some((name) => /^\.plan\.json\.tmp-/.test(name)) && !fs.existsSync(targetFor(partialPlanHome)), "torn pre-mutation plan publication leaves only recoverable transaction-local state");
    const partialRecovery = execute({ ...baseFor(partialPlanHome), command: "status" }, fixture);
    check(partialRecovery.some((line) => line.startsWith("RECOVERED discarded install")) && partialRecovery.some((line) => line.startsWith("ABSENT")) && fs.readdirSync(transactionRoot(partialPlanHome)).length === 0 && !fs.existsSync(lockPaths(partialPlanHome).lock), "dead-owner lock is reclaimed and partial pre-mutation journal is cleaned safely");

    const stagedCrashHome = path.join(fixture, "staged-crash-home");
    check(runCrash(baseFor(stagedCrashHome), fixture, "after-staging-before-plan") === 86, "abrupt child termination after transaction-local staging injected");
    const stagedTransaction = path.join(transactionRoot(stagedCrashHome), fs.readdirSync(transactionRoot(stagedCrashHome))[0]);
    const discoveryRoot = path.join(stagedCrashHome, ".agents", "skills");
    check(fs.existsSync(path.join(stagedTransaction, "intent.json")) && fs.existsSync(path.join(stagedTransaction, "staging", "agents", "package")) && fs.readdirSync(discoveryRoot).length === 0, "staging is never exposed in a Skill discovery root and always has durable intent");
    const stagedRecovery = execute({ ...baseFor(stagedCrashHome), command: "status" }, fixture);
    check(stagedRecovery.some((line) => line.startsWith("RECOVERED discarded install")) && stagedRecovery.some((line) => line.startsWith("ABSENT")), "recovery validates and cleans transaction-local staging");

    const multiHome = path.join(fixture, "multi-uninstall-home");
    check(execute(baseFor(multiHome, "both"), fixture).every((line) => line.startsWith("PASS installed")), "multi-target install happy path");
    const multiAgents = targetFor(multiHome, "agents");
    const multiCursor = targetFor(multiHome, "cursor");
    fs.writeFileSync(path.join(multiCursor, "SKILL.md"), "late drift\n", "utf8");
    check(throws(() => execute({ ...baseFor(multiHome, "both"), command: "uninstall" }, fixture), /has drift/), "later drift blocks multi-target uninstall globally");
    check(fs.existsSync(multiAgents) && execute({ ...baseFor(multiHome, "agents"), command: "status" }, fixture)[0].startsWith("OWNED"), "global uninstall preflight leaves earlier target untouched");

    const lateDriftHome = path.join(fixture, "late-drift-home");
    execute(baseFor(lateDriftHome), fixture);
    writeSource(agentsSource, "agents v3\n", "2000-01-03T00:00:00.000Z");
    const lateTarget = targetFor(lateDriftHome);
    const originalRename = fs.renameSync;
    let injectedLateDrift = false;
    fs.renameSync = (from, to) => {
      originalRename(from, to);
      if (!injectedLateDrift && from === lateTarget && String(to).includes(".backup.")) {
        injectedLateDrift = true;
        fs.writeFileSync(path.join(to, "SKILL.md"), "late drift after preflight\n", "utf8");
      }
    };
    try { check(throws(() => execute({ ...baseFor(lateDriftHome), command: "update" }, fixture), /changed after preflight/), "update detects late drift after backup rename"); }
    finally { fs.renameSync = originalRename; }
    check(fs.readFileSync(path.join(lateTarget, "SKILL.md"), "utf8") === "late drift after preflight\n" && execute({ ...baseFor(lateDriftHome), command: "status" }, fixture)[0].startsWith("DRIFT"), "late drift is restored and never overwritten");

    const receiptMoveHome = path.join(fixture, "receipt-move-home");
    execute(baseFor(receiptMoveHome), fixture);
    const receiptMoveTarget = targetFor(receiptMoveHome);
    const receiptMovePath = receiptPath(receiptMoveHome, receiptMoveTarget);
    fs.renameSync = (from, to) => {
      if (from === receiptMovePath && String(to).includes(".uninstall.")) throw new Error("injected receipt quarantine failure");
      return originalRename(from, to);
    };
    try { check(throws(() => execute({ ...baseFor(receiptMoveHome), command: "uninstall" }, fixture), /receipt quarantine failure/), "receipt quarantine failure aborts uninstall"); }
    finally { fs.renameSync = originalRename; }
    check(fs.existsSync(receiptMoveTarget) && fs.existsSync(receiptMovePath) && execute({ ...baseFor(receiptMoveHome), command: "status" }, fixture)[0].startsWith("OWNED"), "receipt move failure rolls package and receipt back together");

    const cleanupHome = path.join(fixture, "cleanup-home");
    execute(baseFor(cleanupHome), fixture);
    const originalRm = fs.rmSync;
    let cleanupFailed = false;
    fs.rmSync = (targetPath, options) => {
      if (!cleanupFailed && String(targetPath).includes(`${path.sep}install-receipts${path.sep}`) && String(targetPath).includes(".uninstall.")) { cleanupFailed = true; throw new Error("injected receipt quarantine delete failure"); }
      return originalRm(targetPath, options);
    };
    try { check(throws(() => execute({ ...baseFor(cleanupHome), command: "uninstall" }, fixture), /cleanup requires recovery/), "receipt quarantine delete failure is reported"); }
    finally { fs.rmSync = originalRm; }
    check(execute({ ...baseFor(cleanupHome), command: "status" }, fixture).some((line) => line.startsWith("ABSENT")), "next command recovers committed uninstall cleanup without broken ownership");

    const crashInstallHome = path.join(fixture, "crash-install-home");
    check(runCrash(baseFor(crashInstallHome), fixture, "after-package-installed:agents") === 86, "abrupt install child termination injected");
    check(execute({ ...baseFor(crashInstallHome), command: "status" }, fixture).some((line) => line.startsWith("ABSENT")), "restart rolls interrupted install back");

    const crashUpdateHome = path.join(fixture, "crash-update-home");
    writeSource(agentsSource, "agents old\n", "2000-01-04T00:00:00.000Z");
    execute(baseFor(crashUpdateHome), fixture);
    writeSource(agentsSource, "agents new\n", "2000-01-05T00:00:00.000Z");
    check(runCrash({ ...baseFor(crashUpdateHome), command: "update" }, fixture, "after-receipt-installed:agents") === 86, "abrupt update child termination injected");
    check(execute({ ...baseFor(crashUpdateHome), command: "status" }, fixture).some((line) => line.startsWith("OWNED")) && fs.readFileSync(path.join(targetFor(crashUpdateHome), "SKILL.md"), "utf8") === "agents old\n", "restart restores interrupted update baseline");

    const crashUninstallHome = path.join(fixture, "crash-uninstall-home");
    execute(baseFor(crashUninstallHome), fixture);
    check(runCrash({ ...baseFor(crashUninstallHome), command: "uninstall" }, fixture, "after-receipt-away:agents") === 86, "abrupt uninstall child termination injected");
    check(execute({ ...baseFor(crashUninstallHome), command: "status" }, fixture).some((line) => line.startsWith("OWNED")), "restart restores interrupted uninstall package and receipt");

    const committedCrashHome = path.join(fixture, "committed-crash-home");
    execute(baseFor(committedCrashHome), fixture);
    check(runCrash({ ...baseFor(committedCrashHome), command: "uninstall" }, fixture, "after-commit-marker") === 86, "abrupt child termination after durable commit injected");
    const firstCommittedRecovery = execute({ ...baseFor(committedCrashHome), command: "status" }, fixture);
    const secondCommittedRecovery = execute({ ...baseFor(committedCrashHome), command: "status" }, fixture);
    check(firstCommittedRecovery.some((line) => line.startsWith("RECOVERED committed")) && firstCommittedRecovery.some((line) => line.startsWith("ABSENT")), "restart finishes committed quarantine cleanup");
    check(secondCommittedRecovery.length === 1 && secondCommittedRecovery[0].startsWith("ABSENT"), "transaction recovery is idempotent");

    const dryRecoveryHome = path.join(fixture, "dry-recovery-home");
    check(runCrash(baseFor(dryRecoveryHome), fixture, "after-journal") === 86, "durable journal exists before first ownership rename");
    const dryRecoveryLockBefore = readLockSnapshot(lockPaths(dryRecoveryHome).lock, dryRecoveryHome);
    const dryRecoveryTreeBefore = packageInventory(transactionRoot(dryRecoveryHome));
    const dryRecoveryRejected = throws(() => execute({ ...baseFor(dryRecoveryHome), dryRun: true }, fixture), /requires a non-dry command|locked by live pid/);
    const dryRecoveryLockAfter = readLockSnapshot(lockPaths(dryRecoveryHome).lock, dryRecoveryHome);
    check(dryRecoveryRejected && sameLockSnapshot(dryRecoveryLockBefore, dryRecoveryLockAfter) && JSON.stringify(dryRecoveryTreeBefore) === JSON.stringify(packageInventory(transactionRoot(dryRecoveryHome))), "dry-run refuses recovery without changing lock or transaction state");
    check(execute({ ...baseFor(dryRecoveryHome), command: "status" }, fixture).some((line) => line.startsWith("ABSENT")), "non-dry command performs pending recovery");

    const packageEscapeHome = path.join(fixture, "package-escape-home");
    const packageEscape = path.join(fixture, "package-escape-target");
    fs.mkdirSync(packageEscapeHome, { recursive: true });
    fs.mkdirSync(packageEscape, { recursive: true });
    try {
      fs.symlinkSync(packageEscape, path.join(packageEscapeHome, ".agents"), process.platform === "win32" ? "junction" : "dir");
      check(throws(() => execute(baseFor(packageEscapeHome), fixture), /escapes home/), "package ancestor link escape is rejected");
      check(fs.readdirSync(packageEscape).length === 0, "package escape receives no installer writes");
    } catch (error) { check(["EPERM", "EACCES"].includes(error.code), "package escape test skipped only when links are unavailable"); }

    const receiptEscapeHome = path.join(fixture, "receipt-escape-home");
    const receiptEscape = path.join(fixture, "receipt-escape-target");
    fs.mkdirSync(receiptEscapeHome, { recursive: true });
    fs.mkdirSync(receiptEscape, { recursive: true });
    try {
      fs.symlinkSync(receiptEscape, path.join(receiptEscapeHome, ".aql"), process.platform === "win32" ? "junction" : "dir");
      check(throws(() => execute(baseFor(receiptEscapeHome), fixture), /escapes home/), "receipt-root link escape is rejected");
      check(fs.readdirSync(receiptEscape).length === 0, "receipt-root escape receives no installer writes");
    } catch (error) { check(["EPERM", "EACCES"].includes(error.code), "receipt escape test skipped only when links are unavailable"); }

    const uninstallEscapeHome = path.join(fixture, "uninstall-escape-home");
    execute(baseFor(uninstallEscapeHome), fixture);
    const externalAgents = path.join(fixture, "uninstall-external-agents");
    fs.renameSync(path.join(uninstallEscapeHome, ".agents"), externalAgents);
    try {
      fs.symlinkSync(externalAgents, path.join(uninstallEscapeHome, ".agents"), process.platform === "win32" ? "junction" : "dir");
      check(throws(() => execute({ ...baseFor(uninstallEscapeHome), command: "uninstall" }, fixture), /escapes home/), "uninstall rejects ancestor link escape");
      check(fs.existsSync(path.join(externalAgents, "skills", PACKAGE_NAME)), "uninstall escape leaves external package untouched");
    } catch (error) { check(["EPERM", "EACCES"].includes(error.code), "uninstall escape test skipped only when links are unavailable"); }
  } finally {
    delete process.env[TEST_FAULT_ENV];
    fs.rmSync(fixture, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

const USAGE = "Usage: node scripts/install.js [install|status|update|uninstall] [--to agents|cursor|claude|both|all] [--dry-run] [--home <dir>]";
function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === "--self-test") return runSelfTest();
  if (argv.includes("--help") || argv.includes("-h")) { console.log(USAGE); return 0; }
  try { for (const line of execute(parseArgs([...argv]))) console.log(line); return 0; }
  catch (error) { console.error(`FAIL ${error.message}`); return 1; }
}

if (require.main === module) process.exitCode = main();
module.exports = { main, runSelfTest, parseArgs, targetRoots, sourceRootForTarget, resolveSourceDir, receiptPath, readReceipt, inventoryDrift, recoverTransactions, execute, PACKAGE_NAME };
