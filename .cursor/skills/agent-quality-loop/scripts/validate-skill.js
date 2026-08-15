#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const MANIFEST_VERSION = "2.7.0";
const MANIFEST_NAME = "manifest.json";
const TEXT_EXTENSIONS = new Set([".md", ".js", ".mjs", ".json", ".yaml", ".yml", ".mdc", ".txt"]);
const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/code-implementation-adapter.md",
  "references/contract-presets.md",
  "references/contracts.md",
  "references/domain-profiles.md",
  "references/alignment-compiler.md",
  "references/evaluation-cases.md",
  "references/multi-agent-leverage.md",
  "references/personalization.md",
  "references/profile-projection.md",
  "references/writing-collaboration-adapter.md",
  "fixtures/profile-projection-v1.json",
  "manifest.json",
  "scripts/validate-envelope.js",
  "scripts/validate-profile-projection.js",
  "scripts/validate-skill.js",
  "scripts/aql-envelope.js",
  "scripts/aql-stats.js",
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

function isTextExtension(absolutePath) {
  return TEXT_EXTENSIONS.has(path.extname(absolutePath).toLowerCase());
}

function utf8ValidityError(absolutePath, contents = fs.readFileSync(absolutePath)) {
  if (!isTextExtension(absolutePath)) return null;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(contents);
    return null;
  } catch (error) {
    return error.message || "invalid UTF-8";
  }
}

function sha256File(absolutePath) {
  const hash = crypto.createHash("sha256");
  const contents = fs.readFileSync(absolutePath);
  let normalized = contents;
  if (isTextExtension(absolutePath)) {
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
    // Agent Skills spec (agentskills.io) fields only: name and description are
    // required; license, compatibility, allowed-tools, and a string-to-string
    // metadata block map are the permitted optional fields.
    const fields = {};
    let openMap = null;
    let blockKey = null;
    for (const line of frontmatter[1].split(/\r?\n/)) {
      if (blockKey !== null) {
        const blockLine = line.match(/^ {2,}(\S.*)$/);
        if (blockLine || line.trim() === "") {
          if (blockLine) {
            fields[blockKey] = fields[blockKey] === "" ? blockLine[1] : `${fields[blockKey]} ${blockLine[1]}`;
          }
          continue;
        }
        blockKey = null;
      }
      const nested = line.match(/^ {2}([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
      if (nested && openMap) {
        const [, key, rawValue] = nested;
        if (Object.prototype.hasOwnProperty.call(openMap, key)) errors.push(`SKILL.md frontmatter has duplicate metadata.${key}`);
        const value = parseYamlStringScalar(rawValue);
        if (typeof value !== "string") errors.push(`SKILL.md frontmatter metadata.${key} must be a string scalar`);
        openMap[key] = value;
        continue;
      }
      openMap = null;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):\s*(.*)$/);
      if (!match) {
        errors.push(`SKILL.md frontmatter has unsupported syntax: ${line}`);
        continue;
      }
      const [, key, rawValue] = match;
      if (Object.prototype.hasOwnProperty.call(fields, key)) errors.push(`SKILL.md frontmatter has duplicate ${key}`);
      if (key === "metadata" && rawValue.trim() === "") {
        fields[key] = {};
        openMap = fields[key];
        continue;
      }
      // YAML block scalars (>- style folded descriptions) are spec-valid.
      if (/^[>|][+-]?$/.test(rawValue.trim())) {
        fields[key] = "";
        blockKey = key;
        continue;
      }
      fields[key] = parseYamlStringScalar(rawValue);
    }
    const allowedKeys = new Set(["name", "description", "license", "compatibility", "allowed-tools", "metadata"]);
    for (const key of Object.keys(fields)) {
      if (!allowedKeys.has(key)) errors.push(`SKILL.md frontmatter key not in the Agent Skills spec: ${key}`);
    }
    if (!("name" in fields) || !("description" in fields)) {
      errors.push("SKILL.md frontmatter must declare name and description");
    }
    if (fields.name !== "agent-quality-loop") errors.push("SKILL.md frontmatter name is invalid");
    const description = fields.description;
    if (typeof description !== "string" || !description.trim() || description.length > 1024) {
      errors.push("SKILL.md frontmatter description must be a non-empty string of at most 1024 characters");
    }
    if ("license" in fields && (typeof fields.license !== "string" || !fields.license.trim())) {
      errors.push("SKILL.md frontmatter license must be a non-empty string when present");
    }
    if ("metadata" in fields) {
      if (typeof fields.metadata !== "object" || fields.metadata === null) {
        errors.push("SKILL.md frontmatter metadata must be a block map of string scalars");
      } else if (fields.metadata.version !== MANIFEST_VERSION) {
        errors.push(`SKILL.md frontmatter metadata.version must equal the manifest version ${MANIFEST_VERSION}`);
      }
    }
  }
  if (skill.split(/\r?\n/).length > 500) errors.push("SKILL.md exceeds 500 lines");
  if (!skill.includes("references/contracts.md#user-result-summary")) {
    errors.push("SKILL.md must link the parent-owned User Result Summary contract");
  }
}

function requireAll(relativePath, requiredTerms, forbiddenTerms = []) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return;
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const term of requiredTerms) {
    if (!content.includes(term)) errors.push(`${relativePath}: missing contract term ${JSON.stringify(term)}`);
  }
  for (const term of forbiddenTerms) {
    if (content.includes(term)) errors.push(`${relativePath}: forbidden legacy term ${JSON.stringify(term)}`);
  }
}

requireAll("references/contracts.md", [
  "## User Result Summary",
  "1–3 lines",
  "local unreleased build",
  "## Result Detail Budget",
  "injected_refs:",
  "harvest_candidates:",
  "### Collaboration Brief / Dispatch Brief",
], ["## Trust Badge", "[AQL <version> |"]);

requireAll("references/profile-projection.md", [
  "# Profile Projection v1",
  "## Fresh Mode",
  "## Candidate Filter",
  "## Selection Order",
  "## Contract Effects",
  "## Source Tracking",
  "## Mechanical Validation Boundary",
]);

requireAll("references/writing-collaboration-adapter.md", [
  "inform",
  "explain",
  "decide",
  "persuade",
  "instruct",
  "teach",
  "entertain",
  "express",
  "author-tool",
  "evidence-bound factual",
  "interpretive",
  "creative fictional",
  "hybrid",
  "Choose source handling separately",
]);

requireAll("references/evaluation-cases.md", [
  "## 83.",
  "## 84.",
  "## 85.",
  "## 86.",
  "## 87.",
  "## 88.",
  "## 108.",
]);

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
        const utf8Error = utf8ValidityError(absolute);
        if (utf8Error) {
          mismatches.push(
            `invalid UTF-8 in text file ${relativePath} (${utf8Error}); hash falls back to raw bytes and is not cross-EOL safe`,
          );
        }
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

const profileProjectionCheck = spawnSync(
  process.execPath,
  [path.join(root, "scripts", "validate-profile-projection.js"), "--self-test"],
  { cwd: root, encoding: "utf8" },
);
if (profileProjectionCheck.status !== 0) {
  errors.push(`profile projection self-test failed: ${(profileProjectionCheck.stderr || profileProjectionCheck.stdout).trim()}`);
}

const writerCheck = spawnSync(process.execPath, [path.join(root, "scripts", "aql-envelope.js"), "--self-test"], {
  cwd: root,
  encoding: "utf8",
});
if (writerCheck.status !== 0) {
  errors.push(`aql-envelope self-test failed: ${(writerCheck.stderr || writerCheck.stdout).trim()}`);
}

const statsCheck = spawnSync(process.execPath, [path.join(root, "scripts", "aql-stats.js"), "--self-test"], {
  cwd: root,
  encoding: "utf8",
});
if (statsCheck.status !== 0) {
  errors.push(`aql-stats self-test failed: ${(statsCheck.stderr || statsCheck.stdout).trim()}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  const count = envelopeCheck.stdout.split(/\r?\n/).filter((line) => line.startsWith("PASS ")).length;
  console.log(`PASS skill package structure, links, portability, metadata, and ${count} envelope regression cases`);
}
