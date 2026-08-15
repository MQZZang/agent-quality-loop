#!/usr/bin/env node

"use strict";

// Fresh-context runner for the Profile Projection v1 behavior protocol. Each
// process receives only its exact executor-visible input. Published evidence is
// sanitized before hashing and is content-bound by a manifest plus lock file.

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const {
  ROOT,
  EVIDENCE_FORMAT_VERSION,
  SANITIZER_VERSION,
  relativeRef,
  sanitizeExistingFile,
  sha256Bytes,
  writeEvidenceLock,
  writeSanitizedJson,
  writeSanitizedText,
} = require("./profile-projection-evidence-utils");

const DEFAULT_MODEL = "gpt-5.6-sol";
const DEFAULT_SEED = 20260815;
const CONDITIONS = ["A", "B", "C"];
const DEFAULT_SUITE_PATH = path.join(__dirname, "profile-projection-v1-smoke-suite.md");
const DEFAULT_OUTPUT_NAME = "profile-projection-v1-smoke-v2";
const MECHANISM_REFS = [
  ".cursor/skills/agent-quality-loop/SKILL.md",
  ".cursor/skills/agent-quality-loop/references/personalization.md",
  ".cursor/skills/agent-quality-loop/references/profile-projection.md",
];
const EVIDENCE_UTILS_PATH = path.join(__dirname, "profile-projection-evidence-utils.js");

function normalize(value) {
  return String(value).replace(/\r\n/g, "\n");
}

function localDateStamp(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseSuite(markdown) {
  const normalized = normalize(markdown);
  const headerMatches = [...normalized.matchAll(/^## (T\d+): (.+)$/gm)];
  return headerMatches.map((match, index) => {
    const start = match.index;
    const end = index + 1 < headerMatches.length ? headerMatches[index + 1].index : normalized.length;
    const section = normalized.slice(start, end);
    const requestMatch = section.match(/Raw request:\s*\n\s*> ([^\n]+)\n/);
    const profileMatch = section.match(/Profile fixture:\s*\n\s*```yaml\n([\s\S]*?)\n```/);
    const conditionCMatch = section.match(/Condition C profile fixture:\s*\n\s*```yaml\n([\s\S]*?)\n```/);
    const sentinelMatch = section.match(/Condition C excluded sentinel:\s*`([^`]+)`/);
    if (!requestMatch || !profileMatch) throw new Error(`Cannot parse frozen inputs for ${match[1]}`);
    if (conditionCMatch && !sentinelMatch) throw new Error(`${match[1]} condition-C fixture requires an excluded sentinel`);
    return {
      id: match[1],
      title: match[2].trim(),
      rawRequest: requestMatch[1].trim(),
      profileFixture: profileMatch[1].trim(),
      conditionCFixture: conditionCMatch ? conditionCMatch[1].trim() : null,
      conditionCExcludedSentinel: sentinelMatch ? sentinelMatch[1] : null,
    };
  });
}

function conditionText(condition, profileInputKind) {
  if (condition === "A") {
    return [
      "No collaboration profile is available to this run.",
      "Do not infer, reconstruct, or apply any stored user preference.",
      "If the raw request itself invokes Fresh Mode, apply the documented current-task semantics.",
    ].join(" ");
  }
  if (condition === "B") {
    return [
      "The complete profile fixture is supplied directly as ordinary background without task-local projection.",
      "It may influence the response only where it actually applies, while current-turn instructions and all",
      "authority, evidence, acceptance, and release boundaries still govern.",
    ].join(" ");
  }
  const visibility = profileInputKind === "host_gated"
    ? "The host removed profile scopes that were not explicitly enabled before this executor process started."
    : "The supplied fixture is the available profile source for this isolated run.";
  return [
    "Apply experimental Profile Projection v1 under the single existing Task Contract.",
    visibility,
    "Select no more than two matching active entries, remove current-turn conflicts before ranking,",
    "and record only entries that materially affect the response.",
  ].join(" ");
}

function profileInput(task, condition) {
  if (condition === "A") return { kind: "none", bytes: "none", withheld: false };
  if (condition === "B") return { kind: "complete_profile_control", bytes: task.profileFixture, withheld: false };
  if (task.conditionCFixture) return { kind: "host_gated", bytes: task.conditionCFixture, withheld: true };
  return { kind: "projection_source", bytes: task.profileFixture, withheld: false };
}

function buildPrompt(task, condition) {
  const input = profileInput(task, condition);
  const inputSha256 = sha256Bytes(Buffer.from(normalize(input.bytes), "utf8"));
  return `You are a fresh-context behavior-probe executor. This is a response-only simulation in a read-only repository; do not edit files, mutate a profile, create a contract file, push, publish, or release.

Before answering, read only these mechanism files:
${MECHANISM_REFS.map((ref) => `- ${ref}`).join("\n")}

Do not read the probe suite, experiment protocol, evaluation cases, validators, prior transcripts, or any real collaboration profile. Use only the raw request and condition input below. Do not ask a question when the request is clear.

Probe id: ${task.id}
Condition: ${condition}
Condition input: ${conditionText(condition, input.kind)}
Profile input kind: ${input.kind}
Profile input sha256: ${inputSha256}

RAW REQUEST (verbatim):
${task.rawRequest}

EXECUTOR-VISIBLE PROFILE INPUT:
${input.bytes}

Give the exact response you would give the user under this condition. For a task that asks for a write, describe the intended bounded action and authority result without performing or falsely claiming the edit. Then return exactly these two sections and preserve only the executor-visible profile input in the receipt:

USER_RESPONSE:
<actual user-facing response>

PROBE_RECEIPT:
probe_id: ${task.id}
condition: ${condition}
raw_request: <exact raw request>
profile_input_kind: ${input.kind}
profile_input_sha256: ${inputSha256}
profile_fixture: <exact executor-visible fixture above, or none>
selected_profile_refs: <stable profile entry refs that actually influenced the response; [] when none>
compiled_contract_effect: <one line>
user_visible_question_count: <integer>
action_authority_result: <one line>
evidence_boundary_result: <one line>
fresh_mode_result: <one line>
profile_write_or_revision: <none or description>
second_contract_created: <true|false>
why_applied_answer: <one line or not_asked>
verdict: <PASS|FAIL|NOT_RUN> - <one decidable line>
`;
}

function seededShuffle(items, seed) {
  let state = seed >>> 0;
  const random = () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
}

function stableCompare(left, right) {
  return String(left) < String(right) ? -1 : String(left) > String(right) ? 1 : 0;
}

function parseArgs(argv) {
  const options = {
    model: DEFAULT_MODEL,
    seed: DEFAULT_SEED,
    concurrency: 3,
    outputDir: path.join(__dirname, "transcripts", localDateStamp(), DEFAULT_OUTPUT_NAME),
    suitePath: DEFAULT_SUITE_PATH,
    only: null,
    selfTest: false,
    printProtocol: false,
    emitPromptsDir: null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--model") options.model = argv[++index];
    else if (value === "--seed") options.seed = Number(argv[++index]);
    else if (value === "--concurrency") options.concurrency = Number(argv[++index]);
    else if (value === "--output-dir") options.outputDir = path.resolve(argv[++index]);
    else if (value === "--suite") options.suitePath = path.resolve(argv[++index]);
    else if (value === "--only") options.only = new Set(argv[++index].split(",").map((item) => item.trim().toUpperCase()));
    else if (value === "--emit-prompts") options.emitPromptsDir = path.resolve(argv[++index]);
    else if (value === "--self-test") options.selfTest = true;
    else if (value === "--protocol") options.printProtocol = true;
    else throw new Error(`Unknown argument: ${value}`);
  }
  if (!Number.isInteger(options.seed)) throw new Error("--seed must be an integer");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 4) {
    throw new Error("--concurrency must be an integer from 1 to 4");
  }
  return options;
}

function commandOutput(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function codexInvocation() {
  if (process.env.CODEX_EXECUTABLE) {
    const executable = path.resolve(process.env.CODEX_EXECUTABLE);
    if (!fs.existsSync(executable)) throw new Error(`CODEX_EXECUTABLE not found: ${executable}`);
    return { executable, prefixArgs: [] };
  }
  if (process.platform !== "win32") return { executable: "codex", prefixArgs: [] };
  const cliPath = process.env.CODEX_JS_PATH || path.join(
    process.env.APPDATA || "", "npm", "node_modules", "@openai", "codex", "bin", "codex.js",
  );
  if (!fs.existsSync(cliPath)) throw new Error("Compatible Codex CLI not found; set CODEX_EXECUTABLE or CODEX_JS_PATH");
  return { executable: process.execPath, prefixArgs: [cliPath] };
}

function protocolIdentity(suiteBytes) {
  const protocolMatch = suiteBytes.match(/^Protocol: `([^`]+)`$/m);
  if (!protocolMatch) throw new Error("Suite must declare a protocol version");
  const skillBytes = MECHANISM_REFS
    .map((ref) => normalize(fs.readFileSync(path.join(ROOT, ref), "utf8")))
    .join("\n---FILE---\n");
  return {
    evidence_format_version: EVIDENCE_FORMAT_VERSION,
    sanitizer_version: SANITIZER_VERSION,
    protocol_version: protocolMatch[1],
    suite_sha256: sha256Bytes(Buffer.from(suiteBytes, "utf8")),
    skill_input_sha256: sha256Bytes(Buffer.from(skillBytes, "utf8")),
    runner_sha256: sha256Bytes(fs.readFileSync(__filename)),
    evidence_utils_sha256: sha256Bytes(fs.readFileSync(EVIDENCE_UTILS_PATH)),
  };
}

function runSelfTest(tasks, suiteBytes, suitePath) {
  const checks = [];
  const check = (condition, label) => checks.push({ condition, label });
  const runs = tasks.flatMap((task) => CONDITIONS.map((condition) => ({ task, condition })));
  check(tasks.length >= 1, "suite has at least one task family");
  check(runs.length === tasks.length * 3, "suite expands every task across A/B/C");
  check(new Set(runs.map(({ task, condition }) => `${task.id}-${condition}`)).size === runs.length, "run ids are unique");
  const first = tasks[0];
  const aPrompt = buildPrompt(first, "A");
  const bPrompt = buildPrompt(first, "B");
  const cPrompt = buildPrompt(first, "C");
  check(!aPrompt.includes(first.profileFixture), "condition A excludes profile fixture bytes");
  check(bPrompt.includes(first.profileFixture), "condition B includes the complete profile fixture");
  check(cPrompt.includes(first.conditionCFixture || first.profileFixture), "condition C includes only its declared executor-visible fixture");
  check(!cPrompt.includes(path.resolve(ROOT)), "executor prompt contains no absolute workspace path");
  check(!cPrompt.includes("Expected differentiators"), "executor prompt excludes grading expectations");
  check(!cPrompt.includes(suitePath), "executor prompt does not reveal the suite path");
  const gated = tasks.find((task) => task.conditionCFixture);
  if (gated) {
    const gatedPrompt = buildPrompt(gated, "C");
    check(gated.profileFixture.includes(gated.conditionCExcludedSentinel), "full control fixture contains the excluded sentinel");
    check(!gated.conditionCFixture.includes(gated.conditionCExcludedSentinel), "host-gated fixture excludes the sentinel");
    check(!gatedPrompt.includes(gated.conditionCExcludedSentinel), "condition C prompt withholds unenabled user-entry sentinel bytes");
    check(gatedPrompt.includes(gated.conditionCFixture), "condition C prompt contains the declared host-gated fixture");
  }
  check(/^Protocol: `[^`]+`$/m.test(suiteBytes), "suite declares a protocol version");
  for (const item of checks) console.log(`${item.condition ? "PASS" : "FAIL"} ${item.label}`);
  console.log(JSON.stringify(protocolIdentity(suiteBytes), null, 2));
  return checks.every((item) => item.condition) ? 0 : 1;
}

function runtimeReplacements(invocation) {
  const values = [];
  if (path.isAbsolute(invocation.executable)) values.push({ value: path.dirname(invocation.executable), token: "<CODEX_RUNTIME>" });
  for (const arg of invocation.prefixArgs) {
    if (path.isAbsolute(arg)) values.push({ value: path.dirname(arg), token: "<CODEX_RUNTIME>" });
  }
  return values;
}

function runCodex(run, options, identity) {
  return new Promise((resolve, reject) => {
    const runId = `${run.task.id}-${run.condition}`;
    const basename = runId.toLowerCase();
    const promptPath = path.join(options.outputDir, `${basename}.prompt.txt`);
    const transcriptPath = path.join(options.outputDir, `${basename}.md`);
    const jsonlPath = path.join(options.outputDir, `${basename}.jsonl`);
    const stderrPath = path.join(options.outputDir, `${basename}.stderr.log`);
    const prompt = buildPrompt(run.task, run.condition);
    const input = profileInput(run.task, run.condition);
    const invocation = codexInvocation();
    const replacements = runtimeReplacements(invocation);
    const promptArtifact = writeSanitizedText(promptPath, prompt, replacements);
    const args = [
      ...invocation.prefixArgs, "exec", "--ephemeral", "--sandbox", "read-only", "--color", "never", "--json",
      "--model", options.model, "-c", 'model_reasoning_effort="high"', "-C", ROOT,
      "--output-last-message", transcriptPath, "-",
    ];
    const startedAt = new Date();
    const child = spawn(invocation.executable, args, { cwd: ROOT, windowsHide: true, stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", (error) => { stderr += `${error.stack || error.message}\n`; });
    child.on("close", (exitCode) => {
      try {
        const jsonlArtifact = writeSanitizedText(jsonlPath, stdout, replacements);
        const stderrArtifact = writeSanitizedText(stderrPath, stderr, replacements);
        const transcriptArtifact = sanitizeExistingFile(transcriptPath, replacements);
        const endedAt = new Date();
        resolve({
          run_id: runId,
          task_id: run.task.id,
          condition: run.condition,
          model: options.model,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          elapsed_ms: endedAt - startedAt,
          exit_code: exitCode,
          profile_input_kind: input.kind,
          profile_input_sha256: sha256Bytes(Buffer.from(normalize(input.bytes), "utf8")),
          source_profile_sha256: sha256Bytes(Buffer.from(normalize(run.task.profileFixture), "utf8")),
          withheld_profile_bytes: input.withheld,
          protocol_version: identity.protocol_version,
          suite_sha256: identity.suite_sha256,
          skill_input_sha256: identity.skill_input_sha256,
          runner_sha256: identity.runner_sha256,
          artifacts: { prompt: promptArtifact, transcript: transcriptArtifact, jsonl: jsonlArtifact, stderr: stderrArtifact },
        });
      } catch (error) {
        reject(error);
      }
    });
    child.stdin.end(prompt);
  });
}

async function runPool(runs, options, identity) {
  const results = [];
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < runs.length) {
      const run = runs[nextIndex++];
      console.log(`START ${run.task.id}-${run.condition}`);
      const result = await runCodex(run, options, identity);
      results.push(result);
      console.log(`END ${result.run_id} exit=${result.exit_code} elapsed_ms=${result.elapsed_ms}`);
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency, runs.length) }, () => worker()));
  return results.sort((left, right) => stableCompare(left.run_id, right.run_id));
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const suiteBytes = normalize(fs.readFileSync(options.suitePath, "utf8"));
  const tasks = parseSuite(suiteBytes);
  const identity = protocolIdentity(suiteBytes);
  if (options.selfTest) return runSelfTest(tasks, suiteBytes, options.suitePath);
  if (options.printProtocol) {
    console.log(JSON.stringify(identity, null, 2));
    return 0;
  }

  if (options.emitPromptsDir) {
    fs.mkdirSync(options.emitPromptsDir, { recursive: true });
    const prompts = [];
    for (const task of tasks) {
      for (const condition of CONDITIONS) {
        const runId = `${task.id}-${condition}`;
        const promptPath = path.join(options.emitPromptsDir, `${runId.toLowerCase()}.prompt.txt`);
        prompts.push({ run_id: runId, artifact: writeSanitizedText(promptPath, buildPrompt(task, condition)) });
      }
    }
    const manifestPath = path.join(options.emitPromptsDir, "manifest.json");
    writeSanitizedJson(manifestPath, { kind: "generated_prompts", ...identity, prompts });
    writeEvidenceLock(options.emitPromptsDir, manifestPath);
    console.log(`PROMPTS ${prompts.length} ${options.emitPromptsDir}`);
    return 0;
  }

  fs.mkdirSync(options.outputDir, { recursive: true });
  const allRuns = tasks.flatMap((task) => CONDITIONS.map((condition) => ({ task, condition })));
  const selectedRuns = options.only
    ? allRuns.filter(({ task, condition }) => options.only.has(`${task.id}-${condition}`))
    : allRuns;
  if (selectedRuns.length === 0) throw new Error("--only did not match any run ids");
  const orderedRuns = seededShuffle(selectedRuns, options.seed);
  const gitStatus = commandOutput("git", ["status", "--short"]);
  const invocation = codexInvocation();
  const replacements = runtimeReplacements(invocation);
  const environment = {
    kind: "behavior_batch_environment",
    ...identity,
    runner: "codex exec --ephemeral --sandbox read-only --json",
    suite_ref: relativeRef(options.suitePath),
    seed: options.seed,
    model: options.model,
    requested_concurrency: options.concurrency,
    codex_version: commandOutput(invocation.executable, [...invocation.prefixArgs, "--version"]),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    git_head: commandOutput("git", ["rev-parse", "HEAD"]),
    git_dirty: gitStatus.length > 0,
    git_status_sha256: sha256Bytes(Buffer.from(normalize(gitStatus), "utf8")),
    run_order: orderedRuns.map(({ task, condition }) => `${task.id}-${condition}`),
  };
  const environmentPath = path.join(options.outputDir, "environment.json");
  const environmentArtifact = writeSanitizedJson(environmentPath, environment, replacements);
  const results = await runPool(orderedRuns, options, identity);
  const manifest = {
    kind: "profile_projection_behavior_batch",
    ...environment,
    expected_run_count: selectedRuns.length,
    completed_at: new Date().toISOString(),
    environment_artifact: environmentArtifact,
    runs: results,
  };
  const manifestPath = path.join(options.outputDir, "manifest.json");
  writeSanitizedJson(manifestPath, manifest, replacements);
  writeEvidenceLock(options.outputDir, manifestPath);
  const failed = results.filter((result) => result.exit_code !== 0);
  console.log(`COMPLETE runs=${results.length} command_failures=${failed.length}`);
  console.log(`MANIFEST ${manifestPath}`);
  return failed.length === 0 ? 0 : 1;
}

if (require.main === module) {
  main()
    .then((code) => { process.exitCode = code; })
    .catch((error) => {
      console.error(error.stack || error.message);
      process.exitCode = 1;
    });
}

module.exports = {
  CONDITIONS,
  buildPrompt,
  codexInvocation,
  normalize,
  parseSuite,
  profileInput,
  protocolIdentity,
  runSelfTest,
  runtimeReplacements,
};
