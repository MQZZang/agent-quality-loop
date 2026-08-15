#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EVIDENCE_FORMAT_VERSION = "profile-projection-evidence/v2";
const SANITIZER_VERSION = "machine-local-redaction/v1";

function sha256Bytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), "utf8");
  return crypto.createHash("sha256").update(bytes).digest("hex");
}

function relativeRef(filePath) {
  const absolute = path.resolve(filePath);
  const relative = path.relative(ROOT, absolute);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Evidence artifact must stay inside the repository: ${filePath}`);
  }
  return relative.split(path.sep).join("/");
}

function literalVariants(value) {
  if (!value) return [];
  const raw = String(value);
  const slash = raw.replace(/\\/g, "/");
  const backslash = raw.replace(/\//g, "\\");
  return [...new Set([raw, slash, backslash, backslash.replace(/\\/g, "\\\\")])]
    .filter(Boolean)
    .sort((left, right) => right.length - left.length);
}

function replaceLiteral(text, needle, replacement) {
  if (!needle) return { text, count: 0 };
  let count = 0;
  const expression = new RegExp(escapeRegExp(needle), "gi");
  return {
    text: text.replace(expression, () => {
      count += 1;
      return replacement;
    }),
    get count() { return count; },
  };
}

function replaceRemainingAbsolutePaths(text) {
  let count = 0;
  const expression = /(?<![A-Za-z0-9_])(?:\\\\\?\\)?[A-Za-z]:(?:\\\\|\\|\/)(?:[^\\\/\s"'<>|)\]]+(?:\\\\|\\|\/))*[^\\\/\s"'<>|)\]]*/g;
  const replaced = text.replace(expression, () => {
    count += 1;
    return "<ABSOLUTE_PATH>";
  });
  return { text: replaced, count };
}

function replacementRoots(extraReplacements = []) {
  const roots = [
    { value: ROOT, token: "<WORKSPACE>" },
    { value: os.homedir(), token: "<USER_HOME>" },
    { value: process.env.USERPROFILE, token: "<USER_HOME>" },
    { value: process.env.TEMP, token: "<TEMP>" },
    { value: process.env.TMP, token: "<TEMP>" },
    { value: process.env.LOCALAPPDATA, token: "<LOCAL_APPDATA>" },
    { value: process.env.APPDATA, token: "<APPDATA>" },
    { value: process.env.ProgramFiles, token: "<PROGRAM_FILES>" },
    { value: process.env.ProgramW6432, token: "<PROGRAM_FILES>" },
    { value: process.env.SystemRoot, token: "<SYSTEM_ROOT>" },
    ...extraReplacements,
  ];
  const seen = new Set();
  return roots
    .filter((entry) => entry && entry.value && entry.token)
    .filter((entry) => {
      const key = `${entry.value}\0${entry.token}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => String(right.value).length - String(left.value).length);
}

function unsafeEvidenceKinds(text) {
  const checks = [
    ["windows_absolute_path", /(?:^|[^A-Za-z0-9_])[A-Za-z]:(?:\\\\|\\|\/)/m],
    ["unix_user_or_temp_path", /\/(?:home|Users|private\/tmp|tmp)\//],
    ["windows_host_identity", /\bDESKTOP-[A-Z0-9-]+\b/i],
  ];
  const host = os.hostname();
  const user = process.env.USERNAME || process.env.USER;
  if (host && host.length >= 3) checks.push(["current_host_identity", new RegExp(escapeRegExp(host), "i")]);
  if (user && user.length >= 3) checks.push(["current_user_identity", new RegExp(`\\b${escapeRegExp(user)}\\b`, "i")]);
  return checks.filter(([, expression]) => expression.test(text)).map(([kind]) => kind);
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function sanitizeEvidenceText(value, extraReplacements = []) {
  let text = String(value);
  const byToken = {};
  for (const entry of replacementRoots(extraReplacements)) {
    for (const variant of literalVariants(entry.value)) {
      const result = replaceLiteral(text, variant, entry.token);
      text = result.text;
      if (result.count > 0) byToken[entry.token] = (byToken[entry.token] || 0) + result.count;
    }
  }
  for (const [valueToHide, token] of [
    [os.hostname(), "<HOST>"],
    [process.env.USERNAME || process.env.USER, "<LOCAL_USER>"],
  ]) {
    if (!valueToHide) continue;
    const result = replaceLiteral(text, String(valueToHide), token);
    text = result.text;
    if (result.count > 0) byToken[token] = (byToken[token] || 0) + result.count;
  }
  const remainingPaths = replaceRemainingAbsolutePaths(text);
  text = remainingPaths.text;
  if (remainingPaths.count > 0) byToken["<ABSOLUTE_PATH>"] = remainingPaths.count;
  const unsafeKinds = unsafeEvidenceKinds(text);
  if (unsafeKinds.length > 0) {
    throw new Error(`Sanitizer left machine-local evidence kinds: ${unsafeKinds.join(", ")}`);
  }
  return {
    text,
    redactions: {
      sanitizer_version: SANITIZER_VERSION,
      total: Object.values(byToken).reduce((sum, count) => sum + count, 0),
      by_token: byToken,
    },
  };
}

function artifactRecord(filePath, redactions = null) {
  const bytes = fs.readFileSync(filePath);
  const record = {
    ref: relativeRef(filePath),
    sha256: sha256Bytes(bytes),
    bytes: bytes.length,
  };
  if (redactions) record.redactions = redactions;
  return record;
}

function writeSanitizedText(filePath, value, extraReplacements = []) {
  const sanitized = sanitizeEvidenceText(value, extraReplacements);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, sanitized.text, "utf8");
  return artifactRecord(filePath, sanitized.redactions);
}

function writeSanitizedJson(filePath, value, extraReplacements = []) {
  return writeSanitizedText(filePath, `${JSON.stringify(value, null, 2)}\n`, extraReplacements);
}

function sanitizeExistingFile(filePath, extraReplacements = []) {
  if (!fs.existsSync(filePath)) throw new Error(`Missing evidence artifact: ${filePath}`);
  return writeSanitizedText(filePath, fs.readFileSync(filePath, "utf8"), extraReplacements);
}

function verifyArtifact(record) {
  if (!record || typeof record.ref !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256 || "")) {
    throw new Error("Invalid evidence artifact record");
  }
  const filePath = path.resolve(ROOT, record.ref);
  if (relativeRef(filePath) !== record.ref.replace(/\\/g, "/")) {
    throw new Error(`Evidence ref is not canonical: ${record.ref}`);
  }
  const actual = artifactRecord(filePath);
  if (actual.sha256 !== record.sha256 || actual.bytes !== record.bytes) {
    throw new Error(`Evidence digest mismatch: ${record.ref}`);
  }
  const unsafeKinds = unsafeEvidenceKinds(fs.readFileSync(filePath, "utf8"));
  if (unsafeKinds.length > 0) {
    throw new Error(`Unsafe evidence remains in ${record.ref}: ${unsafeKinds.join(", ")}`);
  }
  return actual;
}

function writeEvidenceLock(outputDir, manifestPath) {
  const lockPath = path.join(outputDir, "evidence.lock.json");
  const manifest = artifactRecord(manifestPath);
  writeSanitizedJson(lockPath, {
    evidence_format_version: EVIDENCE_FORMAT_VERSION,
    manifest_ref: manifest.ref,
    manifest_sha256: manifest.sha256,
    manifest_bytes: manifest.bytes,
  });
  return artifactRecord(lockPath);
}

module.exports = {
  ROOT,
  EVIDENCE_FORMAT_VERSION,
  SANITIZER_VERSION,
  artifactRecord,
  relativeRef,
  sanitizeEvidenceText,
  sanitizeExistingFile,
  sha256Bytes,
  unsafeEvidenceKinds,
  verifyArtifact,
  writeEvidenceLock,
  writeSanitizedJson,
  writeSanitizedText,
};
