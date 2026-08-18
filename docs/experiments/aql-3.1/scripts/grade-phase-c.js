#!/usr/bin/env node
"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const TRIGGER_RE = /agent-quality-loop[\\/]+SKILL\.md/i;

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function triggeredFromText(text) {
  return TRIGGER_RE.test(String(text || ""));
}

function grade(queries, runs) {
  const byQuery = {};
  for (const q of [...queries.should_trigger, ...queries.should_not_trigger]) {
    byQuery[q.id] = { id: q.id, expect: queries.should_trigger.some((x) => x.id === q.id) ? "trigger" : "silent", runs: [] };
  }
  for (const run of runs) {
    const row = byQuery[run.query_id];
    if (!row) continue;
    row.runs.push({
      repeat: run.repeat,
      triggered: Boolean(run.triggered),
      transcript_sha256: run.transcript_sha256,
      model: run.model,
      runner: run.runner,
    });
  }
  const should = queries.should_trigger.map((q) => scoreQuery(byQuery[q.id], true));
  const shouldNot = queries.should_not_trigger.map((q) => scoreQuery(byQuery[q.id], false));
  const passShould = should.filter((x) => x.pass).length;
  const passShouldNot = shouldNot.filter((x) => x.pass).length;
  let suite = "FAIL";
  if (passShould >= 7 && passShouldNot >= 7) suite = "PASS";
  else if (passShould >= 6 && passShouldNot >= 6) suite = "BORDERLINE";
  if (should.some((x) => x.runs.length < 3) || shouldNot.some((x) => x.runs.length < 3)) {
    suite = suite === "PASS" || suite === "BORDERLINE" ? suite : "INCOMPLETE";
  }
  return {
    protocol: queries.protocol,
    should_trigger_pass: `${passShould}/8`,
    should_not_trigger_pass: `${passShouldNot}/8`,
    suite,
    should,
    shouldNot,
  };
}

function scoreQuery(row, wantTrigger) {
  const n = row.runs.length;
  const hits = row.runs.filter((r) => r.triggered).length;
  const pass = wantTrigger ? hits >= 2 && n >= 3 : hits <= 1 && n >= 3;
  return { id: row.id, expect: row.expect, hits, n, pass, runs: row.runs };
}

function main(argv = process.argv.slice(2)) {
  if (argv[0] !== "--runs") {
    console.error("Usage: node grade-phase-c.js --runs <runs.json> --queries <queries.json>");
    return 2;
  }
  const runs = JSON.parse(fs.readFileSync(argv[1], "utf8"));
  const qIdx = argv.indexOf("--queries");
  const queries = JSON.parse(fs.readFileSync(argv[qIdx + 1], "utf8"));
  const report = grade(queries, runs);
  console.log(JSON.stringify(report, null, 2));
  return report.suite === "PASS" ? 0 : 1;
}

if (require.main === module) process.exitCode = main();

module.exports = { grade, triggeredFromText, sha256 };
