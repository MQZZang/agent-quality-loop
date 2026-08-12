#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  MANIFEST_VERSION,
  walkFiles,
  listPackageSkillDirs,
  writeManifest,
  checkManifestConsistency,
  repoRoot,
} = require("./gen-manifest");

function cursorSkillsRoot(root = repoRoot()) {
  return path.join(root, ".cursor", "skills");
}

function agentsSkillsRoot(root = repoRoot()) {
  return path.join(root, ".agents", "skills");
}

// Third mirror: Agent Plugins clients and registry crawlers discover skills at
// the repo-top-level skills/ directory (plugin.json names it as the component root).
function pluginSkillsRoot(root = repoRoot()) {
  return path.join(root, "skills");
}

function compareTrees(leftRoot, rightRoot) {
  const errors = [];
  if (!fs.existsSync(leftRoot)) {
    errors.push(`missing source tree: ${leftRoot}`);
    return errors;
  }
  if (!fs.existsSync(rightRoot)) {
    errors.push(`missing mirror tree: ${rightRoot}`);
    return errors;
  }

  const leftFiles = walkFiles(leftRoot);
  const rightFiles = walkFiles(rightRoot);
  const leftSet = new Set(leftFiles);
  const rightSet = new Set(rightFiles);

  for (const relativePath of leftFiles) {
    if (!rightSet.has(relativePath)) errors.push(`mirror missing: ${relativePath}`);
  }
  for (const relativePath of rightFiles) {
    if (!leftSet.has(relativePath)) errors.push(`mirror extra: ${relativePath}`);
  }

  for (const relativePath of leftFiles) {
    if (!rightSet.has(relativePath)) continue;
    const left = fs.readFileSync(path.join(leftRoot, relativePath));
    const right = fs.readFileSync(path.join(rightRoot, relativePath));
    if (!left.equals(right)) errors.push(`mirror differs: ${relativePath}`);
  }
  return errors;
}

function checkAllManifests(skillsRoot) {
  const errors = [];
  for (const packageDir of listPackageSkillDirs(skillsRoot)) {
    errors.push(...checkManifestConsistency(packageDir));
  }
  return errors;
}

function syncSkills(options = {}) {
  const root = options.root || repoRoot();
  const source = cursorSkillsRoot(root);
  const mirrors = [agentsSkillsRoot(root), pluginSkillsRoot(root)];

  if (!fs.existsSync(source)) {
    throw new Error(`missing authoritative skills tree: ${source}`);
  }

  for (const mirror of mirrors) {
    fs.rmSync(mirror, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(mirror), { recursive: true });
    fs.cpSync(source, mirror, { recursive: true });
  }

  // Shared timestamp keeps mirrored manifests byte-identical after sync.
  const generatedAt = new Date().toISOString();
  const packageNames = listPackageSkillDirs(source).map((dir) => path.basename(dir));
  for (const name of packageNames) {
    writeManifest(path.join(source, name), { generatedAt, name });
    for (const mirror of mirrors) {
      writeManifest(path.join(mirror, name), { generatedAt, name });
    }
  }

  return { root, source, mirrors, packageNames, generatedAt };
}

function checkSkills(options = {}) {
  const root = options.root || repoRoot();
  const source = cursorSkillsRoot(root);
  const errors = [];
  for (const mirror of [agentsSkillsRoot(root), pluginSkillsRoot(root)]) {
    errors.push(...compareTrees(source, mirror));
    errors.push(...checkAllManifests(mirror));
  }
  errors.push(...checkAllManifests(source));
  return errors;
}

function main(argv = process.argv.slice(2)) {
  const checkOnly = argv.includes("--check");
  if (argv.some((arg) => arg !== "--check")) {
    console.error("Usage: node scripts/sync-skills.js [--check]");
    return 2;
  }

  if (checkOnly) {
    const errors = checkSkills();
    if (errors.length > 0) {
      for (const error of errors) console.error(`FAIL ${error}`);
      return 1;
    }
    console.log("PASS skill mirror and manifest consistency");
    return 0;
  }

  const result = syncSkills();
  console.log(`Synced .cursor/skills/ → .agents/skills/ + skills/ (${result.packageNames.length} packages)`);
  for (const name of result.packageNames) {
    console.log(`  manifest: ${name}@${MANIFEST_VERSION}`);
  }

  const errors = checkSkills({ root: result.root });
  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL post-sync check: ${error}`);
    return 1;
  }
  console.log("Mirror check: OK");
  return 0;
}

module.exports = {
  syncSkills,
  checkSkills,
  compareTrees,
  cursorSkillsRoot,
  agentsSkillsRoot,
  pluginSkillsRoot,
};

if (require.main === module) {
  process.exitCode = main();
}
