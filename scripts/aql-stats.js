#!/usr/bin/env node
"use strict";

// Thin wrapper — canonical implementation lives in the skill package.
const packaged = require("../.cursor/skills/agent-quality-loop/scripts/aql-stats.js");

module.exports = packaged;

if (require.main === module) {
  process.exitCode = packaged.main(process.argv.slice(2));
}
