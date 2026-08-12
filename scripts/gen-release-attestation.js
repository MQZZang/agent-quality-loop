#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const REPO_ROOT = path.resolve(__dirname, "..");
const EVAL_CASES_PATH = path.join(
  REPO_ROOT,
  ".cursor",
  "skills",
  "agent-quality-loop",
  "references",
  "evaluation-cases.md",
);
const MANIFEST_PATH = path.join(
  REPO_ROOT,
  ".cursor",
  "skills",
  "agent-quality-loop",
  "manifest.json",
);
const ENVELOPE_SELF_TEST = path.join(
  REPO_ROOT,
  ".cursor",
  "skills",
  "agent-quality-loop",
  "scripts",
  "validate-envelope.js",
);
const PLATFORM_STATUSES = new Set(["PASS", "FAIL", "NOT_RUN"]);
const ROUTE_PACKAGES = 4;

function usage() {
  return [
    "Usage: node scripts/gen-release-attestation.js [options]",
    "",
    "Options:",
    "  --tag <tag>           Release tag (or env TAG)",
    "  --commit <sha>        Commit SHA (or env COMMIT_SHA, else git rev-parse HEAD)",
    "  --ubuntu <status>     PASS | FAIL | NOT_RUN (default: NOT_RUN)",
    "  --windows <status>    PASS | FAIL | NOT_RUN (default: NOT_RUN)",
    "  --out <path>          Write JSON to file (default: stdout)",
    "  --help                Show this help",
  ].join("\n");
}

function parseArgs(argv) {
  const options = {
    tag: process.env.TAG || null,
    commit: process.env.COMMIT_SHA || null,
    ubuntu: "NOT_RUN",
    windows: "NOT_RUN",
    out: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }
    const take = (name) => {
      const value = argv[++i];
      if (!value || value.startsWith("--")) {
        throw new Error(`${name} requires a value`);
      }
      return value;
    };
    if (arg === "--tag") {
      options.tag = take("--tag");
      continue;
    }
    if (arg.startsWith("--tag=")) {
      options.tag = arg.slice("--tag=".length);
      continue;
    }
    if (arg === "--commit") {
      options.commit = take("--commit");
      continue;
    }
    if (arg.startsWith("--commit=")) {
      options.commit = arg.slice("--commit=".length);
      continue;
    }
    if (arg === "--ubuntu") {
      options.ubuntu = take("--ubuntu");
      continue;
    }
    if (arg.startsWith("--ubuntu=")) {
      options.ubuntu = arg.slice("--ubuntu=".length);
      continue;
    }
    if (arg === "--windows") {
      options.windows = take("--windows");
      continue;
    }
    if (arg.startsWith("--windows=")) {
      options.windows = arg.slice("--windows=".length);
      continue;
    }
    if (arg === "--out") {
      options.out = take("--out");
      continue;
    }
    if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

function gitRevParseHead() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: REPO_ROOT,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`git rev-parse HEAD failed${detail ? `: ${detail}` : ""}`);
  }
  return result.stdout.trim();
}

/**
 * Prefer brief form /^## Case \d+/m when present; current evaluation-cases.md
 * uses /^## \d+\./m. Do not hardcode the count; derive from headings.
 */
function countEvaluationCases(markdown) {
  const caseHeadings = markdown.match(/^## Case \d+/gm);
  if (caseHeadings && caseHeadings.length > 0) return caseHeadings.length;
  const numberedHeadings = markdown.match(/^## \d+\./gm);
  return numberedHeadings ? numberedHeadings.length : 0;
}

function countEnvelopeRegressionCases() {
  const skillRoot = path.join(REPO_ROOT, ".cursor", "skills", "agent-quality-loop");
  const result = spawnSync(process.execPath, [ENVELOPE_SELF_TEST, "--self-test"], {
    cwd: skillRoot,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    const detail = (result.stderr || result.stdout || "").trim();
    throw new Error(`validate-envelope --self-test failed${detail ? `: ${detail}` : ""}`);
  }
  return (result.stdout || "")
    .split(/\r?\n/)
    .filter((line) => line.startsWith("PASS ")).length;
}

function sha256FileContents(absolutePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(absolutePath)).digest("hex");
}

function normalizePlatformStatus(label, value) {
  const status = String(value || "").trim().toUpperCase();
  if (!PLATFORM_STATUSES.has(status)) {
    throw new Error(`${label} must be one of PASS|FAIL|NOT_RUN (got ${JSON.stringify(value)})`);
  }
  return status;
}

function buildAttestation(options) {
  if (!options.tag) {
    throw new Error("tag is required (--tag or env TAG)");
  }

  const commit = options.commit || gitRevParseHead();
  if (!commit) {
    throw new Error("commit is required (--commit, env COMMIT_SHA, or git HEAD)");
  }

  if (!fs.existsSync(EVAL_CASES_PATH)) {
    throw new Error(`missing evaluation cases: ${EVAL_CASES_PATH}`);
  }
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`missing skill manifest: ${MANIFEST_PATH}`);
  }
  if (!fs.existsSync(ENVELOPE_SELF_TEST)) {
    throw new Error(`missing validate-envelope: ${ENVELOPE_SELF_TEST}`);
  }

  const evaluationCases = countEvaluationCases(fs.readFileSync(EVAL_CASES_PATH, "utf8"));
  const envelopeRegressionCases = countEnvelopeRegressionCases();

  return {
    schema_version: 1,
    tag: options.tag,
    commit,
    validation_entrypoint: "node scripts/validate-all.js",
    node_version: process.version,
    platforms: {
      ubuntu: normalizePlatformStatus("--ubuntu", options.ubuntu),
      windows: normalizePlatformStatus("--windows", options.windows),
    },
    evaluation_cases: evaluationCases,
    envelope_regression_cases: envelopeRegressionCases,
    route_packages: ROUTE_PACKAGES,
    skill_manifest_digest: sha256FileContents(MANIFEST_PATH),
    runtime_claims: {
      cursor: "NOT_RUN",
      codex: "NOT_RUN",
      claude_code: "NOT_RUN",
    },
    longitudinal_value: "NOT_RUN",
  };
}

function main(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error(usage());
    return 2;
  }

  if (options.help) {
    console.log(usage());
    return 0;
  }

  let attestation;
  try {
    attestation = buildAttestation(options);
  } catch (error) {
    console.error(error.message);
    return 1;
  }

  const json = `${JSON.stringify(attestation, null, 2)}\n`;
  if (options.out) {
    const outPath = path.resolve(options.out);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, json, "utf8");
  } else {
    process.stdout.write(json);
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  buildAttestation,
  countEvaluationCases,
  countEnvelopeRegressionCases,
  parseArgs,
  REPO_ROOT,
  ROUTE_PACKAGES,
};
