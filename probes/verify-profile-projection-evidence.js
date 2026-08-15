#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const {
  ROOT,
  EVIDENCE_FORMAT_VERSION,
  artifactRecord,
  sha256Bytes,
} = require("./profile-projection-evidence-utils");
const { portableEvidenceKinds } = require("./profile-projection-portable-evidence");
const { buildPrompt, parseSuite } = require("./run-profile-projection-smoke");

const DEFAULT_DIRS = [
  "probes/generated/profile-projection-v1-smoke-v2",
  "probes/generated/profile-projection-v1-behavior-addendum-v2",
  "probes/transcripts/2026-08-15/profile-projection-v1-smoke-v2",
  "probes/transcripts/2026-08-15/profile-projection-v1-behavior-addendum-v2",
  "probes/transcripts/2026-08-15/profile-projection-v1-opt-in-boundary-v2",
  "probes/transcripts/2026-08-15/profile-projection-v1-neutral-review-v2",
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function verifyLock(directory) {
  const manifestPath = path.join(directory, "manifest.json");
  const lockPath = path.join(directory, "evidence.lock.json");
  const lock = readJson(lockPath);
  const manifestRecord = artifactRecord(manifestPath);
  if (lock.evidence_format_version !== EVIDENCE_FORMAT_VERSION) throw new Error(`${directory}: lock evidence format mismatch`);
  if (lock.manifest_ref !== manifestRecord.ref || lock.manifest_sha256 !== manifestRecord.sha256 || lock.manifest_bytes !== manifestRecord.bytes) {
    throw new Error(`${directory}: manifest lock mismatch`);
  }
  return readJson(manifestPath);
}

function collectFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? collectFiles(target) : [target];
  });
}

function verifyDirectorySafety(directory) {
  for (const filePath of collectFiles(directory)) {
    const kinds = portableEvidenceKinds(fs.readFileSync(filePath, "utf8"));
    if (kinds.length > 0) throw new Error(`${filePath}: unsafe evidence kinds ${kinds.join(", ")}`);
  }
}

function verifyArtifact(record) {
  if (!record || typeof record.ref !== "string" || !/^[a-f0-9]{64}$/.test(record.sha256 || "")) {
    throw new Error("Invalid evidence artifact record");
  }
  const filePath = path.resolve(ROOT, record.ref);
  const canonicalRef = path.relative(ROOT, filePath).split(path.sep).join("/");
  if (canonicalRef.startsWith("../") || path.isAbsolute(canonicalRef) || canonicalRef !== record.ref.replace(/\\/g, "/")) {
    throw new Error(`Evidence ref is not canonical: ${record.ref}`);
  }
  const actual = artifactRecord(filePath);
  if (actual.sha256 !== record.sha256 || actual.bytes !== record.bytes) {
    throw new Error(`Evidence digest mismatch: ${record.ref}`);
  }
  const kinds = portableEvidenceKinds(fs.readFileSync(filePath, "utf8"));
  if (kinds.length > 0) throw new Error(`Unsafe evidence remains in ${record.ref}: ${kinds.join(", ")}`);
  return actual;
}

function verifyCanonicalFileSet(directory, manifest) {
  const expected = new Set([
    path.join(directory, "manifest.json"),
    path.join(directory, "evidence.lock.json"),
  ].map((filePath) => path.resolve(filePath)));
  const add = (record) => {
    if (record && record.ref) expected.add(path.resolve(ROOT, record.ref));
  };
  if (manifest.environment_artifact) add(manifest.environment_artifact);
  for (const run of manifest.runs || []) for (const artifact of Object.values(run.artifacts || {})) add(artifact);
  for (const prompt of manifest.prompts || []) add(prompt.artifact);
  for (const artifact of Object.values(manifest.artifacts || {})) add(artifact);
  const actual = new Set(collectFiles(directory).map((filePath) => path.resolve(filePath)));
  const extra = [...actual].filter((filePath) => !expected.has(filePath));
  const missing = [...expected].filter((filePath) => !actual.has(filePath));
  if (extra.length > 0 || missing.length > 0) {
    throw new Error(`${directory}: canonical file set mismatch extra=${extra.length} missing=${missing.length}`);
  }
}

function verifyBatch(manifest) {
  if (manifest.evidence_format_version !== EVIDENCE_FORMAT_VERSION) throw new Error("batch evidence format mismatch");
  if (!Array.isArray(manifest.runs) || manifest.runs.length !== manifest.expected_run_count) {
    throw new Error("batch run count mismatch");
  }
  verifyArtifact(manifest.environment_artifact);
  const runnerSha = sha256Bytes(fs.readFileSync(path.join(__dirname, "run-profile-projection-smoke.js")));
  const utilsSha = sha256Bytes(fs.readFileSync(path.join(__dirname, "profile-projection-evidence-utils.js")));
  if (manifest.runner_sha256 !== runnerSha || manifest.evidence_utils_sha256 !== utilsSha) {
    throw new Error("batch runner identity mismatch");
  }
  for (const run of manifest.runs) {
    if (run.exit_code !== 0) throw new Error(`${run.run_id}: command failed`);
    for (const artifact of Object.values(run.artifacts || {})) verifyArtifact(artifact);
    for (const field of ["protocol_version", "suite_sha256", "skill_input_sha256", "runner_sha256"]) {
      if (run[field] !== manifest[field]) throw new Error(`${run.run_id}: ${field} differs from batch identity`);
    }
  }
  const suitePath = path.join(ROOT, manifest.suite_ref);
  const tasks = parseSuite(fs.readFileSync(suitePath, "utf8"));
  const gatedTask = tasks.find((task) => task.conditionCFixture);
  if (gatedTask) {
    const run = manifest.runs.find((entry) => entry.run_id === `${gatedTask.id}-C`);
    if (!run) return;
    if (run.profile_input_kind !== "host_gated" || run.withheld_profile_bytes !== true) {
      throw new Error(`${gatedTask.id}-C: missing host-gated input receipt`);
    }
    const prompt = fs.readFileSync(path.join(ROOT, run.artifacts.prompt.ref), "utf8");
    if (prompt.includes(gatedTask.conditionCExcludedSentinel)) throw new Error(`${gatedTask.id}-C: excluded sentinel reached executor prompt`);
    if (!prompt.includes(gatedTask.conditionCFixture) || prompt !== buildPrompt(gatedTask, "C")) {
      throw new Error(`${gatedTask.id}-C: executor prompt differs from declared host-gated input`);
    }
  }
}

function verifyGeneratedPrompts(manifest) {
  if (manifest.evidence_format_version !== EVIDENCE_FORMAT_VERSION) throw new Error("generated prompt evidence format mismatch");
  if (!Array.isArray(manifest.prompts) || manifest.prompts.length === 0) throw new Error("generated prompts are missing");
  const runnerSha = sha256Bytes(fs.readFileSync(path.join(__dirname, "run-profile-projection-smoke.js")));
  const utilsSha = sha256Bytes(fs.readFileSync(path.join(__dirname, "profile-projection-evidence-utils.js")));
  if (manifest.runner_sha256 !== runnerSha || manifest.evidence_utils_sha256 !== utilsSha) {
    throw new Error("generated prompt runner identity mismatch");
  }
  for (const prompt of manifest.prompts) verifyArtifact(prompt.artifact);
}

function verifyReview(manifest) {
  if (manifest.evidence_format_version !== EVIDENCE_FORMAT_VERSION) throw new Error("review evidence format mismatch");
  if (manifest.exit_code !== 0 || manifest.raw_evidence_first_required !== true || manifest.prior_narratives_excluded !== true) {
    throw new Error("review execution or independence metadata is invalid");
  }
  const runnerSha = sha256Bytes(fs.readFileSync(path.join(__dirname, "run-profile-projection-review.js")));
  if (manifest.review_runner_sha256 !== runnerSha) throw new Error("review runner identity mismatch");
  for (const artifact of Object.values(manifest.artifacts || {})) verifyArtifact(artifact);
  for (const source of manifest.source_evidence || []) verifyArtifact(source);
  const prompt = fs.readFileSync(path.join(ROOT, manifest.artifacts.prompt.ref), "utf8");
  if (/(?:independent-review|verdict-adjudication|implementation-review)\.md/i.test(prompt)) {
    throw new Error("review prompt references a prior narrative");
  }
}

function verifyDirectory(directory) {
  const manifest = verifyLock(directory);
  verifyDirectorySafety(directory);
  verifyCanonicalFileSet(directory, manifest);
  if (
    manifest.kind === "profile_projection_behavior_batch" ||
    (manifest.kind === "behavior_batch_environment" && Array.isArray(manifest.runs))
  ) verifyBatch(manifest);
  else if (manifest.kind === "generated_prompts") verifyGeneratedPrompts(manifest);
  else if (manifest.kind === "profile_projection_neutral_review") verifyReview(manifest);
  else throw new Error(`${directory}: unsupported manifest kind ${manifest.kind}`);
  console.log(`PASS ${manifest.kind} ${path.relative(ROOT, directory)} sha256=${artifactRecord(path.join(directory, "manifest.json")).sha256}`);
}

function main(argv = process.argv.slice(2)) {
  const directories = (argv.length > 0 ? argv : DEFAULT_DIRS).map((entry) => path.resolve(ROOT, entry));
  try {
    for (const directory of directories) verifyDirectory(directory);
    console.log(`PASS profile projection evidence sets=${directories.length}`);
    return 0;
  } catch (error) {
    console.error(`FAIL ${error.message}`);
    return 1;
  }
}

if (require.main === module) process.exitCode = main();

module.exports = { main, verifyBatch, verifyDirectory, verifyGeneratedPrompts, verifyReview };
