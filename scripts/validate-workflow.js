#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { checkSkills } = require("./sync-skills");
const { walkFiles, MANIFEST_VERSION } = require("./gen-manifest");

const root = path.resolve(__dirname, "..");
const cursorRoot = path.join(root, ".cursor", "skills");
const codexRoot = path.join(root, ".agents", "skills");
const pluginRoot = path.join(root, "skills");
const errors = [];
const skill = "agent-quality-loop";

const pluginManifestPath = path.join(root, "plugin.json");
if (!fs.existsSync(pluginManifestPath)) errors.push("missing plugin.json");
else {
  try {
    const plugin = JSON.parse(fs.readFileSync(pluginManifestPath, "utf8"));
    if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") errors.push("plugin.json schema is not canonical");
    if (plugin.name !== skill) errors.push("plugin.json name must be agent-quality-loop");
    if (plugin.version !== MANIFEST_VERSION) errors.push(`plugin.json version must equal ${MANIFEST_VERSION}`);
  } catch (error) { errors.push(`plugin.json is invalid: ${error.message}`); }
}

const releaseWorkflowPath = path.join(root, ".github", "workflows", "release.yml");
if (!fs.existsSync(releaseWorkflowPath)) errors.push("missing release workflow");
else {
  const releaseWorkflow = fs.readFileSync(releaseWorkflowPath, "utf8");
  const unsafeRunInterpolations = [
    'echo "tag=${{ github.event.inputs.tag }}',
    'TAG="${{ steps.ref.outputs.tag }}"',
    '--tag "${{ steps.ref.outputs.tag }}"',
    '--commit "${{ steps.verify.outputs.sha }}"',
  ];
  for (const snippet of unsafeRunInterpolations) {
    if (releaseWorkflow.includes(snippet)) errors.push(`release workflow contains unsafe shell interpolation: ${snippet}`);
  }
  const safeInputBindings = (releaseWorkflow.match(/INPUT_TAG: \$\{\{ github\.event\.inputs\.tag \}\}/g) || []).length;
  if (safeInputBindings !== 4) errors.push("all four release jobs must bind workflow input through env before shell use");
  const strictTagChecks = (releaseWorkflow.match(/Refusing a release tag outside v<major>\.<minor>\.<patch>/g) || []).length;
  if (strictTagChecks !== 4) errors.push("all four release jobs must reject malformed release tags before checkout");
  const exactTagCheckouts = (releaseWorkflow.match(/ref: refs\/tags\/\$\{\{ steps\.ref\.outputs\.tag \}\}/g) || []).length;
  if (exactTagCheckouts !== 4) errors.push("all four release jobs must checkout an explicit refs/tags ref");
  if (!releaseWorkflow.includes('git rev-parse "refs/tags/${TAG}^{commit}"')) errors.push("release workflow must resolve an exact tag ref, not an ambiguous branch or tag name");
  if (!releaseWorkflow.includes('node scripts/release-version.js "$TAG"')) errors.push("release workflow must bind the tag to the packaged version");
}

for (const skillsRoot of [cursorRoot, codexRoot, pluginRoot]) {
  if (!fs.existsSync(path.join(skillsRoot, skill, "SKILL.md"))) errors.push(`missing ${path.relative(root, skillsRoot)}/${skill}/SKILL.md`);
}
const sourcePath = path.join(cursorRoot, skill, "SKILL.md");
if (fs.existsSync(sourcePath)) {
  const source = fs.readFileSync(sourcePath, "utf8");
  if (!source.includes(`version: "${MANIFEST_VERSION}"`)) errors.push(`${skill} frontmatter metadata.version must be "${MANIFEST_VERSION}"`);
  if (!/^license: MIT$/m.test(source)) errors.push(`${skill} frontmatter must declare license: MIT`);
}

for (const error of checkSkills({ root })) errors.push(`skill mirror/manifest: ${error}`);

const metadataPath = path.join(cursorRoot, skill, "agents", "openai.yaml");
if (!fs.existsSync(metadataPath)) errors.push(`missing metadata: ${skill}/agents/openai.yaml`);
else if (!/allow_implicit_invocation:\s*true\b/.test(fs.readFileSync(metadataPath, "utf8"))) errors.push(`${skill} implicit policy must be true`);

for (const relativePath of walkFiles(root)) {
  if (relativePath.startsWith(".git/")) continue;
  const extension = path.extname(relativePath).toLowerCase();
  if (![".md", ".mdc", ".js", ".yaml", ".yml", ".sh", ".ps1", ""].includes(extension)) continue;
  const content = fs.readFileSync(path.join(root, relativePath), "utf8");
  const allowMachineLocal =
    relativePath === "docs/aql-3.1-execution-directive.md" ||
    relativePath.startsWith("docs/experiments/aql-3.1/") ||
    relativePath === "docs/aql-3.1-execution-report.md";
  if (!allowMachineLocal && /[A-Za-z]:\\(?:Users|Project1)\\/i.test(content)) {
    errors.push(`${relativePath} contains a machine-local path`);
  }
  if (/\b(?:ghp_|github_pat_|sk-)[A-Za-z0-9_-]{16,}/.test(content)) errors.push(`${relativePath} contains a token-like secret`);
}

const skillValidator = path.join(cursorRoot, skill, "scripts", "validate-skill.js");
if (fs.existsSync(skillValidator)) {
  const result = spawnSync(process.execPath, [skillValidator], { cwd: root, encoding: "utf8" });
  if (result.status !== 0) errors.push(`agent-quality-loop validation failed: ${(result.stderr || result.stdout).trim()}`);
}

const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "aql-validate-install-"));
try {
  const result = spawnSync(process.execPath, ["scripts/install.js", "install", "--to", "all", "--dry-run", "--home", tempHome], { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || (result.stdout.match(/PLAN install/g) || []).length !== 3) errors.push(`single-suite install dry-run failed: ${(result.stderr || result.stdout).trim()}`);
} finally { fs.rmSync(tempHome, { recursive: true, force: true }); }

if (errors.length > 0) {
  for (const error of errors) console.error(`FAIL ${error}`);
  process.exitCode = 1;
} else console.log("PASS single-skill distribution, ownership installer, mirrors, and bundled validator");
