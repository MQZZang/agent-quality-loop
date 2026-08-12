#!/usr/bin/env node
"use strict";

// Aggregates Agent Quality Loop envelope snapshots (canonical envelope.json and
// history/*.json) into phase/verdict/dimension rates. Measurement input for
// RETRO, personalization review, and the capability re-baseline policy in
// CONTRIBUTING.md. Read-only: never writes or mutates envelopes.

const fs = require("fs");
const os = require("os");
const path = require("path");

function listJsonFiles(inputPaths) {
  const files = [];
  const missing = [];
  for (const input of inputPaths) {
    const resolved = path.resolve(input);
    let stat;
    try {
      stat = fs.statSync(resolved);
    } catch {
      missing.push(resolved);
      continue;
    }
    if (stat.isFile()) {
      if (resolved.endsWith(".json")) files.push(resolved);
      continue;
    }
    if (!stat.isDirectory()) continue;
    const rootEnvelope = path.join(resolved, "envelope.json");
    if (fs.existsSync(rootEnvelope)) files.push(rootEnvelope);
    for (const dir of [resolved, path.join(resolved, "history")]) {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        continue;
      }
      for (const entry of entries) {
        if (!entry.isFile() || !entry.name.endsWith(".json")) continue;
        const full = path.join(dir, entry.name);
        if (full !== rootEnvelope) files.push(full);
      }
    }
  }
  return { files: [...new Set(files)].sort(), missing };
}

function bump(map, key) {
  const label = typeof key === "string" && key.length > 0 ? key : "(unset)";
  map[label] = (map[label] || 0) + 1;
}

function aggregate(files) {
  const stats = {
    scanned: files.length,
    parsed: 0,
    invalid: [],
    by_phase: {},
    by_verdict: {},
    by_mode: {},
    by_assurance: {},
    by_skill_version: {},
    dimension_status: {},
    scope_deviation_envelopes: 0,
    scope_deviation_total: 0,
    blocker_reasons: {},
    independence_recorded: 0,
  };
  for (const file of files) {
    let envelope;
    try {
      envelope = JSON.parse(fs.readFileSync(file, "utf8"));
    } catch {
      stats.invalid.push(file);
      continue;
    }
    if (typeof envelope !== "object" || envelope === null || Array.isArray(envelope)) {
      stats.invalid.push(file);
      continue;
    }
    stats.parsed += 1;
    bump(stats.by_phase, envelope.phase);
    bump(stats.by_verdict, envelope.verdict);
    bump(stats.by_mode, envelope.mode);
    bump(stats.by_assurance, envelope.assurance);
    bump(stats.by_skill_version, envelope.skill_version);
    const gate = envelope.acceptance_gate;
    if (gate && typeof gate === "object" && gate.status_by_dimension && typeof gate.status_by_dimension === "object") {
      for (const [dimension, record] of Object.entries(gate.status_by_dimension)) {
        const status =
          record && typeof record === "object" && typeof record.status === "string"
            ? record.status
            : typeof record === "string"
              ? record
              : "(malformed)";
        if (!stats.dimension_status[dimension]) stats.dimension_status[dimension] = {};
        bump(stats.dimension_status[dimension], status);
      }
    }
    const deviations = envelope.implementation_receipt && envelope.implementation_receipt.scope_deviations;
    if (Array.isArray(deviations) && deviations.length > 0) {
      stats.scope_deviation_envelopes += 1;
      stats.scope_deviation_total += deviations.length;
    }
    if (envelope.blocker && typeof envelope.blocker === "object" && typeof envelope.blocker.reason === "string") {
      bump(stats.blocker_reasons, envelope.blocker.reason);
    }
    if (envelope.acceptance_independence !== null && envelope.acceptance_independence !== undefined) {
      stats.independence_recorded += 1;
    }
  }
  return stats;
}

function renderTable(title, map) {
  const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return [];
  const lines = [`${title}:`];
  for (const [key, count] of entries) lines.push(`  ${key}: ${count}`);
  return lines;
}

function renderReport(stats) {
  const lines = [];
  lines.push(`Envelopes scanned: ${stats.scanned} (parsed ${stats.parsed}, invalid ${stats.invalid.length})`);
  lines.push(...renderTable("By phase", stats.by_phase));
  lines.push(...renderTable("By verdict", stats.by_verdict));
  lines.push(...renderTable("By mode", stats.by_mode));
  lines.push(...renderTable("By assurance", stats.by_assurance));
  lines.push(...renderTable("By skill_version", stats.by_skill_version));
  for (const [dimension, statuses] of Object.entries(stats.dimension_status).sort()) {
    lines.push(...renderTable(`Dimension ${dimension}`, statuses));
  }
  lines.push(
    `Scope deviations: ${stats.scope_deviation_total} across ${stats.scope_deviation_envelopes} envelope(s)`,
  );
  lines.push(...renderTable("Blocker reasons", stats.blocker_reasons));
  lines.push(`Independent-acceptance records: ${stats.independence_recorded}`);
  for (const file of stats.invalid) lines.push(`INVALID (skipped): ${file}`);
  return lines.join("\n");
}

function runSelfTest() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "aql-stats-"));
  let failures = 0;
  const check = (condition, label) => {
    console.log(`${condition ? "PASS" : "FAIL"} ${label}`);
    if (!condition) failures += 1;
  };
  try {
    const historyDir = path.join(root, "history");
    fs.mkdirSync(historyDir, { recursive: true });
    fs.writeFileSync(
      path.join(root, "envelope.json"),
      JSON.stringify({ phase: "EVIDENCED", verdict: "PENDING", mode: "evidence", assurance: "standard", blocker: { reason: "missing evidence" } }),
    );
    fs.writeFileSync(
      path.join(historyDir, "one.json"),
      JSON.stringify({
        phase: "BUILT",
        verdict: "PASS",
        mode: "execute",
        assurance: "standard",
        skill_version: "2.3.0",
        implementation_receipt: { scope_deviations: ["touched extra doc"] },
      }),
    );
    fs.writeFileSync(
      path.join(historyDir, "two.json"),
      JSON.stringify({
        phase: "ACCEPTED",
        verdict: "PASS",
        mode: "full",
        assurance: "formal",
        skill_version: "2.3.0",
        acceptance_gate: {
          status_by_dimension: {
            goal_fidelity: { status: "PASS" },
            user_observable_result: { status: "FAIL" },
          },
        },
        acceptance_independence: { reviewer: "fresh-context", degraded: false },
      }),
    );
    fs.writeFileSync(path.join(historyDir, "broken.json"), "{not json");

    const { files, missing } = listJsonFiles([root]);
    check(files.length === 4 && missing.length === 0, "collects envelope.json plus history snapshots");
    const stats = aggregate(files);
    check(stats.parsed === 3 && stats.invalid.length === 1, "parses valid envelopes and isolates invalid JSON");
    check(
      stats.by_phase.BUILT === 1 && stats.by_phase.ACCEPTED === 1 && stats.by_phase.EVIDENCED === 1,
      "phase distribution counts every snapshot once",
    );
    check(
      stats.dimension_status.goal_fidelity.PASS === 1 && stats.dimension_status.user_observable_result.FAIL === 1,
      "acceptance dimensions aggregate per-status",
    );
    check(
      stats.scope_deviation_envelopes === 1 && stats.scope_deviation_total === 1,
      "scope deviations counted from implementation receipts",
    );
    check(stats.blocker_reasons["missing evidence"] === 1, "blocker reasons aggregate");
    check(stats.independence_recorded === 1, "independent-acceptance records counted");
    check(stats.by_skill_version["2.3.0"] === 2 && stats.by_skill_version["(unset)"] === 1, "skill_version drift is visible");
    const rendered = renderReport(stats);
    check(rendered.includes("Envelopes scanned: 4") && rendered.includes("INVALID"), "text report names totals and invalid files");
    const missingProbe = listJsonFiles([path.join(root, "does-not-exist")]);
    check(missingProbe.files.length === 0 && missingProbe.missing.length === 1, "missing inputs reported, not fatal");
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
  console.log(failures === 0 ? "Self-test passed" : `Self-test failures: ${failures}`);
  return failures === 0 ? 0 : 1;
}

const USAGE = "Usage: node scripts/aql-stats.js [paths...] [--json] [--self-test]  (default path: ./.agent-quality-loop)";

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return 0;
  }
  if (argv.includes("--self-test")) return runSelfTest();
  const json = argv.includes("--json");
  const inputs = argv.filter((arg) => !arg.startsWith("--"));
  const { files, missing } = listJsonFiles(inputs.length > 0 ? inputs : [".agent-quality-loop"]);
  const stats = aggregate(files);
  stats.missing_inputs = missing;
  if (json) {
    console.log(JSON.stringify(stats, null, 2));
  } else {
    console.log(renderReport(stats));
    for (const input of missing) console.log(`MISSING input (skipped): ${input}`);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = { listJsonFiles, aggregate, renderReport, main };
