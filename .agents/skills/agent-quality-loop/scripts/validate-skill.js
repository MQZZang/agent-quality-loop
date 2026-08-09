#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "SKILL.md",
  "agents/openai.yaml",
  "references/code-implementation-adapter.md",
  "references/contracts.md",
  "references/evaluation-cases.md",
  "scripts/validate-envelope.js",
  "scripts/validate-skill.js",
];
const errors = [];

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
  if (!/^---\r?\nname: agent-quality-loop\r?\n/m.test(skill)) errors.push("SKILL.md frontmatter name is invalid");
  if (skill.split(/\r?\n/).length > 500) errors.push("SKILL.md exceeds 500 lines");
}

const metadataPath = path.join(root, "agents", "openai.yaml");
if (fs.existsSync(metadataPath)) {
  const metadata = fs.readFileSync(metadataPath, "utf8");
  if (!/allow_implicit_invocation:\s*true\b/.test(metadata)) {
    errors.push("agents/openai.yaml must make agent-quality-loop the implicit entry");
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
