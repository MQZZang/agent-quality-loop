#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const FIXTURE_PATH = path.join(__dirname, "..", "docs", "experiments", "aql-3.2", "patch-fixtures.json");
const PATCHES = [
  "current_target_authority",
  "mechanism_identity",
  "source_fidelity_acceptance",
  "correction_dependency",
  "intent_specific_reasoning",
  "no_visible_alignment_ceremony",
];
const H0 = new Set(["PASS", "FAIL", "BLOCKED", "REVIEW_REQUIRED"]);

function loadFixtures(filePath = FIXTURE_PATH) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validateFixtures(data) {
  const errors = [];
  if (!data || typeof data !== "object") return ["fixture root must be an object"];
  if (data.product_benefit_status !== "NOT_RUN") {
    errors.push("product_benefit_status must remain NOT_RUN before a controlled behavioral run");
  }
  if (!Array.isArray(data.cases)) errors.push("cases must be an array");
  if (!Array.isArray(data.calibration_anchors)) errors.push("calibration_anchors must be an array");

  const cases = Array.isArray(data.cases) ? data.cases : [];
  for (const patch of PATCHES) {
    const pair = cases.filter((item) => item.patch === patch);
    const polarities = new Set(pair.map((item) => item.polarity));
    if (pair.length !== 2 || !polarities.has("positive") || !polarities.has("negative")) {
      errors.push(`${patch} must have exactly one positive and one negative fixture`);
    }
  }
  if (cases.length !== PATCHES.length * 2) errors.push("fixture suite must contain exactly 12 patch cases");
  const ids = new Set();
  for (const item of cases) {
    if (!item.id || ids.has(item.id)) errors.push(`case id missing or duplicate: ${item.id}`);
    ids.add(item.id);
    if (!H0.has(item.expected_h0)) errors.push(`${item.id}: invalid expected_h0`);
    if (!item.prompt || !Array.isArray(item.must_hold) || item.must_hold.length === 0 || !item.falsifier) {
      errors.push(`${item.id}: prompt, must_hold, and falsifier are required`);
    }
  }

  const anchors = Array.isArray(data.calibration_anchors) ? data.calibration_anchors : [];
  const byId = Object.fromEntries(anchors.map((item) => [item.id, item]));
  const expected = {
    "anchor-missing-referent": "FAIL",
    "anchor-regex-only": "REVIEW_REQUIRED",
    "anchor-source-unreadable": "BLOCKED",
  };
  for (const [id, outcome] of Object.entries(expected)) {
    const anchor = byId[id];
    if (!anchor) errors.push(`missing calibration anchor ${id}`);
    else if (anchor.expected_h0 !== outcome) errors.push(`${id} must calibrate to ${outcome}`);
  }
  if (byId["anchor-regex-only"] && byId["anchor-regex-only"].heuristic_flag !== true) {
    errors.push("regex-only anchor must carry a heuristic flag");
  }
  if (byId["anchor-regex-only"] && byId["anchor-regex-only"].expected_h0 === "FAIL") {
    errors.push("a heuristic flag alone must never produce FAIL");
  }
  return errors;
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/calibrate-adjudication.js [--self-test]");
    console.log("Validates preregistered M0/H0/H1 anchors and paired patch fixtures; it does not grade model behavior.");
    return 0;
  }
  const errors = validateFixtures(loadFixtures());
  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL ${error}`);
    return 1;
  }
  console.log("PASS M0/H0/H1 calibration anchors and 12 paired semantic fixtures; product benefit remains NOT_RUN");
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { FIXTURE_PATH, PATCHES, loadFixtures, validateFixtures, main };
