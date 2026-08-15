#!/usr/bin/env node

"use strict";

// Executable preregistered A/B/C protocol. Historical v2 runners and evidence
// remain byte-for-byte untouched; any v3 run writes a new versioned directory.

const fs = require("fs");
const path = require("path");
const { execFileSync, spawn } = require("child_process");
const {
  ROOT,
  SANITIZER_VERSION,
  artifactRecord,
  relativeRef,
  sanitizeExistingFile,
  sha256Bytes,
  writeSanitizedJson,
  writeSanitizedText,
} = require("./profile-projection-evidence-utils");
const {
  codexInvocation,
  normalize,
  runtimeReplacements,
} = require("./run-profile-projection-smoke");

const EVIDENCE_FORMAT_VERSION = "profile-projection-evidence/v3";
const CONDITIONS = ["A", "B", "C"];
const DEFAULT_MODEL = "gpt-5.6-sol";
const DEFAULT_SEED = 20260815;
const DEFAULT_SUITE = path.join(__dirname, "profile-projection-v1-abc-v3-suite.md");
const BASELINE_REF = "probes/product-response-baseline-v3.md";
const MECHANISM_REFS = [
  ".cursor/skills/agent-quality-loop/references/personalization.md",
  ".cursor/skills/agent-quality-loop/references/profile-projection.md",
];

function localDateStamp(date = new Date()) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function parseSuite(markdown) {
  const source = normalize(markdown);
  const matches = [...source.matchAll(/^## (V3T\d+): (.+)$/gm)];
  return matches.map((match, index) => {
    const end = index + 1 < matches.length ? matches[index + 1].index : source.length;
    const section = source.slice(match.index, end);
    const request = section.match(/Raw request:\s*\n\s*> ([^\n]+)\n/);
    const profile = section.match(/Profile fixture:\s*\n\s*```yaml\n([\s\S]*?)\n```/);
    if (!request || !profile) throw new Error(`Cannot parse frozen task ${match[1]}`);
    return {
      id: match[1],
      title: match[2].trim(),
      rawRequest: request[1].trim(),
      profileFixture: profile[1].trim(),
    };
  });
}

function profileInput(task, condition) {
  if (condition === "A") return { kind: "none", bytes: "none" };
  if (condition === "B") return { kind: "complete_profile_background", bytes: task.profileFixture };
  return { kind: "projection_source", bytes: task.profileFixture };
}

function conditionInstructions(condition) {
  if (condition === "A") {
    return "No additional collaboration background is supplied. Answer from the current request and readable project facts.";
  }
  if (condition === "B") {
    return "Additional collaboration context is supplied below as ordinary background. Answer from the current request, readable project facts, and that background.";
  }
  return [
    "Apply Profile Projection v1 through the existing single Task Contract.",
    "Remove current-turn conflicts before ranking, select at most two matching active entries,",
    "preserve authority/evidence/release boundaries, and record only entries that materially affect the response.",
  ].join(" ");
}

function buildPrompt(task, condition) {
  const input = profileInput(task, condition);
  const readableRefs = condition === "C" ? [BASELINE_REF, ...MECHANISM_REFS] : [BASELINE_REF];
  return `You are a fresh-context executor for a preregistered response-only experiment. The repository is read-only. Do not edit files, mutate a profile, create a persistent contract/state object, push, publish, or release.

Read only these policy files before answering:
${readableRefs.map((ref) => `- ${ref}`).join("\n")}

Do not read the suite, preregistration, graders, validators, prior transcripts, or any real collaboration profile. Use only the raw request and executor-visible condition input below. Do not ask a question when the request is clear.

Probe id: ${task.id}
Condition rule: ${conditionInstructions(condition)}

RAW REQUEST (verbatim):
${task.rawRequest}

ADDITIONAL COLLABORATION CONTEXT:
${input.bytes}

Return exactly one section. USER_RESPONSE is the exact answer a user would see.

USER_RESPONSE:
<user-facing answer only>
`;
}

function splitOutput(value) {
  const text = normalize(value);
  const match = text.match(/^USER_RESPONSE:\s*\n([\s\S]*)$/);
  if (!match || !match[1].trim()) return { error: "missing exact non-empty USER_RESPONSE section", userResponse: text };
  if (/^AUDIT_RECEIPT:/m.test(match[1])) return { error: "outcome response contains a forbidden audit receipt", userResponse: text };
  return { error: null, userResponse: `${match[1].trim()}\n` };
}

const OUTCOME_AUDIT_TERMS = [
  "AUDIT_RECEIPT",
  "selected_profile_refs",
  "compiled_profile_effect",
  "why_applied",
];

function outcomePromptContamination(condition, prompt) {
  if (OUTCOME_AUDIT_TERMS.some((term) => prompt.includes(term))) return true;
  if (condition === "C") return false;
  return MECHANISM_REFS.some((ref) => prompt.includes(ref)) ||
    /Profile Projection|applicability-filter|rank, select, project|compiled profile effect|why-applied/i.test(prompt);
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

function commandOutput(command, args) {
  return execFileSync(command, args, { cwd: ROOT, encoding: "utf8" }).trim();
}

function protocolIdentity(suiteBytes) {
  const protocol = suiteBytes.match(/^Protocol: `([^`]+)`$/m);
  if (!protocol) throw new Error("Suite must declare a protocol version");
  const baseline = fs.readFileSync(path.join(ROOT, BASELINE_REF));
  const mechanism = MECHANISM_REFS.map((ref) => fs.readFileSync(path.join(ROOT, ref), "utf8")).join("\n---FILE---\n");
  return {
    evidence_format_version: EVIDENCE_FORMAT_VERSION,
    sanitizer_version: SANITIZER_VERSION,
    protocol_version: protocol[1],
    suite_sha256: sha256Bytes(Buffer.from(suiteBytes, "utf8")),
    baseline_sha256: sha256Bytes(baseline),
    mechanism_sha256: sha256Bytes(Buffer.from(normalize(mechanism), "utf8")),
    runner_sha256: sha256Bytes(fs.readFileSync(__filename)),
  };
}

function writeEvidenceLock(outputDir, manifestPath) {
  const manifest = artifactRecord(manifestPath);
  const lockPath = path.join(outputDir, "evidence.lock.json");
  writeSanitizedJson(lockPath, {
    evidence_format_version: EVIDENCE_FORMAT_VERSION,
    manifest_ref: manifest.ref,
    manifest_sha256: manifest.sha256,
    manifest_bytes: manifest.bytes,
  });
  return artifactRecord(lockPath);
}

function runSelfTest(tasks, suiteBytes) {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  check(tasks.length === 4, "suite must freeze exactly four smoke tasks");
  const runs = tasks.flatMap((task) => CONDITIONS.map((condition) => ({ task, condition })));
  check(runs.length === 12, "smoke must expand to 12 A/B/C runs");
  for (const task of tasks) {
    const a = buildPrompt(task, "A");
    const b = buildPrompt(task, "B");
    const c = buildPrompt(task, "C");
    check(!a.includes(task.profileFixture), `${task.id} A excludes profile bytes`);
    check(b.includes(task.profileFixture), `${task.id} B includes complete profile bytes`);
    check(c.includes(task.profileFixture), `${task.id} C includes projection source bytes`);
    check(!b.includes(MECHANISM_REFS[0]) && !b.includes(MECHANISM_REFS[1]), `${task.id} B cannot read projection rules`);
    check(c.includes(MECHANISM_REFS[0]) && c.includes(MECHANISM_REFS[1]), `${task.id} C reads projection rules`);
    check(!outcomePromptContamination("A", a), `${task.id} A has no projection or audit directives`);
    check(!outcomePromptContamination("B", b), `${task.id} B has no projection or audit directives`);
    check(OUTCOME_AUDIT_TERMS.every((term) => !c.includes(term)), `${task.id} C outcome prompt excludes audit receipt fields`);
    check(sha256Bytes(Buffer.from(b)) !== sha256Bytes(Buffer.from(c)), `${task.id} B and C prompts differ`);
  }
  const baseline = fs.readFileSync(path.join(ROOT, BASELINE_REF), "utf8");
  check(!/Profile Projection|selected[_ ]profile[_ ]refs|compiled profile effect|why-applied|applicability-filter/i.test(baseline), "baseline contains no projection mechanism directives");
  check(/^Protocol: `profile-projection-v1-abc\/v3`$/m.test(suiteBytes), "suite protocol identity is v3");
  const split = splitOutput("USER_RESPONSE:\nanswer");
  check(!split.error && split.userResponse === "answer\n", "outcome parser accepts only the user response contract");
  check(Boolean(splitOutput("USER_RESPONSE:\nanswer\nAUDIT_RECEIPT:\nforbidden").error), "outcome parser rejects embedded audit receipts");
  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log(`PASS Profile Projection v3 preregistered runner (${runs.length} prompt conditions)`);
  console.log(JSON.stringify(protocolIdentity(suiteBytes), null, 2));
  return 0;
}

function parseArgs(argv) {
  const options = {
    model: DEFAULT_MODEL,
    seed: DEFAULT_SEED,
    concurrency: 3,
    suitePath: DEFAULT_SUITE,
    outputDir: path.join(__dirname, "transcripts", localDateStamp(), "profile-projection-v1-abc-v3"),
    emitPromptsDir: null,
    selfTest: false,
    printProtocol: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--model") options.model = argv[++index];
    else if (arg === "--seed") options.seed = Number(argv[++index]);
    else if (arg === "--concurrency") options.concurrency = Number(argv[++index]);
    else if (arg === "--suite") options.suitePath = path.resolve(argv[++index]);
    else if (arg === "--output-dir") options.outputDir = path.resolve(argv[++index]);
    else if (arg === "--emit-prompts") options.emitPromptsDir = path.resolve(argv[++index]);
    else if (arg === "--self-test") options.selfTest = true;
    else if (arg === "--protocol") options.printProtocol = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Number.isInteger(options.seed)) throw new Error("--seed must be an integer");
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1 || options.concurrency > 4) throw new Error("--concurrency must be 1..4");
  return options;
}

function runCodex(run, options, identity) {
  return new Promise((resolve, reject) => {
    const runId = `${run.task.id}-${run.condition}`;
    const base = runId.toLowerCase();
    const rawPath = path.join(options.outputDir, `${base}.raw.md`);
    const responsePath = path.join(options.outputDir, `${base}.response.md`);
    const runnerReceiptPath = path.join(options.outputDir, `${base}.runner-receipt.json`);
    const promptPath = path.join(options.outputDir, `${base}.prompt.txt`);
    const jsonlPath = path.join(options.outputDir, `${base}.jsonl`);
    const stderrPath = path.join(options.outputDir, `${base}.stderr.log`);
    const prompt = buildPrompt(run.task, run.condition);
    const invocation = codexInvocation();
    const replacements = runtimeReplacements(invocation);
    const promptArtifact = writeSanitizedText(promptPath, prompt, replacements);
    const args = [
      ...invocation.prefixArgs, "exec", "--ephemeral", "--sandbox", "read-only", "--color", "never", "--json",
      "--model", options.model, "-c", 'model_reasoning_effort="high"', "-C", ROOT,
      "--output-last-message", rawPath, "-",
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
        const rawArtifact = sanitizeExistingFile(rawPath, replacements);
        const split = splitOutput(fs.readFileSync(rawPath, "utf8"));
        const responseArtifact = writeSanitizedText(responsePath, split.userResponse, replacements);
        const endedAt = new Date();
        const input = profileInput(run.task, run.condition);
        const inputSha256 = sha256Bytes(Buffer.from(normalize(input.bytes), "utf8"));
        const runnerReceiptArtifact = writeSanitizedJson(runnerReceiptPath, {
          kind: "profile_projection_v3_runner_receipt",
          scope: "transport_and_artifact_binding_only",
          auditability_arm_status: "NOT_RUN",
          model_self_report_used: false,
          probe_id: run.task.id,
          condition: run.condition,
          profile_input_kind: input.kind,
          profile_input_sha256: inputSha256,
          prompt_ref: promptArtifact.ref,
          prompt_sha256: promptArtifact.sha256,
          response_ref: responseArtifact.ref,
          response_sha256: responseArtifact.sha256,
          selected_profile_refs: "NOT_RUN",
          reason_verification: "NOT_RUN",
          source_binding: "NOT_RUN",
        }, replacements);
        resolve({
          run_id: runId,
          task_id: run.task.id,
          condition: run.condition,
          model: options.model,
          started_at: startedAt.toISOString(),
          ended_at: endedAt.toISOString(),
          elapsed_ms: endedAt - startedAt,
          exit_code: exitCode,
          output_parse_error: split.error,
          outcome_prompt_contamination: outcomePromptContamination(run.condition, prompt),
          profile_input_kind: input.kind,
          profile_input_sha256: inputSha256,
          protocol_version: identity.protocol_version,
          suite_sha256: identity.suite_sha256,
          runner_sha256: identity.runner_sha256,
          artifacts: {
            prompt: promptArtifact,
            raw: rawArtifact,
            response: responseArtifact,
            runner_receipt: runnerReceiptArtifact,
            jsonl: jsonlArtifact,
            stderr: stderrArtifact,
          },
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
  let next = 0;
  async function worker() {
    while (next < runs.length) {
      const run = runs[next++];
      console.log(`START ${run.task.id}-${run.condition}`);
      results.push(await runCodex(run, options, identity));
    }
  }
  await Promise.all(Array.from({ length: Math.min(options.concurrency, runs.length) }, () => worker()));
  return results.sort((left, right) => left.run_id < right.run_id ? -1 : left.run_id > right.run_id ? 1 : 0);
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const suiteBytes = normalize(fs.readFileSync(options.suitePath, "utf8"));
  const tasks = parseSuite(suiteBytes);
  const identity = protocolIdentity(suiteBytes);
  if (options.selfTest) return runSelfTest(tasks, suiteBytes);
  if (options.printProtocol) {
    console.log(JSON.stringify(identity, null, 2));
    return 0;
  }
  if (options.emitPromptsDir) {
    fs.mkdirSync(options.emitPromptsDir, { recursive: true });
    const prompts = [];
    for (const task of tasks) for (const condition of CONDITIONS) {
      const runId = `${task.id}-${condition}`;
      const target = path.join(options.emitPromptsDir, `${runId.toLowerCase()}.prompt.txt`);
      prompts.push({ run_id: runId, artifact: writeSanitizedText(target, buildPrompt(task, condition)) });
    }
    const manifestPath = path.join(options.emitPromptsDir, "manifest.json");
    writeSanitizedJson(manifestPath, { kind: "profile_projection_v3_generated_prompts", ...identity, prompts });
    writeEvidenceLock(options.emitPromptsDir, manifestPath);
    console.log(`PROMPTS ${prompts.length} ${options.emitPromptsDir}`);
    return 0;
  }

  fs.mkdirSync(options.outputDir, { recursive: true });
  const runs = seededShuffle(tasks.flatMap((task) => CONDITIONS.map((condition) => ({ task, condition }))), options.seed);
  const invocation = codexInvocation();
  const gitStatus = commandOutput("git", ["status", "--short"]);
  const environment = {
    kind: "profile_projection_v3_behavior_batch",
    ...identity,
    suite_ref: relativeRef(options.suitePath),
    baseline_ref: BASELINE_REF,
    seed: options.seed,
    model: options.model,
    codex_version: commandOutput(invocation.executable, [...invocation.prefixArgs, "--version"]),
    node_version: process.version,
    platform: process.platform,
    arch: process.arch,
    git_head: commandOutput("git", ["rev-parse", "HEAD"]),
    git_dirty: gitStatus.length > 0,
    git_status_sha256: sha256Bytes(Buffer.from(normalize(gitStatus), "utf8")),
    run_order: runs.map(({ task, condition }) => `${task.id}-${condition}`),
  };
  const replacements = runtimeReplacements(invocation);
  const environmentPath = path.join(options.outputDir, "environment.json");
  const environmentArtifact = writeSanitizedJson(environmentPath, environment, replacements);
  const results = await runPool(runs, options, identity);
  const manifest = {
    ...environment,
    expected_run_count: runs.length,
    completed_at: new Date().toISOString(),
    environment_artifact: environmentArtifact,
    runs: results,
  };
  const manifestPath = path.join(options.outputDir, "manifest.json");
  writeSanitizedJson(manifestPath, manifest, replacements);
  writeEvidenceLock(options.outputDir, manifestPath);
  const failures = results.filter((result) => result.exit_code !== 0 || result.output_parse_error || result.outcome_prompt_contamination);
  console.log(`COMPLETE runs=${results.length} protocol_failures=${failures.length}`);
  return failures.length === 0 ? 0 : 1;
}

if (require.main === module) {
  main().then((code) => { process.exitCode = code; }).catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  });
}

module.exports = { CONDITIONS, buildPrompt, main, outcomePromptContamination, parseSuite, profileInput, protocolIdentity, runSelfTest, splitOutput };
