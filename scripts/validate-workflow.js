#!/usr/bin/env node



"use strict";



const os = require("os");
const fs = require("fs");

const path = require("path");

const { spawnSync } = require("child_process");

const { checkSkills } = require("./sync-skills");

const { walkFiles, MANIFEST_VERSION } = require("./gen-manifest");

const { routePackageNames, ROUTE_SHIMS_DIST } = require("./package-catalog");

const { checkGenerated, readBodyLineCount, LIFECYCLE_DUMP_PATTERN, distRootForHost, HOST_TARGETS } = require("./gen-route-shims");



const root = path.resolve(__dirname, "..");

const cursorRoot = path.join(root, ".cursor", "skills");

const codexRoot = path.join(root, ".agents", "skills");

const pluginRoot = path.join(root, "skills");

const errors = [];



for (const skill of ["agent-quality-loop", "ask-plan-code-qa", "review-gate", "skill-factory"]) {

  for (const skillsRoot of [cursorRoot, codexRoot, pluginRoot]) {

    if (!fs.existsSync(path.join(skillsRoot, skill, "SKILL.md"))) {

      errors.push(`missing ${path.relative(root, skillsRoot)}/${skill}/SKILL.md`);

    }

  }

  const source = fs.readFileSync(path.join(cursorRoot, skill, "SKILL.md"), "utf8");

  if (!source.includes(`version: "${MANIFEST_VERSION}"`)) {

    errors.push(`${skill} frontmatter metadata.version must be "${MANIFEST_VERSION}"`);

  }

  if (!/^license: MIT$/m.test(source)) {

    errors.push(`${skill} frontmatter must declare license: MIT`);

  }

}



const pluginManifestPath = path.join(root, "plugin.json");

if (!fs.existsSync(pluginManifestPath)) {

  errors.push("missing plugin.json (Agent Plugins manifest)");

} else {

  try {

    const plugin = JSON.parse(fs.readFileSync(pluginManifestPath, "utf8"));

    if (plugin.$schema !== "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json") {

      errors.push("plugin.json $schema must be the canonical Agent Plugins 1.0.0 schema URL");

    }

    if (plugin.name !== "agent-quality-loop") errors.push("plugin.json name must be agent-quality-loop");

    if (plugin.version !== MANIFEST_VERSION) {

      errors.push(`plugin.json version must equal the manifest version ${MANIFEST_VERSION}`);

    }

  } catch (error) {

    errors.push(`plugin.json: invalid JSON (${error.message})`);

  }

}



const mirrorErrors = checkSkills({ root });

for (const error of mirrorErrors) {

  errors.push(`skill mirror/manifest: ${error}`);

}



const routeErrors = checkGenerated({ root });

for (const error of routeErrors) {

  errors.push(`route shim: ${error}`);

}



for (const routeName of routePackageNames({ root })) {

  for (const host of HOST_TARGETS) {

    const skillsRoot = distRootForHost(root, host);

    const treeLabel = host.key;

    const skillPath = path.join(skillsRoot, routeName, "SKILL.md");

    if (!fs.existsSync(skillPath)) {

      errors.push(`missing route package: dist/route-shims/${treeLabel}/${routeName}/SKILL.md`);

      continue;

    }

    const source = fs.readFileSync(skillPath, "utf8");

    const isCursorTree = host.variant === "cursor";

    const hasDisable = /^disable-model-invocation:\s*true\s*$/m.test(source);

    if (isCursorTree && !hasDisable) {

      errors.push(`${routeName}: Cursor route must include disable-model-invocation: true`);

    }

    if (!isCursorTree && hasDisable) {

      errors.push(`${routeName}: ${treeLabel} route must not include disable-model-invocation`);

    }

    if (readBodyLineCount(source) > 40) {

      errors.push(`${routeName}: ${treeLabel} route body exceeds 40 non-empty lines`);

    }

    if (LIFECYCLE_DUMP_PATTERN.test(source)) {

      errors.push(`${routeName}: ${treeLabel} route duplicates lifecycle chain text`);

    }

    const openaiPath = path.join(skillsRoot, routeName, "agents", "openai.yaml");

    if (!fs.existsSync(openaiPath)) {

      errors.push(`missing route metadata: dist/route-shims/${treeLabel}/${routeName}/agents/openai.yaml`);

      continue;

    }

    const metadata = fs.readFileSync(openaiPath, "utf8");

    if (!/allow_implicit_invocation:\s*false\b/.test(metadata)) {

      errors.push(`${routeName}: ${treeLabel} route implicit policy must be false`);

    }

  }

  for (const skillsSubdir of [cursorRoot, codexRoot, pluginRoot]) {

    const legacyPath = path.join(skillsSubdir, routeName);

    if (fs.existsSync(legacyPath)) {

      errors.push(`route package must not remain in discovery tree: ${path.relative(root, legacyPath)}`);

    }

  }

}



for (const suiteName of ["core", "full"]) {

  const { SUITES } = require("./install");

  for (const routeName of routePackageNames({ root })) {

    if (SUITES[suiteName].includes(routeName)) {

      errors.push(`route package ${routeName} must not appear in ${suiteName} suite`);

    }

  }

  if (suiteName === "routes") continue;

}



const { SUITES } = require("./install");

if (!SUITES.routes.includes("agent-quality-loop")) {

  errors.push("routes suite must include agent-quality-loop parent package");

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

  "30-skill-factory.mdc",

]) {

  if (!fs.existsSync(path.join(root, ".cursor", "rules", rule))) errors.push(`missing routing rule: ${rule}`);

}



const publicDocs = ["AGENTS.md", "README.md", "docs/guide.md"];

for (const relativePath of publicDocs) {

  const content = fs.readFileSync(path.join(root, relativePath), "utf8");

  if (!content.includes("agent-quality-loop")) errors.push(`${relativePath} does not name the public entry`);

}



for (const relativePath of walkFiles(root)) {

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



const genRouteCheck = spawnSync(process.execPath, ["scripts/gen-route-shims.js", "--check"], { cwd: root, encoding: "utf8" });

if (genRouteCheck.status !== 0) {

  errors.push(`gen-route-shims --check failed: ${(genRouteCheck.stderr || genRouteCheck.stdout).trim()}`);

}



const routeShimTests = spawnSync(process.execPath, ["scripts/test-route-shims.js"], { cwd: root, encoding: "utf8" });

if (routeShimTests.status !== 0) {

  errors.push(`test-route-shims failed: ${(routeShimTests.stderr || routeShimTests.stdout).trim()}`);

}



const tempHomeDry = fs.mkdtempSync(path.join(os.tmpdir(), "aql-validate-dry-"));

try {

  const installDryRun = spawnSync(

    process.execPath,

    ["scripts/install.js", "--suite", "routes", "--to", "all", "--dry-run", "--home", tempHomeDry],

    { cwd: root, encoding: "utf8" },

  );

  if (installDryRun.status !== 0) {

    errors.push(`install routes dry-run failed: ${(installDryRun.stderr || installDryRun.stdout).trim()}`);

  } else if (!/PLAN agent-quality-loop@/.test(installDryRun.stdout)) {

    errors.push("install routes dry-run must plan agent-quality-loop parent");

  }

} finally {

  fs.rmSync(tempHomeDry, { recursive: true, force: true });

}



if (errors.length > 0) {

  for (const error of errors) console.error(`FAIL ${error}`);

  process.exitCode = 1;

} else {

  console.log("PASS single-entry routing, adapter policies, skill mirrors, portability, and bundled validator");

}
