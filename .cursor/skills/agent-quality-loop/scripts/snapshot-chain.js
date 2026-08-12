#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const {
  validateEnvelope,
  validateSnapshotMetadata,
  validateSnapshotOrdering,
} = require("./validate-envelope");

const AQL_DIR_NAME = ".agent-quality-loop";
const CURRENT_NAME = "envelope.json";
const HISTORY_DIR_NAME = "history";
const CONTENT_SHA256_RE = /^[a-f0-9]{64}$/;
const WRITER_PREFIX = "aql-envelope@";

function digestContent(raw) {
  return crypto.createHash("sha256").update(raw, "utf8").digest("hex");
}

function workspaceKey(workspaceRoot) {
  const real = fs.realpathSync(path.resolve(workspaceRoot));
  return crypto.createHash("sha256").update(real, "utf8").digest("hex");
}

function listCandidateSnapshotFiles(historyDir, currentPath) {
  const files = [];
  if (fs.existsSync(currentPath)) files.push(currentPath);
  if (fs.existsSync(historyDir)) {
    for (const name of fs.readdirSync(historyDir)) {
      if (!name.endsWith(".json")) continue;
      files.push(path.join(historyDir, name));
    }
  }
  return files;
}

function readSnapshotFile(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, "utf8");
  } catch {
    return { kind: "polluted", file: filePath, reason: "unreadable" };
  }

  let envelope;
  try {
    envelope = JSON.parse(raw);
  } catch (error) {
    return { kind: "polluted", file: filePath, reason: `parse error: ${error.message}` };
  }

  if (!envelope || typeof envelope !== "object" || Array.isArray(envelope)) {
    return { kind: "polluted", file: filePath, reason: "envelope must be a JSON object" };
  }

  const digest = digestContent(raw);
  if (!CONTENT_SHA256_RE.test(digest)) {
    return { kind: "polluted", file: filePath, reason: "invalid content digest" };
  }

  if (typeof envelope.contract_id !== "string" || !envelope.contract_id.trim()) {
    return { kind: "polluted", file: filePath, reason: "missing contract_id" };
  }

  return {
    kind: "parsed",
    file: filePath,
    raw,
    envelope,
    digest,
    isCurrent: path.basename(filePath) === CURRENT_NAME,
  };
}

function validateWriterSnapshot(envelope, label) {
  const errors = [];
  const snapshot = envelope.snapshot;
  if (snapshot === undefined || snapshot === null) {
    return { legacy: true, errors: [] };
  }
  validateSnapshotMetadata(snapshot, errors, `${label}.snapshot`);
  if (
    typeof snapshot.writer !== "string" ||
    !snapshot.writer.startsWith(WRITER_PREFIX)
  ) {
    errors.push(`${label}.snapshot.writer must match ${WRITER_PREFIX}<semver>`);
  }
  const structural = validateEnvelope(envelope);
  for (const err of structural) errors.push(err);
  return { legacy: false, errors };
}

/**
 * Load and validate ordered snapshot chain for one contract in a workspace.
 * @returns {{ status: string, errors: string[], head: object|null, nextSequence: number|null, previousDigest: string|null, pollutedFiles: string[], entries: object[] }}
 */
function loadWorkspaceSnapshots(workspaceRoot, contractId) {
  const realRoot = fs.realpathSync(path.resolve(workspaceRoot));
  const aqlDir = path.join(realRoot, AQL_DIR_NAME);
  const historyDir = path.join(aqlDir, HISTORY_DIR_NAME);
  const currentPath = path.join(aqlDir, CURRENT_NAME);

  const pollutedFiles = [];
  const byDigest = new Map();
  const orderingEntries = [];

  for (const file of listCandidateSnapshotFiles(historyDir, currentPath)) {
    const parsed = readSnapshotFile(file);
    if (parsed.kind === "polluted") {
      pollutedFiles.push(parsed.file);
      continue;
    }
    if (parsed.envelope.contract_id !== contractId) continue;

    const { legacy, errors } = validateWriterSnapshot(parsed.envelope, parsed.file);
    if (errors.length > 0) {
      pollutedFiles.push(parsed.file);
      continue;
    }

    const existing = byDigest.get(parsed.digest);
    if (!existing) {
      byDigest.set(parsed.digest, parsed);
    } else {
      const prefer =
        (parsed.isCurrent && !existing.isCurrent) ||
        (parsed.isCurrent === existing.isCurrent && parsed.file > existing.file);
      if (prefer) byDigest.set(parsed.digest, parsed);
    }
  }

  const unique = [...byDigest.values()];
  for (const snap of unique) {
    if (snap.envelope.snapshot === undefined || snap.envelope.snapshot === null) {
      // Legacy without snapshot metadata — excluded from ordered chain.
      continue;
    }
    orderingEntries.push({
      envelope: snap.envelope,
      digest: snap.digest,
      file: snap.file,
    });
  }

  if (pollutedFiles.length > 0) {
    return {
      status: "invalid",
      errors: ["polluted snapshot files prevent chain append"],
      head: null,
      nextSequence: null,
      previousDigest: null,
      pollutedFiles,
      entries: orderingEntries,
    };
  }

  const ordering = validateSnapshotOrdering(orderingEntries);
  if (ordering.status === "legacy_unordered") {
    return {
      status: "legacy_unordered",
      errors: ordering.errors,
      head: null,
      nextSequence: 1,
      previousDigest: null,
      pollutedFiles,
      entries: orderingEntries,
    };
  }

  if (ordering.status !== "valid") {
    return {
      status: "invalid",
      errors: ordering.errors,
      head: null,
      nextSequence: null,
      previousDigest: null,
      pollutedFiles,
      entries: orderingEntries,
    };
  }

  const sorted = [...orderingEntries].sort(
    (a, b) => a.envelope.snapshot.sequence - b.envelope.snapshot.sequence,
  );
  const head = sorted.length > 0 ? sorted[sorted.length - 1] : null;
  const nextSequence = head ? head.envelope.snapshot.sequence + 1 : 1;
  const previousDigest = head ? head.digest : null;

  return {
    status: "valid",
    errors: [],
    head,
    nextSequence,
    previousDigest,
    pollutedFiles,
    entries: orderingEntries,
  };
}

function currentDigestMatchesHead(workspaceRoot, contractId) {
  const realRoot = fs.realpathSync(path.resolve(workspaceRoot));
  const currentPath = path.join(realRoot, AQL_DIR_NAME, CURRENT_NAME);
  const chain = loadWorkspaceSnapshots(workspaceRoot, contractId);
  if (chain.status !== "valid" || !chain.head) {
    return { ok: false, reason: "snapshot chain is not valid ordered", chain };
  }
  if (!fs.existsSync(currentPath)) {
    return { ok: false, reason: "current envelope cache missing", chain };
  }
  let raw;
  try {
    raw = fs.readFileSync(currentPath, "utf8");
  } catch {
    return { ok: false, reason: "current envelope unreadable", chain };
  }
  const currentDigest = digestContent(raw);
  if (currentDigest !== chain.head.digest) {
    return {
      ok: false,
      reason: "current envelope digest does not match ordered chain head",
      chain,
      currentDigest,
      headDigest: chain.head.digest,
    };
  }
  return { ok: true, chain, currentDigest };
}

module.exports = {
  AQL_DIR_NAME,
  CURRENT_NAME,
  HISTORY_DIR_NAME,
  WRITER_PREFIX,
  workspaceKey,
  digestContent,
  loadWorkspaceSnapshots,
  currentDigestMatchesHead,
  listCandidateSnapshotFiles,
};
