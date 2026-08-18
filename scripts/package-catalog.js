"use strict";

const { repoRoot } = require("./gen-manifest");

const PACKAGE_NAME = "agent-quality-loop";
const SUITES = Object.freeze({ core: [PACKAGE_NAME] });

module.exports = { PACKAGE_NAME, SUITES, repoRoot };
