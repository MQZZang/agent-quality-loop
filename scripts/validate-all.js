#!/usr/bin/env node

"use strict";

const { spawnSync } = require("child_process");
const os = require("os");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");

/** @type {Array<[string, ...string[]]>} */
const COMMANDS = [
  ["scripts/gen-manifest.js", "--self-test"],
  ["scripts/install.js", "--self-test"],
  ["scripts/gen-route-shims.js", "--check"],
  ["scripts/test-route-shims.js"],
  [".cursor/skills/agent-quality-loop/scripts/validate-skill.js"],
  ["scripts/validate-workflow.js"],
  ["scripts/validate-claims.js"],
  ["scripts/corpus-inventory.js", "--self-test"],
  ["scripts/validate-corpus-claims.js", "--self-test"],
  ["scripts/validate-corpus-claims.js", "--claims", "docs/research/llm-learning-corpus/claim-ledger.json", "--inventory", "docs/research/llm-learning-corpus/inventory.json", "--check"],
  ["scripts/validate-writing-probes.js"],
  ["scripts/aql-doctor.js", "--self-test"],
  ["scripts/test-release-workflow-logic.js"],
  ["integrations/cursor-hooks/test.js"],
  ["probes/make-fixtures.js", "--self-test"],
  ["probes/run-profile-projection-smoke.js", "--self-test"],
  ["probes/run-profile-projection-abc-v3.js", "--self-test"],
  ["probes/run-profile-projection-review.js", "--self-test"],
  ["probes/profile-projection-portable-evidence.js", "--self-test"],
  ["probes/verify-profile-projection-evidence.js"],
  ["scripts/sync-skills.js", "--check"],
];

function formatCommand(relativeScript, args) {
  const parts = ["node", relativeScript, ...args];
  return parts.join(" ");
}

function printEnvSummary() {
  console.log("validate-all env summary");
  console.log(`  node: ${process.version}`);
  console.log(`  platform: ${process.platform} (${os.type()} ${os.release()})`);
  console.log(`  arch: ${os.arch()}`);
  console.log(`  cwd: ${process.cwd()}`);
  console.log(`  repo_root: ${REPO_ROOT}`);
}

function runStep(relativeScript, args = []) {
  const scriptPath = path.join(REPO_ROOT, relativeScript);
  const cmdLine = formatCommand(relativeScript, args);

  console.log(`\n=== ${cmdLine} ===\n`);

  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: REPO_ROOT,
    shell: false,
    stdio: "inherit",
    env: process.env,
  });

  const code = result.status === null ? 1 : result.status;
  console.log(`\n--- exit code: ${code} (${cmdLine}) ---\n`);
  return code;
}

function main() {
  printEnvSummary();
  let failed = false;

  for (const entry of COMMANDS) {
    const [relativeScript, ...args] = entry;
    const code = runStep(relativeScript, args);
    if (code !== 0) {
      failed = true;
    }
  }

  if (failed) {
    console.error("validate-all: one or more steps failed");
    return 1;
  }

  console.log("validate-all: all steps passed");
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  COMMANDS,
  runStep,
  printEnvSummary,
  REPO_ROOT,
};
