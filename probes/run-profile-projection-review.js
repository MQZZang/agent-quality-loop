#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const {
  ROOT,
  EVIDENCE_FORMAT_VERSION,
  SANITIZER_VERSION,
  artifactRecord,
  relativeRef,
  sanitizeExistingFile,
  sha256Bytes,
  writeEvidenceLock,
  writeSanitizedJson,
  writeSanitizedText,
} = require("./profile-projection-evidence-utils");
const { codexInvocation, normalize, runtimeReplacements } = require("./run-profile-projection-smoke");

const DEFAULT_MODEL = "gpt-5.6-sol";
const DEFAULT_PROMPT = path.join(__dirname, "profile-projection-v1-neutral-review-prompt.md");
const DEFAULT_OUTPUT = path.join(__dirname, "transcripts", "2026-08-15", "profile-projection-v1-neutral-review-v2");
const BATCH_MANIFESTS = [
  "probes/transcripts/2026-08-15/profile-projection-v1-smoke-v2/manifest.json",
  "probes/transcripts/2026-08-15/profile-projection-v1-behavior-addendum-v2/manifest.json",
  "probes/transcripts/2026-08-15/profile-projection-v1-opt-in-boundary-v2/manifest.json",
];

function parseArgs(argv) {
  const options = { model: DEFAULT_MODEL, promptPath: DEFAULT_PROMPT, outputDir: DEFAULT_OUTPUT, selfTest: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--model") options.model = argv[++index];
    else if (value === "--prompt") options.promptPath = path.resolve(argv[++index]);
    else if (value === "--output-dir") options.outputDir = path.resolve(argv[++index]);
    else if (value === "--self-test") options.selfTest = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  return options;
}

function commandOutput(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function promptProtocol(prompt) {
  const match = normalize(prompt).match(/^Protocol: `([^`]+)`$/m);
  if (!match) throw new Error("Review prompt must declare a protocol version");
  return match[1];
}

function runSelfTest(prompt) {
  const checks = [
    [prompt.includes("raw_evidence_first"), "review output declares raw_evidence_first"],
    [prompt.includes("prior_narratives_read"), "review output declares prior_narratives_read"],
    [!/(?:independent-review|verdict-adjudication|implementation-review)\.md/i.test(prompt), "review excludes prior narrative files"],
    [prompt.includes("verify-profile-projection-evidence.js"), "review requires evidence verification before grading"],
    [prompt.includes("profile-projection-v1-smoke-v2"), "review reads the v2 smoke evidence"],
    [prompt.includes("profile-projection-v1-behavior-addendum-v2"), "review reads the v2 addendum evidence"],
    [prompt.includes("profile-projection-v1-opt-in-boundary-v2"), "review reads the isolated opt-in-boundary evidence"],
  ];
  for (const [ok, label] of checks) console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  return checks.every(([ok]) => ok) ? 0 : 1;
}

async function run(options, prompt) {
  fs.mkdirSync(options.outputDir, { recursive: true });
  const invocation = codexInvocation();
  const replacements = runtimeReplacements(invocation);
  const promptCopyPath = path.join(options.outputDir, "review.prompt.txt");
  const transcriptPath = path.join(options.outputDir, "review.md");
  const jsonlPath = path.join(options.outputDir, "review.jsonl");
  const stderrPath = path.join(options.outputDir, "review.stderr.log");
  const promptArtifact = writeSanitizedText(promptCopyPath, prompt, replacements);
  const args = [
    ...invocation.prefixArgs, "exec", "--ephemeral", "--sandbox", "read-only", "--color", "never", "--json",
    "--model", options.model, "-c", 'model_reasoning_effort="xhigh"', "-C", ROOT,
    "--output-last-message", transcriptPath, "-",
  ];
  const startedAt = new Date();
  const child = spawn(invocation.executable, args, { cwd: ROOT, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", (error) => { stderr += `${error.stack || error.message}\n`; });
  child.stdin.end(prompt);
  const exitCode = await new Promise((resolve) => child.on("close", resolve));
  const jsonlArtifact = writeSanitizedText(jsonlPath, stdout, replacements);
  const stderrArtifact = writeSanitizedText(stderrPath, stderr, replacements);
  const transcriptArtifact = sanitizeExistingFile(transcriptPath, replacements);
  const endedAt = new Date();
  const sourceEvidence = BATCH_MANIFESTS.flatMap((manifestRef) => {
    const manifestPath = path.join(ROOT, manifestRef);
    const lockPath = path.join(path.dirname(manifestPath), "evidence.lock.json");
    return [artifactRecord(manifestPath), artifactRecord(lockPath)];
  });
  const gitStatus = commandOutput("git", ["status", "--short"]);
  const manifest = {
    kind: "profile_projection_neutral_review",
    evidence_format_version: EVIDENCE_FORMAT_VERSION,
    sanitizer_version: SANITIZER_VERSION,
    protocol_version: promptProtocol(prompt),
    prompt_source_ref: relativeRef(options.promptPath),
    prompt_source_sha256: sha256Bytes(Buffer.from(prompt, "utf8")),
    review_runner_sha256: sha256Bytes(fs.readFileSync(__filename)),
    evidence_utils_sha256: sha256Bytes(fs.readFileSync(path.join(__dirname, "profile-projection-evidence-utils.js"))),
    model: options.model,
    codex_version: commandOutput(invocation.executable, [...invocation.prefixArgs, "--version"]),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    git_head: commandOutput("git", ["rev-parse", "HEAD"]),
    git_dirty: gitStatus.length > 0,
    git_status_sha256: sha256Bytes(Buffer.from(normalize(gitStatus), "utf8")),
    raw_evidence_first_required: true,
    prior_narratives_excluded: true,
    started_at: startedAt.toISOString(),
    completed_at: endedAt.toISOString(),
    elapsed_ms: endedAt - startedAt,
    exit_code: exitCode,
    source_evidence: sourceEvidence,
    artifacts: { prompt: promptArtifact, transcript: transcriptArtifact, jsonl: jsonlArtifact, stderr: stderrArtifact },
  };
  const manifestPath = path.join(options.outputDir, "manifest.json");
  writeSanitizedJson(manifestPath, manifest, replacements);
  writeEvidenceLock(options.outputDir, manifestPath);
  console.log(`REVIEW exit=${exitCode} manifest=${manifestPath}`);
  return exitCode === 0 ? 0 : 1;
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const prompt = normalize(fs.readFileSync(options.promptPath, "utf8"));
  if (options.selfTest) return runSelfTest(prompt);
  return run(options, prompt);
}

if (require.main === module) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}

module.exports = { main, promptProtocol, runSelfTest };
