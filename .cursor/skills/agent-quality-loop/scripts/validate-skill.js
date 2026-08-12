#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const MANIFEST_VERSION = "2.2.0";
const MANIFEST_NAME = "manifest.json";
const TEXT_EXTENSIONS = new Set([".md", ".js", ".mjs", ".json", ".yaml", ".yml", ".mdc", ".txt"]);
const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/code-implementation-adapter.md",
  "references/contracts.md",
  "references/domain-profiles.md",
  "references/evaluation-cases.md",
  "references/multi-agent-leverage.md",
  "manifest.json",
  "scripts/validate-envelope.js",
  "scripts/validate-skill.js",
];
const errors = [];

function parseYamlStringScalar(rawValue) {
  const value = rawValue.trim();
  if (!value) return null;
  if (value.startsWith('"')) {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === "string" ? parsed : null;
    } catch {
      return null;
    }
  }
  if (value.startsWith("'")) {
    return value.endsWith("'") ? value.slice(1, -1).replaceAll("''", "'") : null;
  }
  if (/^(?:\[|\{|!|&|\*|\||>|~|null$|true$|false$|[-+]?\d)/i.test(value)) return null;
  return value;
}

function sha256File(absolutePath) {
  const hash = crypto.createHash("sha256");
  const contents = fs.readFileSync(absolutePath);
  let normalized = contents;
  if (TEXT_EXTENSIONS.has(path.extname(absolutePath).toLowerCase())) {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(contents);
      normalized = Buffer.from(decoded.replace(/\r\n/g, "\n"), "utf8");
    } catch {
      // Invalid UTF-8 must retain its raw byte identity.
    }
  }
  hash.update(normalized);
  return hash.digest("hex");
}

function validateManifestPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) return "must be a non-empty string";
  if (relativePath.includes("\0")) return "must not contain NUL";
  if (relativePath.includes("\\")) return "must use POSIX forward slashes";
  if (relativePath.startsWith("/") || /^[A-Za-z]:/.test(relativePath)) return "must be relative";
  if (relativePath.split("/").some((part) => !part || part === "." || part === "..")) {
    return "must not contain empty, . or .. path segments";
  }
  return null;
}

function walkFiles(directory, base = directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic link is not allowed in skill package: ${path.relative(base, absolute)}`);
    }
    if (entry.isDirectory()) files.push(...walkFiles(absolute, base));
    else if (entry.isFile()) files.push(path.relative(base, absolute).replaceAll(path.sep, "/"));
  }
  return files.sort();
}

for (const relativePath of requiredFiles) {
  if (!fs.existsSync(path.join(root, relativePath))) errors.push(`missing required file: ${relativePath}`);
}

const markdownFiles = requiredFiles.filter((relativePath) => relativePath.endsWith(".md"));
for (const relativePath of markdownFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) continue;
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1].trim().replace(/^<|>$/g, "").split("#")[0];
    if (!target || /^(?:https?:|mailto:)/i.test(target)) continue;
    const resolved = path.resolve(path.dirname(absolutePath), target);
    if (!fs.existsSync(resolved)) errors.push(`${relativePath}: unresolved link ${match[1]}`);
  }
  if (/[A-Za-z]:\\(?:Users|Project1)\\/i.test(content)) {
    errors.push(`${relativePath}: contains a machine-local absolute path`);
  }
}

const skillPath = path.join(root, "SKILL.md");
if (fs.existsSync(skillPath)) {
  const skill = fs.readFileSync(skillPath, "utf8");
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!frontmatter) {
    errors.push("SKILL.md frontmatter is required");
  } else {
    const fields = {};
    for (const line of frontmatter[1].split(/\r?\n/)) {
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
      if (!match) {
        errors.push(`SKILL.md frontmatter has unsupported syntax: ${line}`);
        continue;
      }
      const [, key, rawValue] = match;
      if (Object.prototype.hasOwnProperty.call(fields, key)) errors.push(`SKILL.md frontmatter has duplicate ${key}`);
      fields[key] = parseYamlStringScalar(rawValue);
    }
    const keys = Object.keys(fields).sort();
    if (keys.length !== 2 || keys[0] !== "description" || keys[1] !== "name") {
      errors.push("SKILL.md frontmatter may contain only name and description");
    }
    if (fields.name !== "agent-quality-loop") errors.push("SKILL.md frontmatter name is invalid");
    const description = fields.description;
    if (typeof description !== "string" || !description.trim() || description.length > 1024) {
      errors.push("SKILL.md frontmatter description must be a non-empty string of at most 1024 characters");
    }
  }
  if (skill.split(/\r?\n/).length > 500) errors.push("SKILL.md exceeds 500 lines");
}

const metadataPath = path.join(root, "agents", "openai.yaml");
if (fs.existsSync(metadataPath)) {
  const metadata = fs.readFileSync(metadataPath, "utf8");
  if (!/allow_implicit_invocation:\s*true\b/.test(metadata)) {
    errors.push("agents/openai.yaml must make agent-quality-loop the implicit entry");
  }
}

const manifestPath = path.join(root, "manifest.json");
if (fs.existsSync(manifestPath)) {
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`manifest.json: invalid JSON (${error.message})`);
    manifest = null;
  }
  if (manifest) {
    if (manifest.name !== path.basename(root)) errors.push("manifest.json: name must match package directory");
    if (manifest.version !== MANIFEST_VERSION) errors.push(`manifest.json: version must be ${MANIFEST_VERSION}`);
    if (typeof manifest.generated_at !== "string" || !manifest.generated_at.trim()) {
      errors.push("manifest.json: generated_at must be a non-empty string");
    }
    if (!manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) {
      errors.push("manifest.json: files must be an object");
    } else {
      if (Object.prototype.hasOwnProperty.call(manifest.files, MANIFEST_NAME)) {
        errors.push("manifest.json: files must not include manifest.json");
      }
      const mismatches = [];
      let actualFiles;
      try {
        actualFiles = new Set(walkFiles(root).filter((relativePath) => relativePath !== MANIFEST_NAME));
      } catch (error) {
        mismatches.push(`unsafe package tree: ${error.message}`);
        actualFiles = new Set();
      }
      for (const [relativePath, expectedHash] of Object.entries(manifest.files)) {
        const invalidPath = validateManifestPath(relativePath);
        if (invalidPath) {
          mismatches.push(`unsafe manifest path ${JSON.stringify(relativePath)}: ${invalidPath}`);
          continue;
        }
        if (!actualFiles.has(relativePath)) {
          mismatches.push(`listed path is not a walked package file ${relativePath}`);
          continue;
        }
        const absolute = path.join(root, relativePath);
        const actual = sha256File(absolute);
        if (actual !== expectedHash) mismatches.push(`sha256 mismatch ${relativePath}`);
      }
      for (const relativePath of actualFiles) {
        if (!Object.prototype.hasOwnProperty.call(manifest.files, relativePath)) {
          mismatches.push(`file not listed in manifest: ${relativePath}`);
        }
      }
      if (mismatches.length > 0) {
        errors.push(`manifest.json hash check failed: ${mismatches.join("; ")}`);
      }
    }
  }
}

const envelopeCheck = spawnSync(process.execPath, [path.join(root, "scripts", "validate-envelope.js"), "--self-test"], {
  cwd: root,
  encoding: "utf8",
});
if (envelopeCheck.status !== 0) {
  errors.push(`envelope self-test failed: ${(envelopeCheck.stderr || envelopeCheck.stdout).trim()}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  const count = envelopeCheck.stdout.split(/\r?\n/).filter((line) => line.startsWith("PASS ")).length;
  console.log(`PASS skill package structure, links, portability, metadata, and ${count} envelope regression cases`);
}
