#!/usr/bin/env node

"use strict";

const { spawnSync } = require("child_process");
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
  ["integrations/cursor-hooks/test.js"],
  ["probes/make-fixtures.js", "--self-test"],
  ["scripts/sync-skills.js", "--check"],
];

function formatCommand(relativeScript, args) {
  const parts = ["node", relativeScript, ...args];
  return parts.join(" ");
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
  REPO_ROOT,
};
