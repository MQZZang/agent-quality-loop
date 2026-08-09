#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const cursorRoot = path.join(root, ".cursor", "skills");
const codexRoot = path.join(root, ".agents", "skills");
const errors = [];

function walk(directory, base = directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(absolute, base));
    else files.push(path.relative(base, absolute).replaceAll(path.sep, "/"));
  }
  return files.sort();
}

for (const skill of ["agent-quality-loop", "ask-plan-code-qa", "review-gate", "skill-factory"]) {
  for (const skillsRoot of [cursorRoot, codexRoot]) {
    if (!fs.existsSync(path.join(skillsRoot, skill, "SKILL.md"))) {
      errors.push(`missing ${path.relative(root, skillsRoot)}/${skill}/SKILL.md`);
    }
  }
}

if (fs.existsSync(cursorRoot) && fs.existsSync(codexRoot)) {
  const cursorFiles = walk(cursorRoot);
  const codexFiles = walk(codexRoot);
  if (JSON.stringify(cursorFiles) !== JSON.stringify(codexFiles)) {
    errors.push("Cursor and Codex skill file lists differ; run scripts/sync-skills.sh");
  } else {
    for (const relativePath of cursorFiles) {
      const left = fs.readFileSync(path.join(cursorRoot, relativePath));
      const right = fs.readFileSync(path.join(codexRoot, relativePath));
      if (!left.equals(right)) errors.push(`skill mirror differs: ${relativePath}`);
    }
  }
}

for (const [skill, expected] of [
  ["agent-quality-loop", "true"],
  ["ask-plan-code-qa", "false"],
  ["review-gate", "false"],
]) {
  const metadataPath = path.join(cursorRoot, skill, "agents", "openai.yaml");
  if (!fs.existsSync(metadataPath)) {
    errors.push(`missing metadata: ${skill}/agents/openai.yaml`);
    continue;
  }
  const metadata = fs.readFileSync(metadataPath, "utf8");
  if (!new RegExp(`allow_implicit_invocation:\\s*${expected}\\b`).test(metadata)) {
    errors.push(`${skill} implicit policy must be ${expected}`);
  }
}

for (const rule of [
  "00-agent-constitution.mdc",
  "05-agent-quality-loop.mdc",
  "10-ask-plan-code-qa.mdc",
  "20-review-gate.mdc",
]) {
  if (!fs.existsSync(path.join(root, ".cursor", "rules", rule))) errors.push(`missing routing rule: ${rule}`);
}

const publicDocs = ["AGENTS.md", "README.md", "docs/guide.md", "AI_AGENT_WORKFLOW_README.md"];
for (const relativePath of publicDocs) {
  const content = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (!content.includes("agent-quality-loop")) errors.push(`${relativePath} does not name the public entry`);
}

for (const relativePath of walk(root)) {
  if (relativePath.startsWith(".git/")) continue;
  const extension = path.extname(relativePath).toLowerCase();
  if (![".md", ".mdc", ".js", ".yaml", ".yml", ".sh", ".ps1", ""].includes(extension)) continue;
  const content = fs.readFileSync(path.join(root, relativePath), "utf8");
  if (/[A-Za-z]:\\(?:Users|Project1)\\/i.test(content)) errors.push(`${relativePath} contains a machine-local path`);
  if (/\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{16,}/.test(content)) errors.push(`${relativePath} contains a token-like secret`);
}

const skillValidator = path.join(cursorRoot, "agent-quality-loop", "scripts", "validate-skill.js");
if (fs.existsSync(skillValidator)) {
  const result = spawnSync(process.execPath, [skillValidator], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) errors.push(`agent-quality-loop validation failed: ${(result.stderr || result.stdout).trim()}`);
}

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else {
  console.log("PASS single-entry routing, adapter policies, skill mirrors, portability, and bundled validator");
}
