#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EXPERIMENT = path.join(ROOT, "docs", "experiments", "aql-3.2-information-alignment");
const INPUT_PATH = path.join(EXPERIMENT, "behavior-inputs.json");
const RUBRIC_PATH = path.join(EXPERIMENT, "adjudication-rubric.json");
const RESULT_PATHS = {
  A: path.join(EXPERIMENT, "results", "arm-a-raw.json"),
  B: path.join(EXPERIMENT, "results", "arm-b-raw.json"),
};
const PROTOCOL = "aql-3.2-information-alignment/1";
const REQUIRED_RESULT_FIELDS = [
  "case_id",
  "conclusion",
  "intended_reads",
  "intended_writes",
  "asks_user",
  "retained_constraints",
  "unsupported_claims",
  "notes",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function validate() {
  const errors = [];
  const inputs = readJson(INPUT_PATH);
  const rubric = readJson(RUBRIC_PATH);

  if (inputs.protocol_version !== PROTOCOL || rubric.protocol_version !== PROTOCOL) {
    errors.push("input and rubric protocol versions must match the frozen protocol");
  }
  if (rubric.frozen_before_candidate_run !== true) {
    errors.push("rubric must declare frozen_before_candidate_run=true");
  }

  const inputCases = Array.isArray(inputs.cases) ? inputs.cases : [];
  const rubricCases = Array.isArray(rubric.cases) ? rubric.cases : [];
  const inputIds = inputCases.map((item) => item.id);
  const rubricIds = rubricCases.map((item) => item.id);
  if (inputCases.length !== 16 || new Set(inputIds).size !== 16) {
    errors.push("behavior inputs must contain exactly 16 unique cases");
  }
  if (JSON.stringify(inputIds) !== JSON.stringify(rubricIds)) {
    errors.push("rubric ids and order must exactly match behavior inputs");
  }
  const formerHeldOut = rubricCases.filter((item) => item.former_held_out === true).map((item) => item.id);
  if (rubric.held_out_status !== "LOST_AFTER_FIRST_CANDIDATE_REVIEW") {
    errors.push("rubric must disclose that held-out status was lost after round-1 review");
  }
  if (JSON.stringify(formerHeldOut) !== JSON.stringify(["ia-15-multiple-material-risks", "ia-16-held-out-payroll-join"])) {
    errors.push("former held-out set must preserve the two preregistered case identities");
  }

  const serializedInputs = JSON.stringify(inputs);
  for (const forbidden of ["must_hold", "falsifiers", "held_out", "decision_rule"]) {
    if (serializedInputs.includes(`\"${forbidden}\"`)) {
      errors.push(`behavior inputs leak adjudication field ${forbidden}`);
    }
  }

  for (const [arm, resultPath] of Object.entries(RESULT_PATHS)) {
    if (!fs.existsSync(resultPath)) {
      errors.push(`missing raw result for arm ${arm}: ${path.relative(ROOT, resultPath)}`);
      continue;
    }
    const result = readJson(resultPath);
    if (result.arm !== arm) errors.push(`arm ${arm} result declares arm=${result.arm}`);
    const cases = Array.isArray(result.cases) ? result.cases : [];
    const ids = cases.map((item) => item.case_id);
    if (cases.length !== 16 || new Set(ids).size !== 16) {
      errors.push(`arm ${arm} must contain exactly 16 unique case results`);
    }
    if (JSON.stringify(ids) !== JSON.stringify(inputIds)) {
      errors.push(`arm ${arm} result ids/order differ from frozen inputs`);
    }
    for (const item of cases) {
      for (const field of REQUIRED_RESULT_FIELDS) {
        if (!Object.prototype.hasOwnProperty.call(item, field)) {
          errors.push(`arm ${arm} ${item.case_id || "unknown"} missing ${field}`);
        }
      }
    }
    const opened = Array.isArray(result.opened_files) ? result.opened_files.join("\n") : "";
    if (/adjudication-rubric|arm-[ab]-raw/i.test(opened)) {
      errors.push(`arm ${arm} opened a forbidden rubric or result file`);
    }
  }

  return errors;
}

function main() {
  const errors = validate();
  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL ${error}`);
    return 1;
  }
  console.log("PASS information-alignment protocol: separate inputs/rubric, 16 paired raw cases, former held-out status disclosed");
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { validate, main, INPUT_PATH, RUBRIC_PATH, RESULT_PATHS };
