#!/usr/bin/env node

"use strict";

const packaged = require("../.cursor/skills/agent-quality-loop/scripts/conformance.js");
function main(argv = process.argv.slice(2), conformance = packaged) {
  const input = argv[0];
  if (input === "--self-test") return conformance.selfTest();
  else if (input) {
    const result = conformance.inspectFile(input);
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return result.valid ? 0 : 1;
  }
  return 2;
}
if (require.main === module) process.exitCode = main();
module.exports = { ...packaged, main };
