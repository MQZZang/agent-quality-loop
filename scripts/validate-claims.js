#!/usr/bin/env node

"use strict";

/**
 * Claim-consistency checks for maintainer/CI claims that drift easily
 * (evaluation-case counts, suite sizes, manifests).
 *
 * Invoked from scripts/validate-all.js — do not treat as a second entrypoint.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const { checkSkills } = require("./sync-skills");
const { routePackageNames, loadCatalog } = require("./package-catalog");
const { listPackageSkillDirs, repoRoot, checkManifestConsistency } = require("./gen-manifest");

const EXPECTED_CORE_SKILLS = 4;
const EXPECTED_ROUTE_PACKAGES = 4;

const EVAL_CASES_REL = path.join(
  ".cursor",
  "skills",
  "agent-quality-loop",
  "references",
  "evaluation-cases.md",
);
const ENVELOPE_VALIDATOR_REL = path.join(
  ".cursor",
  "skills",
  "agent-quality-loop",
  "scripts",
  "validate-envelope.js",
);

/**
 * Parse evaluation-case headings.
 * Supports `## Case N` and the shipped `## N. Title` form.
 * @param {string} content
 * @returns {number[]}
 */
function parseEvaluationCaseNumbers(content) {
  const numbers = [];
  for (const line of content.split(/\r?\n/)) {
    let match = line.match(/^##\s+Case\s+(\d+)\b/i);
    if (!match) match = line.match(/^##\s+(\d+)\.\s+\S/);
    if (match) numbers.push(parseInt(match[1], 10));
  }
  return numbers;
}

/**
 * @param {number[]} numbers
 * @returns {{ count: number, errors: string[] }}
 */
function verifyContiguousCases(numbers) {
  const errors = [];
  if (numbers.length === 0) {
    return { count: 0, errors: ["evaluation-cases.md has no numbered case headings"] };
  }
  const sorted = [...numbers].sort((a, b) => a - b);
  const unique = [...new Set(sorted)];
  if (unique.length !== sorted.length) {
    errors.push("evaluation-cases.md has duplicate case numbers");
  }
  const max = unique[unique.length - 1];
  for (let expected = 1; expected <= max; expected += 1) {
    if (!unique.includes(expected)) {
      errors.push(`evaluation-cases.md missing case ${expected} (expected contiguous 1..${max})`);
    }
  }
  if (unique[0] !== 1) {
    errors.push(`evaluation-cases.md case numbering must start at 1 (got ${unique[0]})`);
  }
  if (unique.length !== max) {
    errors.push(`evaluation-cases.md case count ${unique.length} does not match max index ${max}`);
  }
  return { count: max, errors };
}

/**
 * Numbers claimed in README as "NN evaluation cases".
 * @param {string} readme
 * @returns {number[]}
 */
function parseReadmeEvaluationCaseClaims(readme) {
  const claims = [];
  const re = /\b(\d+)\s+evaluation\s+cases\b/gi;
  let match;
  while ((match = re.exec(readme)) !== null) {
    claims.push(parseInt(match[1], 10));
  }
  return claims;
}

/**
 * Count envelope self-test registry names by parsing validate-envelope.js source,
 * then cross-check against live --self-test PASS/FAIL lines.
 * @param {string} root
 * @returns {{ namedCount: number, reportedCount: number, errors: string[] }}
 */
function countEnvelopeRegressionCases(root) {
  const errors = [];
  const validatorPath = path.join(root, ENVELOPE_VALIDATOR_REL);
  if (!fs.existsSync(validatorPath)) {
    return {
      namedCount: 0,
      reportedCount: 0,
      errors: [`missing envelope validator: ${ENVELOPE_VALIDATOR_REL}`],
    };
  }

  const source = fs.readFileSync(validatorPath, "utf8");
  const named = [];
  const nameRe = /cases\.push\(\s*\{\s*name:\s*"([^"]+)"/g;
  let nameMatch;
  while ((nameMatch = nameRe.exec(source)) !== null) {
    named.push(nameMatch[1]);
  }
  // check-refs adjunct cases also print PASS/FAIL in runSelfTest (not in cases[]).
  const checkRefsPassLines = (source.match(/console\.log\(`\$\{[^}]+\} (check-refs [^`]+)`/g) || []).length;

  const result = spawnSync(process.execPath, [validatorPath, "--self-test"], {
    cwd: root,
    encoding: "utf8",
    shell: false,
  });
  if (result.status !== 0) {
    errors.push(
      `validate-envelope --self-test exited ${result.status}: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  const reportedLines = (result.stdout || "")
    .split(/\r?\n/)
    .filter((line) => /^(PASS|FAIL) /.test(line));
  const reportedCount = reportedLines.length;
  const namedCount = named.length + checkRefsPassLines;

  if (reportedCount === 0) {
    errors.push("envelope self-test reported zero PASS/FAIL lines");
  }
  if (named.length === 0) {
    errors.push("could not parse any named cases from validate-envelope self-test registry");
  }
  if (namedCount > 0 && reportedCount > 0 && namedCount !== reportedCount) {
    errors.push(
      `envelope regression count mismatch: registry+check-refs=${namedCount}, self-test lines=${reportedCount}`,
    );
  }

  return { namedCount, reportedCount, errors };
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function listCoreSkillNames(root) {
  const cursorRoot = path.join(root, ".cursor", "skills");
  const routes = new Set(routePackageNames({ root }));
  return listPackageSkillDirs(cursorRoot)
    .map((dir) => path.basename(dir))
    .filter((name) => !routes.has(name))
    .sort();
}

/**
 * @param {string} [root]
 * @returns {{ ok: boolean, errors: string[], warnings: string[], summary: object }}
 */
function validateClaims(root = repoRoot()) {
  const errors = [];
  const warnings = [];
  const summary = {};

  // 1. Evaluation cases contiguous + README number match
  const evalPath = path.join(root, EVAL_CASES_REL);
  if (!fs.existsSync(evalPath)) {
    errors.push(`missing ${EVAL_CASES_REL}`);
  } else {
    const evalContent = fs.readFileSync(evalPath, "utf8");
    const numbers = parseEvaluationCaseNumbers(evalContent);
    const contiguous = verifyContiguousCases(numbers);
    summary.evaluationCaseCount = contiguous.count;
    errors.push(...contiguous.errors);

    const readmePath = path.join(root, "README.md");
    if (!fs.existsSync(readmePath)) {
      errors.push("missing README.md");
    } else {
      const readme = fs.readFileSync(readmePath, "utf8");
      const claims = parseReadmeEvaluationCaseClaims(readme);
      summary.readmeEvaluationCaseClaims = claims;
      if (claims.length === 0) {
        warnings.push(
          'README.md has no "N evaluation cases" claim (preferred: state the derived count or point at evaluation-cases.md)',
        );
      } else {
        for (const claimed of claims) {
          if (claimed !== contiguous.count) {
            errors.push(
              `README claims ${claimed} evaluation cases but evaluation-cases.md derives ${contiguous.count}`,
            );
          }
        }
      }
    }
  }

  // 2. Envelope regression count
  const envelope = countEnvelopeRegressionCases(root);
  summary.envelopeRegressionNamed = envelope.namedCount;
  summary.envelopeRegressionReported = envelope.reportedCount;
  errors.push(...envelope.errors);

  // 3. Route packages = 4
  try {
    const catalog = loadCatalog({ catalogRoot: root });
    const routes = routePackageNames({ catalogRoot: root });
    summary.routePackageCount = routes.length;
    summary.routePackages = routes;
    if (routes.length !== EXPECTED_ROUTE_PACKAGES) {
      errors.push(
        `route packages expected ${EXPECTED_ROUTE_PACKAGES} from routes.json, got ${routes.length}: ${routes.join(", ")}`,
      );
    }
    if (!catalog || !Array.isArray(catalog.routes)) {
      errors.push("routes.json missing routes array");
    }
  } catch (error) {
    errors.push(`routes.json: ${error.message}`);
  }

  // 4. Core skills = 4
  try {
    const core = listCoreSkillNames(root);
    summary.coreSkillCount = core.length;
    summary.coreSkills = core;
    if (core.length !== EXPECTED_CORE_SKILLS) {
      errors.push(
        `core skills expected ${EXPECTED_CORE_SKILLS}, got ${core.length}: ${core.join(", ")}`,
      );
    }
  } catch (error) {
    errors.push(`core skills: ${error.message}`);
  }

  // 5. Manifest hashes consistent (same helper path as sync --check)
  try {
    const manifestErrors = checkSkills({ root });
    summary.manifestConsistencyErrors = manifestErrors.length;
    for (const err of manifestErrors) {
      errors.push(`manifest: ${err}`);
    }
  } catch (error) {
    errors.push(`manifest consistency: ${error.message}`);
  }

  // Dist route manifests (when present) — hash self-consistency
  const distCursor = path.join(root, "dist", "route-shims", "cursor");
  if (fs.existsSync(distCursor)) {
    for (const name of fs.readdirSync(distCursor)) {
      const pkgDir = path.join(distCursor, name);
      if (!fs.statSync(pkgDir).isDirectory()) continue;
      if (!fs.existsSync(path.join(pkgDir, "manifest.json"))) continue;
      const pkgErrors = checkManifestConsistency(pkgDir);
      for (const err of pkgErrors) {
        errors.push(`route manifest ${name}: ${err}`);
      }
    }
  }

  return {
    ok: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/validate-claims.js [--json]");
    return 0;
  }
  const json = argv.includes("--json");
  const result = validateClaims();
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) console.warn(`WARN ${warning}`);
    for (const error of result.errors) console.error(`FAIL ${error}`);
    if (result.ok) {
      const s = result.summary;
      console.log(
        `PASS claim consistency: ${s.evaluationCaseCount} evaluation cases, ${s.envelopeRegressionReported} envelope regressions, ${s.routePackageCount} routes, ${s.coreSkillCount} core skills, manifests ok`,
      );
    }
  }
  return result.ok ? 0 : 1;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  validateClaims,
  parseEvaluationCaseNumbers,
  verifyContiguousCases,
  parseReadmeEvaluationCaseClaims,
  countEnvelopeRegressionCases,
  EXPECTED_CORE_SKILLS,
  EXPECTED_ROUTE_PACKAGES,
};
