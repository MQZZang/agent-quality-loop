#!/usr/bin/env node
"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");

const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..");

const CLAIM_TYPES = new Set([
  "factual-claim",
  "causal-claim",
  "writing-principle",
  "collaboration-heuristic",
  "operational-method",
  "value-judgment",
  "case",
  "marketing-claim",
  "neuroscience-or-psychology-claim",
]);
const DECISIONS = new Set(["accepted", "heuristic", "rejected"]);
const EVIDENCE_GRADES = new Set(["A", "B", "C", "D", "U"]);
const WEAK_ACCEPTANCE_GRADES = new Set(["D", "U"]);

function load(file) {
  return JSON.parse(fs.readFileSync(path.resolve(file), "utf8"));
}

function present(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(present);
  if (typeof value === "object") return Object.keys(value).length > 0;
  return true;
}

function markdownHeadingSlug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/<[^>]*>/g, "")
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");
}

function resolveIntegrationTarget(target, repoRoot = DEFAULT_REPO_ROOT) {
  if (typeof target !== "string" || !target.trim()) return { error: "integration_target must be a non-empty string" };
  const [rawPath, ...anchorParts] = target.trim().split("#");
  const anchor = anchorParts.join("#");
  if (!rawPath || path.isAbsolute(rawPath) || /^[A-Za-z]:/.test(rawPath)) {
    return { error: "integration_target path must be repository-relative" };
  }
  const normalized = rawPath.replaceAll("\\", "/");
  if (normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    return { error: "integration_target path contains an unsafe segment" };
  }
  const skillRelative = normalized === "SKILL.md"
    || normalized === "manifest.json"
    || /^(?:references|scripts|agents)\//.test(normalized);
  const base = skillRelative
    ? path.join(repoRoot, ".cursor", "skills", "agent-quality-loop")
    : repoRoot;
  const absolutePath = path.resolve(base, ...normalized.split("/"));
  const relative = path.relative(base, absolutePath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return { error: "integration_target resolves outside its allowed root" };
  }
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    return { error: `integration_target file does not exist: ${normalized}` };
  }
  if (anchor) {
    const source = fs.readFileSync(absolutePath, "utf8");
    const anchors = new Set();
    const seen = new Map();
    for (const match of source.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
      const baseSlug = markdownHeadingSlug(match[1]);
      const occurrence = seen.get(baseSlug) || 0;
      seen.set(baseSlug, occurrence + 1);
      anchors.add(occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence}`);
    }
    if (!anchors.has(anchor)) {
      return { error: `integration_target anchor does not exist: ${normalized}#${anchor}` };
    }
  }
  return { absolutePath, anchor };
}

function validate(claimDocument, inventory, options = {}) {
  const errors = [];
  const repoRoot = options.repoRoot || DEFAULT_REPO_ROOT;
  const inventoryByHash = new Map();
  for (const file of inventory.files || []) {
    if (!inventoryByHash.has(file.sha256)) inventoryByHash.set(file.sha256, []);
    inventoryByHash.get(file.sha256).push(file.path);
  }
  const claims = Array.isArray(claimDocument)
    ? claimDocument
    : (claimDocument.claims || claimDocument.rows || []);
  if (!Array.isArray(claims)) return { errors: ["claims must be an array or {claims: []}"], count: 0 };

  const ids = new Set();
  const requiredFields = [
    "claim_id",
    "source_ref",
    "source_type",
    "normalized_claim",
    "claim_type",
    "mechanism",
    "intended_outcome",
    "applies_when",
    "does_not_apply_when",
    "tradeoffs",
    "counterexamples",
    "supporting_evidence",
    "counterevidence",
    "evidence_grade",
    "freshness",
    "copyright_status",
    "decision",
    "integration_target",
  ];

  claims.forEach((claim, index) => {
    const at = `claim[${index}]`;
    if (!claim || typeof claim !== "object" || Array.isArray(claim)) {
      errors.push(`${at} must be an object`);
      return;
    }
    for (const field of requiredFields) {
      if (!present(claim[field])) errors.push(`${at} requires ${field}`);
    }
    if (!claim.claim_id || ids.has(claim.claim_id)) errors.push(`${at} requires a unique claim_id`);
    ids.add(claim.claim_id);
    if (!CLAIM_TYPES.has(claim.claim_type)) errors.push(`${at} has invalid claim_type`);
    if (!DECISIONS.has(claim.decision)) errors.push(`${at} has invalid decision`);
    if (!EVIDENCE_GRADES.has(claim.evidence_grade)) errors.push(`${at} has invalid evidence_grade`);
    if (claim.decision === "accepted" && WEAK_ACCEPTANCE_GRADES.has(claim.evidence_grade)) {
      errors.push(`${at} accepted claim requires A, B, or C evidence`);
    }

    const sourceRef = claim.source_ref || {};
    const sourceHash = sourceRef.sha256;
    if (!sourceHash || !inventoryByHash.has(sourceHash)) {
      errors.push(`${at} source_ref.sha256 must match inventory`);
    } else if (!sourceRef.path || !inventoryByHash.get(sourceHash).includes(sourceRef.path)) {
      errors.push(`${at} source_ref.path does not match source_ref.sha256`);
    }
    if (!present(sourceRef.locator)) errors.push(`${at} requires source_ref.locator`);
    const evidence = claim.supporting_evidence || {};
    if (!present(evidence.locator) || !present(evidence.summary)) {
      errors.push(`${at} supporting_evidence requires locator and summary`);
    }
    if (present(sourceRef.locator) && present(evidence.locator) && sourceRef.locator !== evidence.locator) {
      errors.push(`${at} source/supporting locators must match`);
    }
    const excerpt = claim.source_excerpt || "";
    if (excerpt.length > 500) errors.push(`${at} source excerpt exceeds 500 characters`);
    if (present(claim.integration_target)) {
      const targetResult = resolveIntegrationTarget(claim.integration_target, repoRoot);
      if (targetResult.error) errors.push(`${at} ${targetResult.error}`);
    }
  });

  return { errors, count: claims.length };
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const [key, inlineValue] = token.slice(2).split("=", 2);
    parsed[key] = inlineValue === undefined
      ? (argv[index + 1]?.startsWith("--") ? true : argv[++index] ?? true)
      : inlineValue;
  }
  return parsed;
}

function main(argv = process.argv.slice(2)) {
  const args = parseArgs(argv);
  if (args.help) {
    console.log("usage: node validate-corpus-claims.js --claims FILE --inventory FILE [--check] [--self-test]");
    return 0;
  }
  if (args["self-test"]) {
    const hash = "a".repeat(64);
    const inventory = { files: [{ path: "source.md", sha256: hash }] };
    const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aql-claim-target-"));
    fs.writeFileSync(path.join(fixtureRoot, "reference.md"), "# Section\n", "utf8");
    const good = {
      claims: [{
        claim_id: "C-001",
        source_ref: { path: "source.md", sha256: hash, locator: "lines 1-2" },
        source_type: "primary-documentation",
        normalized_claim: "A bounded test claim.",
        claim_type: "factual-claim",
        mechanism: "A described mechanism.",
        intended_outcome: "A decidable result.",
        applies_when: "The stated preconditions hold.",
        does_not_apply_when: "The preconditions do not hold.",
        tradeoffs: "Adds one explicit check.",
        counterexamples: ["An observable falsifier."],
        supporting_evidence: { locator: "lines 1-2", summary: "Short paraphrase." },
        counterevidence: "No contradictory evidence in the bounded source; generalization remains limited.",
        evidence_grade: "A",
        freshness: "source checked locally 2026-08-13",
        copyright_status: "license-unknown; paraphrase-only",
        decision: "accepted",
        integration_target: "reference.md#section",
      }],
    };
    try {
      if (validate(good, inventory, { repoRoot: fixtureRoot }).errors.length) throw new Error("valid claim rejected");
      const invalid = JSON.parse(JSON.stringify(good));
      delete invalid.claims[0].counterevidence;
      if (!validate(invalid, inventory, { repoRoot: fixtureRoot }).errors.length) throw new Error("invalid claim accepted");
      const weak = JSON.parse(JSON.stringify(good));
      weak.claims[0].evidence_grade = "U";
      if (!validate(weak, inventory, { repoRoot: fixtureRoot }).errors.length) throw new Error("weak accepted claim accepted");
      const missingAnchor = JSON.parse(JSON.stringify(good));
      missingAnchor.claims[0].integration_target = "reference.md#missing";
      if (!validate(missingAnchor, inventory, { repoRoot: fixtureRoot }).errors.some((error) => error.includes("anchor does not exist"))) {
        throw new Error("missing integration anchor accepted");
      }
      const missingFile = JSON.parse(JSON.stringify(good));
      missingFile.claims[0].integration_target = "missing.md";
      if (!validate(missingFile, inventory, { repoRoot: fixtureRoot }).errors.some((error) => error.includes("file does not exist"))) {
        throw new Error("missing integration file accepted");
      }
      console.log("validate-corpus-claims self-test: PASS");
      return 0;
    } finally {
      fs.rmSync(fixtureRoot, { recursive: true, force: true });
    }
  }
  if (!args.claims || !args.inventory) {
    console.error("usage: node validate-corpus-claims.js --claims FILE --inventory FILE [--check]");
    return 2;
  }
  const result = validate(load(args.claims), load(args.inventory));
  if (result.errors.length) {
    result.errors.forEach((error) => console.error(`ERROR ${error}`));
    return 1;
  }
  console.log(`validate-corpus-claims: PASS (${result.count} claims)`);
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { validate, main, markdownHeadingSlug, resolveIntegrationTarget };
