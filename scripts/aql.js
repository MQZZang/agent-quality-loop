#!/usr/bin/env node

"use strict";

const packaged = require("../.cursor/skills/agent-quality-loop/scripts/aql.js");
if (require.main === module) process.exitCode = packaged.run();
module.exports = packaged;
