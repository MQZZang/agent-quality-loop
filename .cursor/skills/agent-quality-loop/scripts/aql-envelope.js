#!/usr/bin/env node
"use strict";

// Local envelope cache writer. Structure+ref validation only; does not claim
// semantic truth. Never escalates authority via CLI flags. Does not edit .gitignore.
// Missing-envelope stop gate is intentionally not implemented here (hooks unchanged).

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  AUTHORITIES,
  baseEnvelope,
  validateEnvelope,
  validateRefPaths,
} = require("./validate-envelope");
const { loadWorkspaceSnapshots } = require("./snapshot-chain");

const AQL_DIR_NAME = ".agent-quality-loop";
const CURRENT_NAME = "envelope.json";
const HISTORY_DIR_NAME = "history";
const WRITE_LOCK_NAME = ".write.lock";
const WRITER_ID = "aql-envelope@3.0.0";
const CONTENT_SHA256_RE = /^[a-f0-9]{64}$/;

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(chunks.join("")));
    process.stdin.on("error", reject);
  });
}

async function readEnvelopeInput(inputPath) {
  if (!inputPath || inputPath === "-") {
    return readStdin();
  }
  return fs.readFileSync(inputPath, "utf8");
}

function digestContent(canonicalJson) {
  return crypto.createHash("sha256").update(canonicalJson, "utf8").digest("hex");
}

function canonicalizeEnvelope(envelope) {
  return `${JSON.stringify(envelope, null, 2)}\n`;
}

function sanitizeContractId(contractId) {
  return String(contractId)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 64) || "contract";
}

function utcStamp(date = new Date()) {
  return date
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[-:]/g, "");
}

function historyFileName(envelope, digest) {
  const stamp = utcStamp();
  const contract = sanitizeContractId(envelope.contract_id);
  const phase = String(envelope.phase || "UNKNOWN").replace(/[^A-Za-z0-9._-]+/g, "_");
  const sequence =
    envelope.snapshot && Number.isInteger(envelope.snapshot.sequence)
      ? envelope.snapshot.sequence
      : 0;
  const prefix = digest.slice(0, 12);
  return `${stamp}_${contract}_seq${sequence}_${phase}_${prefix}.json`;
}

function isSymlinkOrJunction(targetPath) {
  try {
    const stat = fs.lstatSync(targetPath);
    if (stat.isSymbolicLink()) return true;
    // Windows directory junctions often report as directories via lstat without
    // isSymbolicLink; detect via reparse-point bit when available.
    if (process.platform === "win32" && typeof stat.isDirectory === "function" && (stat.mode & 0o100000) === 0) {
      // Fall through  - Node marks junctions as symbolic links on modern Node.
    }
    return false;
  } catch (error) {
    if (error && (error.code === "ENOENT" || error.code === "ENOTDIR")) return false;
    throw error;
  }
}

function assertNotSymlink(targetPath, label) {
  if (!fs.existsSync(targetPath) && !pathExistsLstat(targetPath)) return;
  if (isSymlinkOrJunction(targetPath)) {
    const err = new Error(`${label} must not be a symlink or junction: ${targetPath}`);
    err.code = "ELOOP";
    throw err;
  }
}

function pathExistsLstat(targetPath) {
  try {
    fs.lstatSync(targetPath);
    return true;
  } catch {
    return false;
  }
}

function ensureInsideWorkspace(workspaceRoot, candidatePath) {
  const root = workspaceRoot.endsWith(path.sep) ? workspaceRoot : `${workspaceRoot}${path.sep}`;
  const resolved = path.resolve(candidatePath);
  if (resolved !== workspaceRoot && !resolved.startsWith(root)) {
    const err = new Error(`path escapes workspace: ${candidatePath}`);
    err.code = "EPATH";
    throw err;
  }
  return resolved;
}

function mkdirPrivate(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true, mode: 0o700 });
  try {
    fs.chmodSync(dirPath, 0o700);
  } catch {
    // Windows may ignore POSIX modes; degrade honestly.
  }
}

function writeFilePrivateExclusive(filePath, contents) {
  const fd = fs.openSync(filePath, "wx", 0o600);
  try {
    fs.writeFileSync(fd, contents, "utf8");
    try {
      fs.fchmodSync(fd, 0o600);
    } catch {
      // Windows may ignore POSIX modes.
    }
  } finally {
    fs.closeSync(fd);
  }
}

function writeFilePrivateReplace(workspaceRoot, filePath, contents) {
  const dir = path.dirname(filePath);
  const tempName = `.envelope.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString("hex")}.tmp`;
  const tempPath = path.join(dir, tempName);
  // Temp must stay in the same directory as the current cache for atomic replace.
  ensureInsideWorkspace(workspaceRoot, tempPath);
  assertNotSymlink(tempPath, "temp file");
  const fd = fs.openSync(tempPath, "wx", 0o600);
  try {
    fs.writeFileSync(fd, contents, "utf8");
    try {
      fs.fchmodSync(fd, 0o600);
    } catch {
      // Windows may ignore POSIX modes.
    }
  } finally {
    fs.closeSync(fd);
  }
  assertNotSymlink(tempPath, "temp file");
  try {
    fs.renameSync(tempPath, filePath);
  } catch (error) {
    // Windows: replace existing file when rename cannot overwrite.
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      fs.renameSync(tempPath, filePath);
    } catch (replaceError) {
      try {
        fs.unlinkSync(tempPath);
      } catch {
        // ignore cleanup failure
      }
      throw replaceError;
    }
  }
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Windows may ignore POSIX modes.
  }
}

function authorityAllowsWrite(actionAuthority) {
  const index = AUTHORITIES.indexOf(actionAuthority);
  const localWriteIndex = AUTHORITIES.indexOf("local_write");
  return index >= localWriteIndex;
}

function sleepMs(ms) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    // short busy-wait lock retry; lock is only for sequence allocation
  }
}

function acquireWriteLock(aqlDir) {
  const lockPath = path.join(aqlDir, WRITE_LOCK_NAME);
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      writeFilePrivateExclusive(lockPath, `${process.pid}\n`);
      return lockPath;
    } catch (error) {
      if (!error || error.code !== "EEXIST") throw error;
      // Stale lock recovery: if older than 30s, replace.
      try {
        const ageMs = Date.now() - fs.statSync(lockPath).mtimeMs;
        if (ageMs > 30000) {
          fs.unlinkSync(lockPath);
          continue;
        }
      } catch {
        // retry
      }
      sleepMs(25);
    }
  }
  const err = new Error("unable to acquire envelope write lock");
  err.code = "EEXIST";
  throw err;
}

function releaseWriteLock(lockPath) {
  if (!lockPath) return;
  try {
    fs.unlinkSync(lockPath);
  } catch {
    // best-effort
  }
}

function readEnvelopeFile(filePath) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    const envelope = JSON.parse(raw);
    if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) return null;
    return { raw, envelope, digest: digestContent(raw) };
  } catch {
    return null;
  }
}

function listCandidateSnapshotFiles(historyDir, currentPath) {
  const files = [];
  if (fs.existsSync(currentPath)) files.push(currentPath);
  if (!fs.existsSync(historyDir)) return files;
  for (const name of fs.readdirSync(historyDir)) {
    if (!name.endsWith(".json")) continue;
    files.push(path.join(historyDir, name));
  }
  return files;
}

function formatChainError(chain) {
  const parts = [];
  if (chain.pollutedFiles && chain.pollutedFiles.length > 0) {
    parts.push(`pollutedFiles: ${chain.pollutedFiles.join(", ")}`);
  }
  if (chain.errors && chain.errors.length > 0) {
    parts.push(`ordering: ${chain.errors.join("; ")}`);
  }
  return parts.join(" | ");
}

function assertChainWritable(workspaceRoot, contractId) {
  const chain = loadWorkspaceSnapshots(workspaceRoot, contractId);
  if (chain.pollutedFiles.length > 0 || chain.status === "invalid") {
    const err = new Error(`EORDER: snapshot chain invalid  - ${formatChainError(chain)}`);
    err.code = "EORDER";
    err.chain = chain;
    throw err;
  }
  return chain;
}

function stripCallerSnapshot(envelope) {
  const next = { ...envelope };
  delete next.snapshot;
  return next;
}

function injectWriterSnapshot(envelope, sequence, previousDigest) {
  return {
    ...envelope,
    snapshot: {
      id: crypto.randomBytes(16).toString("hex"),
      recorded_at: new Date().toISOString(),
      sequence,
      previous_digest: previousDigest,
      writer: WRITER_ID,
    },
  };
}

function classifyError(error) {
  if (!error) return 2;
  if (error.code === "EACCES" || error.code === "EPERM") return 3;
  if (error.code === "ELOOP" || error.code === "EPATH") return 1;
  if (error.code === "EINVAL") return 1;
  if (error.code === "EORDER") return 1;
  return 2;
}

function prepareWorkspace(workspaceArg) {
  if (!workspaceArg) {
    const err = new Error("--workspace is required");
    err.code = "EINVAL";
    throw err;
  }
  let workspaceRoot;
  try {
    workspaceRoot = fs.realpathSync(path.resolve(workspaceArg));
  } catch (error) {
    const err = new Error(`workspace path is invalid: ${error.message}`);
    err.code = error.code || "ENOENT";
    throw err;
  }
  let workspaceStat;
  try {
    workspaceStat = fs.statSync(workspaceRoot);
  } catch (error) {
    const err = new Error(`workspace is not accessible: ${error.message}`);
    err.code = error.code || "ENOENT";
    throw err;
  }
  if (!workspaceStat.isDirectory()) {
    const err = new Error("workspace must be a directory");
    err.code = "ENOTDIR";
    throw err;
  }
  return workspaceRoot;
}

function writeEnvelope(workspaceRoot, envelopeInput) {
  if (!envelopeInput || typeof envelopeInput !== "object" || Array.isArray(envelopeInput)) {
    const err = new Error("envelope must be a JSON object");
    err.code = "EINVAL";
    throw err;
  }

  // Caller cannot forge ordering metadata; strip any supplied snapshot.
  const envelope = stripCallerSnapshot(envelopeInput);

  if (!authorityAllowsWrite(envelope.action_authority)) {
    const err = new Error(
      `action_authority ${envelope.action_authority} cannot write local envelope cache (requires local_write or higher)`,
    );
    err.code = "EINVAL";
    throw err;
  }

  const structural = validateEnvelope(envelope);
  if (structural.length > 0) {
    const err = new Error(structural.join("; "));
    err.code = "EINVAL";
    err.validationErrors = structural;
    throw err;
  }
  const refErrors = validateRefPaths(envelope, workspaceRoot);
  if (refErrors.length > 0) {
    const err = new Error(refErrors.join("; "));
    err.code = "EINVAL";
    err.validationErrors = refErrors;
    throw err;
  }

  const aqlDir = path.join(workspaceRoot, AQL_DIR_NAME);
  const historyDir = path.join(aqlDir, HISTORY_DIR_NAME);
  const currentPath = path.join(aqlDir, CURRENT_NAME);

  ensureInsideWorkspace(workspaceRoot, aqlDir);
  ensureInsideWorkspace(workspaceRoot, historyDir);
  ensureInsideWorkspace(workspaceRoot, currentPath);

  if (pathExistsLstat(aqlDir)) assertNotSymlink(aqlDir, AQL_DIR_NAME);
  if (pathExistsLstat(historyDir)) assertNotSymlink(historyDir, "history");
  if (pathExistsLstat(currentPath)) assertNotSymlink(currentPath, CURRENT_NAME);

  if (!fs.existsSync(aqlDir)) mkdirPrivate(aqlDir);
  assertNotSymlink(aqlDir, AQL_DIR_NAME);
  if (!fs.existsSync(historyDir)) mkdirPrivate(historyDir);
  assertNotSymlink(historyDir, "history");

  let lockPath = null;
  let prepared;
  try {
    lockPath = acquireWriteLock(aqlDir);
    const chain = assertChainWritable(workspaceRoot, envelope.contract_id);
    const sequence = chain.nextSequence;
    const previousDigest = chain.previousDigest;
    prepared = injectWriterSnapshot(envelope, sequence, previousDigest);

    const canonical = canonicalizeEnvelope(prepared);
    const digest = digestContent(canonical);
    let historyName = historyFileName(prepared, digest);
    let historyPath = path.join(historyDir, historyName);
    ensureInsideWorkspace(workspaceRoot, historyPath);

    // Exclusive create; never overwrite history. Retry with entropy if name collides.
    let created = false;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      if (pathExistsLstat(historyPath)) assertNotSymlink(historyPath, "history file");
      try {
        writeFilePrivateExclusive(historyPath, canonical);
        created = true;
        break;
      } catch (error) {
        if (error && error.code === "EEXIST") {
          historyName = historyFileName(prepared, digest).replace(
            /\.json$/,
            `_${crypto.randomBytes(3).toString("hex")}.json`,
          );
          historyPath = path.join(historyDir, historyName);
          ensureInsideWorkspace(workspaceRoot, historyPath);
          continue;
        }
        throw error;
      }
    }
    if (!created) {
      const err = new Error("unable to create unique history snapshot");
      err.code = "EEXIST";
      throw err;
    }

    try {
      writeFilePrivateReplace(workspaceRoot, currentPath, canonical);
    } catch (error) {
      // History already written; current cache update failure must not claim success.
      throw error;
    }
    assertNotSymlink(currentPath, CURRENT_NAME);

    return {
      workspace: workspaceRoot,
      current_path: currentPath,
      history_path: historyPath,
      digest,
      contract_id: prepared.contract_id,
      phase: prepared.phase,
      sequence: prepared.snapshot.sequence,
      snapshot_id: prepared.snapshot.id,
    };
  } finally {
    releaseWriteLock(lockPath);
  }
}

function parseCliArgs(argv) {
  const options = {
    selfTest: false,
    workspace: null,
    inputPath: null,
    inputExplicit: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--self-test") {
      options.selfTest = true;
      continue;
    }
    if (arg === "--workspace") {
      const value = argv[++index];
      if (!value) throw new Error("--workspace requires a directory");
      options.workspace = value;
      continue;
    }
    if (arg.startsWith("--workspace=")) {
      options.workspace = arg.slice("--workspace=".length);
      continue;
    }
    if (arg === "--input") {
      const value = argv[++index];
      if (!value) throw new Error("--input requires a path or -");
      options.inputPath = value;
      options.inputExplicit = true;
      continue;
    }
    if (arg.startsWith("--input=")) {
      options.inputPath = arg.slice("--input=".length);
      options.inputExplicit = true;
      continue;
    }
    if (arg.startsWith("-")) {
      throw new Error(`Unknown argument: ${arg}`);
    }
    throw new Error(`Unexpected argument: ${arg}`);
  }
  return options;
}

function tryCreateDirJunctionOrSymlink(linkPath, targetPath) {
  try {
    fs.symlinkSync(targetPath, linkPath, "junction");
    return true;
  } catch {
    try {
      fs.symlinkSync(targetPath, linkPath, "dir");
      return true;
    } catch {
      return false;
    }
  }
}

function runSelfTest() {
  const fixtures = [];
  let failed = false;
  const pass = (name) => console.log(`PASS ${name}`);
  const fail = (name, detail) => {
    console.log(`FAIL ${name}${detail ? `: ${detail}` : ""}`);
    failed = true;
  };
  const check = (condition, name, detail) => {
    if (condition) pass(name);
    else fail(name, detail);
  };

  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aql-envelope-writer-"));
  fixtures.push(root);

  try {
    // --- valid local_write success ---
    const workspace = path.join(root, "ws-ok");
    fs.mkdirSync(workspace, { recursive: true });
    const present = path.join(workspace, "present.txt");
    fs.writeFileSync(present, "ok\n", "utf8");
    const envelope = baseEnvelope();
    envelope.artifact_refs = ["./present.txt"];
    envelope.evidence_refs = ["focused-test@result"];
    let summary;
    try {
      summary = writeEnvelope(workspace, envelope);
      check(true, "valid local_write success");
    } catch (error) {
      fail("valid local_write success", error.message);
    }

    if (summary) {
      const currentRaw = fs.readFileSync(summary.current_path, "utf8");
      const historyRaw = fs.readFileSync(summary.history_path, "utf8");
      check(currentRaw === historyRaw, "current cache == history snapshot content");
      const requiredFields = [
        "workspace",
        "current_path",
        "history_path",
        "digest",
        "contract_id",
        "phase",
        "sequence",
        "snapshot_id",
      ];
      check(
        requiredFields.every((field) => Object.prototype.hasOwnProperty.call(summary, field) && summary[field]),
        "summary fields present",
      );
      const written = JSON.parse(currentRaw);
      check(
        written.snapshot &&
          written.snapshot.sequence === 1 &&
          written.snapshot.previous_digest === null &&
          written.snapshot.writer === "aql-envelope@3.0.0" &&
          typeof written.snapshot.recorded_at === "string" &&
          written.snapshot.recorded_at.includes("."),
        "writer injects snapshot metadata",
      );
      check(
        path.basename(summary.history_path).includes("_seq1_") &&
          path.basename(summary.history_path).includes(`_${summary.digest.slice(0, 12)}.json`),
        "history filename includes sequence phase digest",
      );

      // consecutive writes ->different history files + monotonic sequence
      const summary2 = writeEnvelope(workspace, envelope);
      check(summary.history_path !== summary2.history_path, "same contract/phase consecutive writes ->different history files");
      check(fs.existsSync(summary.history_path) && fs.existsSync(summary2.history_path), "history not overwritten");
      const second = JSON.parse(fs.readFileSync(summary2.current_path, "utf8"));
      check(
        second.snapshot.sequence === 2 && second.snapshot.previous_digest === summary.digest,
        "sequence monotonic with previous_digest chain",
      );

      // caller-supplied snapshot is stripped/overwritten
      const forged = baseEnvelope();
      forged.artifact_refs = ["./present.txt"];
      forged.evidence_refs = ["focused-test@result"];
      forged.snapshot = {
        id: "forged",
        recorded_at: "2000-01-01T00:00:00.000Z",
        sequence: 99,
        previous_digest: null,
        writer: "aql-envelope@0.0.0",
      };
      const summary3 = writeEnvelope(workspace, forged);
      const third = JSON.parse(fs.readFileSync(summary3.current_path, "utf8"));
      check(
        third.snapshot.sequence === 3 &&
          third.snapshot.id !== "forged" &&
          third.snapshot.writer === "aql-envelope@3.0.0",
        "caller-supplied snapshot cannot forge writer metadata",
      );
    }

    // --- invalid JSON ->no files ---
    const wsBadJson = path.join(root, "ws-bad-json");
    fs.mkdirSync(wsBadJson, { recursive: true });
    const badJsonPath = path.join(root, "bad.json");
    fs.writeFileSync(badJsonPath, "{not json", "utf8");
    // Synchronous CLI-shaped path: parse failure must not create cache.
    let badJsonCode = 0;
    try {
      JSON.parse(fs.readFileSync(badJsonPath, "utf8"));
      badJsonCode = 0;
    } catch {
      badJsonCode = 2;
    }
    check(
      badJsonCode === 2 && !fs.existsSync(path.join(wsBadJson, AQL_DIR_NAME)),
      "invalid JSON ->no files",
    );

    // --- structurally invalid ->no files ---
    const wsStruct = path.join(root, "ws-struct");
    fs.mkdirSync(wsStruct, { recursive: true });
    const badStruct = baseEnvelope();
    badStruct.contract_id = "";
    let structError = null;
    try {
      writeEnvelope(wsStruct, badStruct);
    } catch (error) {
      structError = error;
    }
    check(!!structError && !fs.existsSync(path.join(wsStruct, AQL_DIR_NAME)), "structurally invalid ->no files");

    // --- missing reference ->no files ---
    const wsMissingRef = path.join(root, "ws-missing-ref");
    fs.mkdirSync(wsMissingRef, { recursive: true });
    const missingRef = baseEnvelope();
    missingRef.artifact_refs = ["./missing.txt"];
    let missingErr = null;
    try {
      writeEnvelope(wsMissingRef, missingRef);
    } catch (error) {
      missingErr = error;
    }
    check(
      !!missingErr && String(missingErr.message).includes("missing path refs") && !fs.existsSync(path.join(wsMissingRef, AQL_DIR_NAME)),
      "missing reference ->no files",
    );

    // --- read authority reject ->no files ---
    const wsRead = path.join(root, "ws-read");
    fs.mkdirSync(wsRead, { recursive: true });
    fs.writeFileSync(path.join(wsRead, "present.txt"), "ok\n", "utf8");
    const readEnv = baseEnvelope();
    readEnv.intent = "diagnose";
    readEnv.mode = "evidence";
    readEnv.phase = "EVIDENCED";
    readEnv.next_allowed_phase = null;
    readEnv.stop_reason = "evidence_only_complete";
    readEnv.action_authority = "read";
    readEnv.executor_adapter = null;
    readEnv.implementation_receipt = null;
    readEnv.artifact_refs = ["./present.txt"];
    let readErr = null;
    try {
      writeEnvelope(wsRead, readEnv);
    } catch (error) {
      readErr = error;
    }
    check(!!readErr && !fs.existsSync(path.join(wsRead, AQL_DIR_NAME)), "read authority reject ->no files");

    // --- path traversal reject ---
    const wsTrav = path.join(root, "ws-trav");
    fs.mkdirSync(wsTrav, { recursive: true });
    let travErr = null;
    try {
      ensureInsideWorkspace(fs.realpathSync(wsTrav), path.join(wsTrav, "..", "escape.json"));
    } catch (error) {
      travErr = error;
    }
    check(!!travErr && travErr.code === "EPATH", "path traversal reject");

    // --- current cache no partial JSON left ---
    const wsPartial = path.join(root, "ws-partial");
    fs.mkdirSync(wsPartial, { recursive: true });
    fs.writeFileSync(path.join(wsPartial, "present.txt"), "ok\n", "utf8");
    const partialEnv = baseEnvelope();
    partialEnv.artifact_refs = ["./present.txt"];
    const partialSummary = writeEnvelope(wsPartial, partialEnv);
    const currentText = fs.readFileSync(partialSummary.current_path, "utf8");
    let parsedOk = false;
    try {
      JSON.parse(currentText);
      parsedOk = currentText.endsWith("\n");
    } catch {
      parsedOk = false;
    }
    const tmpLeft = fs
      .readdirSync(path.join(wsPartial, AQL_DIR_NAME))
      .filter((name) => name.endsWith(".tmp"));
    check(parsedOk && tmpLeft.length === 0, "current cache no partial JSON left");

    // --- symlink / junction rejects ---
    const wsSymAql = path.join(root, "ws-sym-aql");
    fs.mkdirSync(wsSymAql, { recursive: true });
    fs.writeFileSync(path.join(wsSymAql, "present.txt"), "ok\n", "utf8");
    const realAql = path.join(root, "real-aql-target");
    fs.mkdirSync(realAql, { recursive: true });
    const linkAql = path.join(wsSymAql, AQL_DIR_NAME);
    const createdAqlLink = tryCreateDirJunctionOrSymlink(linkAql, realAql);
    if (!createdAqlLink) {
      console.log("PASS SKIP symlink test (platform): symlinked .agent-quality-loop");
    } else {
      const symEnv = baseEnvelope();
      symEnv.artifact_refs = ["./present.txt"];
      let symErr = null;
      try {
        writeEnvelope(wsSymAql, symEnv);
      } catch (error) {
        symErr = error;
      }
      check(!!symErr && /symlink|junction/i.test(String(symErr.message)), "symlinked .agent-quality-loop reject");
    }

    const wsSymHist = path.join(root, "ws-sym-hist");
    fs.mkdirSync(path.join(wsSymHist, AQL_DIR_NAME), { recursive: true });
    fs.writeFileSync(path.join(wsSymHist, "present.txt"), "ok\n", "utf8");
    const realHist = path.join(root, "real-hist-target");
    fs.mkdirSync(realHist, { recursive: true });
    const linkHist = path.join(wsSymHist, AQL_DIR_NAME, HISTORY_DIR_NAME);
    const createdHistLink = tryCreateDirJunctionOrSymlink(linkHist, realHist);
    if (!createdHistLink) {
      console.log("PASS SKIP symlink test (platform): symlinked history");
    } else {
      const symHistEnv = baseEnvelope();
      symHistEnv.artifact_refs = ["./present.txt"];
      let histErr = null;
      try {
        writeEnvelope(wsSymHist, symHistEnv);
      } catch (error) {
        histErr = error;
      }
      check(!!histErr && /symlink|junction/i.test(String(histErr.message)), "symlinked history reject");
    }

    // --- EORDER: forged sequence 999 in history blocks append ---
    const wsOrder999 = path.join(root, "ws-order-999");
    fs.mkdirSync(wsOrder999, { recursive: true });
    fs.writeFileSync(path.join(wsOrder999, "present.txt"), "ok\n", "utf8");
    const order999Env = baseEnvelope();
    order999Env.artifact_refs = ["./present.txt"];
    order999Env.evidence_refs = ["focused-test@result"];
    const order999Summary = writeEnvelope(wsOrder999, order999Env);
    const forged999Path = path.join(wsOrder999, AQL_DIR_NAME, HISTORY_DIR_NAME, "forged-999.json");
    const forged999 = JSON.parse(fs.readFileSync(order999Summary.current_path, "utf8"));
    forged999.snapshot = {
      id: crypto.randomBytes(16).toString("hex"),
      recorded_at: new Date().toISOString(),
      sequence: 999,
      previous_digest: order999Summary.digest,
      writer: WRITER_ID,
    };
    fs.writeFileSync(forged999Path, `${JSON.stringify(forged999, null, 2)}\n`, "utf8");
    let order999Err = null;
    try {
      writeEnvelope(wsOrder999, order999Env);
    } catch (error) {
      order999Err = error;
    }
    check(!!order999Err && order999Err.code === "EORDER", "pseudo sequence 999 ->EORDER");
    const after999 = JSON.parse(fs.readFileSync(order999Summary.current_path, "utf8"));
    check(after999.snapshot.sequence === 1, "EORDER blocks append after forged sequence");

    // --- EORDER: broken previous_digest ---
    const wsBrokenPrev = path.join(root, "ws-broken-prev");
    fs.mkdirSync(wsBrokenPrev, { recursive: true });
    fs.writeFileSync(path.join(wsBrokenPrev, "present.txt"), "ok\n", "utf8");
    const brokenEnv = baseEnvelope();
    brokenEnv.contract_id = "broken-prev-chain";
    brokenEnv.implementation_receipt.input_contract_ref = "broken-prev-chain@tree";
    brokenEnv.resume_ref = "broken-prev-chain@tree";
    brokenEnv.artifact_refs = ["./present.txt"];
    brokenEnv.evidence_refs = ["focused-test@result"];
    const broken1 = writeEnvelope(wsBrokenPrev, brokenEnv);
    const broken2Raw = JSON.parse(fs.readFileSync(broken1.current_path, "utf8"));
    broken2Raw.snapshot = {
      id: crypto.randomBytes(16).toString("hex"),
      recorded_at: new Date().toISOString(),
      sequence: 2,
      previous_digest: "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
      writer: WRITER_ID,
    };
    fs.writeFileSync(
      path.join(wsBrokenPrev, AQL_DIR_NAME, HISTORY_DIR_NAME, "broken-prev-2.json"),
      `${JSON.stringify(broken2Raw, null, 2)}\n`,
    );
    let brokenPrevErr = null;
    try {
      writeEnvelope(wsBrokenPrev, brokenEnv);
    } catch (error) {
      brokenPrevErr = error;
    }
    check(!!brokenPrevErr && brokenPrevErr.code === "EORDER", "broken previous_digest ->EORDER");

    // --- EORDER: duplicate sequence ---
    const wsDupSeq = path.join(root, "ws-dup-seq");
    fs.mkdirSync(wsDupSeq, { recursive: true });
    fs.writeFileSync(path.join(wsDupSeq, "present.txt"), "ok\n", "utf8");
    const dupEnv = baseEnvelope();
    dupEnv.contract_id = "dup-seq-chain";
    dupEnv.implementation_receipt.input_contract_ref = "dup-seq-chain@tree";
    dupEnv.resume_ref = "dup-seq-chain@tree";
    dupEnv.artifact_refs = ["./present.txt"];
    dupEnv.evidence_refs = ["focused-test@result"];
    const dup1 = writeEnvelope(wsDupSeq, dupEnv);
    const dupCopy = JSON.parse(fs.readFileSync(dup1.current_path, "utf8"));
    dupCopy.snapshot = {
      ...dupCopy.snapshot,
      id: crypto.randomBytes(16).toString("hex"),
      recorded_at: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(wsDupSeq, AQL_DIR_NAME, HISTORY_DIR_NAME, "dup-seq-copy.json"),
      `${JSON.stringify(dupCopy, null, 2)}\n`,
    );
    let dupSeqErr = null;
    try {
      writeEnvelope(wsDupSeq, dupEnv);
    } catch (error) {
      dupSeqErr = error;
    }
    check(!!dupSeqErr && dupSeqErr.code === "EORDER", "duplicate sequence ->EORDER");

    // --- valid 1/2 ->next 3 ---
    const wsValidChain = path.join(root, "ws-valid-chain");
    fs.mkdirSync(wsValidChain, { recursive: true });
    fs.writeFileSync(path.join(wsValidChain, "present.txt"), "ok\n", "utf8");
    const validEnv = baseEnvelope();
    validEnv.contract_id = "valid-chain";
    validEnv.implementation_receipt.input_contract_ref = "valid-chain@tree";
    validEnv.resume_ref = "valid-chain@tree";
    validEnv.artifact_refs = ["./present.txt"];
    validEnv.evidence_refs = ["focused-test@result"];
    const valid1 = writeEnvelope(wsValidChain, validEnv);
    const valid2 = writeEnvelope(wsValidChain, validEnv);
    check(valid1.sequence === 1 && valid2.sequence === 2, "valid chain writes seq 1 and 2");
    const valid3 = writeEnvelope(wsValidChain, validEnv);
    check(valid3.sequence === 3, "valid 1/2 ->next 3");
  } finally {
    for (const fixture of fixtures) {
      try {
        fs.rmSync(fixture, { recursive: true, force: true });
      } catch {
        // best-effort cleanup
      }
    }
    check(true, "cleanup temp fixtures");
  }

  console.log(failed ? "Self-test failures present" : "Self-test passed");
  return failed ? 1 : 0;
}

async function mainAsync(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseCliArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(
      "Usage: node scripts/aql-envelope.js --workspace <dir> [--input <envelope.json>|-] | --self-test",
    );
    return 2;
  }

  if (options.selfTest) return runSelfTest();

  if (!options.workspace) {
    console.error("--workspace is required");
    console.error(
      "Usage: node scripts/aql-envelope.js --workspace <dir> [--input <envelope.json>|-] | --self-test",
    );
    return 2;
  }

  let workspaceRoot;
  try {
    workspaceRoot = prepareWorkspace(options.workspace);
  } catch (error) {
    console.error(`ERROR: ${error.message}`);
    return classifyError(error);
  }

  let raw;
  try {
    raw = await readEnvelopeInput(options.inputPath);
  } catch (error) {
    console.error(`ERROR: cannot read input: ${error.message}`);
    return 2;
  }

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    console.error(`ERROR: invalid JSON: ${error.message}`);
    return 2;
  }

  try {
    const summary = writeEnvelope(workspaceRoot, envelope);
    process.stdout.write(`${JSON.stringify(summary)}\n`);
    return 0;
  } catch (error) {
    if (error.validationErrors) {
      for (const item of error.validationErrors) console.error(`INVALID: ${item}`);
    } else {
      console.error(`ERROR: ${error.message}`);
    }
    const code = classifyError(error);
    return code === 2 && error.code === "EINVAL" ? 1 : code;
  }
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--self-test")) {
    return runSelfTest();
  }
  // Async stdin path for CLI; callers requiring sync should use writeEnvelope.
  let exitCode = 2;
  const done = mainAsync(argv).then((code) => {
    exitCode = code;
    return code;
  });
  // When required as a module without awaiting, expose the promise.
  main._promise = done;
  done.then((code) => {
    if (require.main === module) process.exitCode = code;
  });
  return exitCode;
}

if (require.main === module) {
  if (process.argv.slice(2).includes("--self-test")) {
    process.exitCode = runSelfTest();
  } else {
    mainAsync(process.argv.slice(2)).then((code) => {
      process.exitCode = code;
    });
  }
}

module.exports = {
  writeEnvelope,
  prepareWorkspace,
  canonicalizeEnvelope,
  digestContent,
  historyFileName,
  authorityAllowsWrite,
  assertChainWritable,
  formatChainError,
  WRITER_ID,
  main,
  mainAsync,
  runSelfTest,
};
