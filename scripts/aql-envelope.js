#!/usr/bin/env node
"use strict";

// Thin wrapper — canonical implementation lives in the skill package.
module.exports = require("../.cursor/skills/agent-quality-loop/scripts/aql-envelope.js");

if (require.main === module) {
  const mod = module.exports;
  if (process.argv.slice(2).includes("--self-test")) {
    process.exitCode = mod.runSelfTest();
  } else {
    mod.mainAsync(process.argv.slice(2)).then((code) => {
      process.exitCode = code;
    });
  }
}
