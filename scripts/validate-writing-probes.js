#!/usr/bin/env node

"use strict";

const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const TRANSCRIPT_DIR = path.join(REPO_ROOT, "probes", "transcripts", "2026-08-13");
const INDEX_PATH = path.join(REPO_ROOT, "docs", "research", "llm-learning-corpus", "behavior-probes.md");
const RENDERING_PATH = path.join(REPO_ROOT, "docs", "research", "llm-learning-corpus", "user-result-rendering.md");

const EXPECTED = [
  { id: "P-W1", file: "p-w1-ambiguous-initial-fail.md" },
  { id: "P-W1R", file: "p-w1r-ambiguous-repair.md" },
  { id: "P-W1F", file: "p-w1f-ambiguous-fresh.md" },
  { id: "P-W2", file: "p-w2-factual-deliver.md" },
  { id: "P-W3", file: "p-w3-cognitive-boundary.md" },
  { id: "P-W4", file: "p-w4-explicit-coach.md" },
  { id: "P-W5", file: "p-w5-creative-a.md" },
  { id: "P-W6", file: "p-w6-creative-b.md", requiredGrade: "FAIL" },
  { id: "P-W7", file: "p-w7-editorial-boundary.md" },
  { id: "P-W8", file: "p-w8-ethical-persuasion.md" },
  { id: "P-W9", file: "p-w9-decision-outline.md" },
  { id: "P-W10", file: "p-w10-instruct-luna.md", requiredGrade: "PASS" },
  { id: "P-W11", file: "p-w11-teach-terra.md", requiredGrade: "PASS" },
  { id: "P-W12", file: "p-w12-co-create-terra.md", requiredGrade: "PASS" },
  { id: "P-W13", file: "p-w13-interpretive-terra.md", requiredGrade: "FAIL" },
  { id: "P-W13F", file: "p-w13f-interpretive-repair-terra.md", requiredGrade: "FAIL" },
  { id: "P-W13G", file: "p-w13g-interpretive-order-repair-terra.md", requiredGrade: "PASS" },
  { id: "P-W14", file: "p-w14-hybrid-sol.md", requiredGrade: "PASS" },
  { id: "P-R1", file: "p-r1-result-luna.md", requiredGrade: "PASS" },
  { id: "P-R2", file: "p-r2-result-terra.md", requiredGrade: "PASS" },
  { id: "P-R3", file: "p-r3-result-sol.md", requiredGrade: "FAIL" },
  { id: "P-R3F", file: "p-r3f-result-repair-sol.md", requiredGrade: "PASS" },
];

const KNOWN_GRADES = new Set(["PASS", "FAIL", "NOT_RUN"]);
const UNKNOWN = new Set(["", "unknown", "not_run", "not-run", "n/a"]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function metadataField(content, key) {
  const match = content.match(new RegExp(`^- ${escapeRegex(key)}:\\s*(?:\\x60([^\\x60]*)\\x60|(.+?))\\s*$`, "mi"));
  if (!match) return null;
  return (match[1] ?? match[2]).replace(/^\*\*|\*\*$/g, "").trim();
}

function extractSection(content, headingPattern) {
  const match = content.match(new RegExp(`^##\\s+${headingPattern}\\s*$([\\s\\S]*?)(?=^##\\s+|(?![\\s\\S]))`, "im"));
  return match ? match[1].trim() : null;
}

function extractBetweenHeadings(content, startPattern, endPattern) {
  const match = content.match(
    new RegExp(`^##\\s+${startPattern}\\s*$([\\s\\S]*?)(?=^##\\s+${endPattern}\\s*$)`, "im"),
  );
  return match ? match[1].trim() : null;
}

function canonicalRawRequest(section) {
  return section
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/^> ?/, ""))
    .join("\n")
    .trim();
}

function sha256(value) {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function isKnown(value) {
  return value !== null && !UNKNOWN.has(value.trim().toLowerCase());
}

function validateTranscript(name, content, index, expected) {
  const errors = [];
  if (content.includes("\uFFFD") || /(?:鈥|锝|绡|涓€)/u.test(content)) {
    errors.push("contains replacement or mojibake markers");
  }

  const requiredMetadata = [
    "probe_id",
    "raw_request_sha256",
    "executor_model",
    "executor_model_version",
    "executor_tier",
    "executor_host",
    "context_ref",
    "separation",
  ];
  const metadata = {};
  for (const key of requiredMetadata) {
    metadata[key] = metadataField(content, key);
    if (metadata[key] === null) errors.push(`missing metadata ${key}`);
  }

  const responseHeading = "Exact Full Actual Response(?: / Artifact)?";
  const receiptHeading = "(?:Post-run (?:Executor )?Compiled Receipt|Compiled Result — Post-run (?:Executor|Orchestrator) Receipt)";
  const rawRequest = extractBetweenHeadings(content, "Exact Raw Request", responseHeading);
  const fullResponse = extractBetweenHeadings(content, responseHeading, receiptHeading);
  const receipt = extractBetweenHeadings(
    content,
    receiptHeading,
    "Independent Raw-First Grade",
  );
  const gradeSection = extractSection(content, "Independent Raw-First Grade");
  if (!rawRequest) errors.push("missing exact raw request section");
  if (!fullResponse) errors.push("missing exact full actual response section");
  if (!receipt) errors.push("missing post-run executor receipt");
  if (!gradeSection) errors.push("missing independent raw-first grade");

  if (receipt && !/not (?:shown|pre-shown|presented)|was not pre-shown/i.test(content)) {
    errors.push("executor receipt does not disclose that it was recorded post-run/not pre-shown");
  }
  if (!/(?:actual terminal|## Actual Terminal)/i.test(content)) errors.push("missing actual terminal");
  if (!/(?:files opened|opened files)/i.test(content)) errors.push("missing opened files");
  if (metadata.separation && !["fresh_context", "same_context_followup"].includes(metadata.separation)) {
    errors.push("separation value is invalid");
  }

  if (metadata.probe_id && metadata.probe_id !== expected.id) {
    errors.push(`probe_id ${metadata.probe_id} does not match expected ${expected.id}`);
  }
  if (expected.id.startsWith("P-R") && fullResponse) {
    if (/^\s*\|.*\|\s*$/m.test(fullResponse) || /<table|```/i.test(fullResponse)) {
      errors.push("result response contains a horizontal-scroll-prone table/code construct");
    }
    for (const required of ["FAIL", "完成标准"]) {
      if (!fullResponse.includes(required)) errors.push(`result response missing ${required}`);
    }
    if (!/(?:未发布|没有发布|尚未发布|暂不发布)/.test(fullResponse)) {
      errors.push("result response does not preserve the no-release state");
    }
    if (/Trust Badge|\[AQL .*\|/i.test(fullResponse)) errors.push("result response contains a legacy status strip");
  }
  const expectedPrefix = expected.id.toLowerCase();
  if (!name.toLowerCase().startsWith(`${expectedPrefix}-`) && name.toLowerCase() !== `${expectedPrefix}.md`) {
    errors.push(`filename identity does not match ${expected.id}`);
  }

  let digest = null;
  if (rawRequest) {
    digest = sha256(canonicalRawRequest(rawRequest));
    if (metadata.raw_request_sha256 && metadata.raw_request_sha256 !== digest) {
      errors.push(`raw request digest mismatch: expected ${digest}`);
    }
  }

  let grade = null;
  let gradeMetadata = {};
  if (gradeSection) {
    for (const key of [
      "reviewer_context_ref",
      "reviewer_model",
      "reviewer_model_version",
      "reviewer_host",
      "separation",
      "raw_evidence_first",
      "structural_integrity",
      "identity_binding",
      "grade",
      "fail_line",
    ]) {
      gradeMetadata[key] = metadataField(gradeSection, key);
      if (gradeMetadata[key] === null) errors.push(`independent grade missing ${key}`);
    }
    grade = gradeMetadata.grade;
    if (grade && !KNOWN_GRADES.has(grade)) errors.push(`invalid independent grade ${grade}`);
    if (gradeMetadata.structural_integrity && gradeMetadata.structural_integrity !== "PASS") {
      errors.push("independent structural_integrity must be PASS for a recorded transcript");
    }
    if (gradeMetadata.identity_binding && gradeMetadata.identity_binding !== "PASS") {
      errors.push("independent identity_binding must be PASS for a recorded transcript");
    }
    if (["PASS", "FAIL"].includes(grade)) {
      if (gradeMetadata.raw_evidence_first !== "true") errors.push(`${grade} grade requires raw_evidence_first true`);
      if (gradeMetadata.separation !== "fresh_context") errors.push(`${grade} grade requires fresh reviewer context`);
      if (!isKnown(gradeMetadata.reviewer_context_ref)
          || gradeMetadata.reviewer_context_ref === metadata.context_ref) {
        errors.push(`${grade} grade requires an independent reviewer context`);
      }
      for (const key of ["reviewer_model", "reviewer_model_version", "reviewer_host"]) {
        if (!isKnown(gradeMetadata[key])) errors.push(`${grade} grade requires known ${key}`);
      }
    }
    if (grade === "PASS") {
      for (const key of ["executor_model", "executor_model_version", "executor_tier", "executor_host"]) {
        if (!isKnown(metadata[key])) errors.push(`PASS grade requires known ${key}`);
      }
      if (gradeMetadata.fail_line && gradeMetadata.fail_line.toLowerCase() !== "none") {
        errors.push("PASS grade must use fail_line none");
      }
    }
    if (grade === "FAIL" && (!gradeMetadata.fail_line || gradeMetadata.fail_line.toLowerCase() === "none")) {
      errors.push("FAIL grade requires an exact fail_line");
    }
  }

  if (digest && metadata.probe_id) {
    const row = index.split(/\r?\n/).find((line) => line.startsWith(`| ${metadata.probe_id} |`));
    if (!row) {
      errors.push("missing behavior-probes.md identity row");
    } else {
      if (!row.includes(`\`${digest}\``)) errors.push("behavior index digest mismatch");
      if (metadata.executor_model && !row.includes(metadata.executor_model)) errors.push("behavior index executor model mismatch");
      if (grade && !row.includes(`**${grade}**`)) errors.push("behavior index independent grade mismatch");
      if (!row.includes(`2026-08-13/${name}`)) errors.push("behavior index transcript link mismatch");
    }
  }

  return {
    errors: errors.map((error) => `${name}: ${error}`),
    record: { id: expected.id, name, digest, grade, metadata, gradeMetadata },
  };
}

function requiredGradeErrors(records, expected = EXPECTED) {
  const byId = new Map(records.map((record) => [record.id, record]));
  const errors = [];
  for (const item of expected) {
    if (!item.requiredGrade) continue;
    const record = byId.get(item.id);
    if (!record) {
      errors.push(`${item.id}: required semantic record missing`);
    } else if (record.grade !== item.requiredGrade) {
      errors.push(`${item.id}: independent grade must be ${item.requiredGrade}, got ${record.grade || "missing"}`);
    }
  }
  return errors;
}

function validateAll() {
  const errors = [];
  const index = fs.readFileSync(INDEX_PATH, "utf8");
  if (!fs.existsSync(RENDERING_PATH)) {
    errors.push("user-result-rendering.md: file missing");
  } else {
    const rendering = fs.readFileSync(RENDERING_PATH, "utf8");
    for (const heading of ["## Routine success fixture", "## Failure fixture", "## Pending-evidence fixture"]) {
      if (!rendering.includes(heading)) errors.push(`user-result-rendering.md: missing ${heading}`);
    }
    if (!/approximately 320px: `NOT_RUN`/.test(rendering) || !/desktop width: `NOT_RUN`/.test(rendering)) {
      errors.push("user-result-rendering.md: native width checks must remain honest NOT_RUN until real Codex UI evidence exists");
    }
  }
  const records = [];
  const contents = new Map();

  for (const expected of EXPECTED) {
    const transcriptPath = path.join(TRANSCRIPT_DIR, expected.file);
    if (!fs.existsSync(transcriptPath)) {
      errors.push(`${expected.file}: file missing`);
      continue;
    }
    const content = fs.readFileSync(transcriptPath, "utf8");
    contents.set(expected.file, content);
    const result = validateTranscript(expected.file, content, index, expected);
    errors.push(...result.errors);
    records.push(result.record);
  }

  errors.push(...requiredGradeErrors(records));

  const initial = records.find((record) => record.id === "P-W1");
  const repair = records.find((record) => record.id === "P-W1R");
  const fresh = records.find((record) => record.id === "P-W1F");
  if (initial && initial.grade === "PASS") errors.push("P-W1 initial self-failure must not be promoted to an independent PASS");
  if (repair && repair.metadata.separation !== "same_context_followup") errors.push("P-W1R is not labeled same-context");
  if (fresh && fresh.metadata.separation !== "fresh_context") errors.push("P-W1F is not labeled fresh-context");

  const creativeA = contents.get("p-w5-creative-a.md");
  const creativeB = contents.get("p-w6-creative-b.md");
  if (creativeA && creativeB && creativeA === creativeB) errors.push("creative A/B transcripts are identical");

  if (errors.length > 0) {
    for (const error of errors) console.error(`ERROR ${error}`);
    return 1;
  }
  const gradeCounts = { PASS: 0, FAIL: 0, NOT_RUN: 0 };
  for (const record of records) gradeCounts[record.grade] += 1;
  console.log(
    `validate-writing-probes: STRUCTURAL PASS (${EXPECTED.length} transcripts); `
    + `independent semantic grades PASS ${gradeCounts.PASS} / FAIL ${gradeCounts.FAIL} / NOT_RUN ${gradeCounts.NOT_RUN}; `
    + "no self-check or transcript count was promoted into a semantic aggregate",
  );
  return 0;
}

function fixtureTranscript(id, rawRequest, response, grade, options = {}) {
  const digest = sha256(rawRequest);
  const executorId = options.executorId || "/root/executor";
  return `# Raw Writing Probe Transcript

- probe_id: \`${id}\`
- raw_request_sha256: \`${digest}\`
- executor_model: \`gpt-test\`
- executor_model_version: \`gpt-test-v1\`
- executor_tier: \`balanced\`
- executor_host: \`Codex\`
- context_ref: \`${executorId}\`
- separation: \`fresh_context\`

## Exact Raw Request

> ${rawRequest}

## Exact Full Actual Response

${response}

## Post-run Executor Compiled Receipt

Compiled after the response and not pre-shown. Actual terminal: BUILT. Opened files: SKILL.md. PASS self-check.

## Independent Raw-First Grade

- reviewer_context_ref: \`/root/reviewer\`
- reviewer_model: \`gpt-review\`
- reviewer_model_version: \`gpt-review-v1\`
- reviewer_host: \`Codex\`
- separation: \`fresh_context\`
- raw_evidence_first: \`true\`
- structural_integrity: \`PASS\`
- identity_binding: \`PASS\`
- grade: \`${grade}\`
- fail_line: \`${grade === "FAIL" ? response : "none"}\`
`;
}

function fixtureResult(kind) {
  const raw = "全文只能发生在温室。";
  if (kind === "planted-semantic-negative") {
    const expected = { id: "P-T1", file: "p-t1-negative.md", requiredGrade: "PASS" };
    const content = fixtureTranscript("P-T1", raw, "角色走出了温室。", "FAIL");
    const digest = sha256(raw);
    const index = `| P-T1 | \`${digest}\` | gpt-test | **FAIL** | 2026-08-13/p-t1-negative.md |`;
    const result = validateTranscript(expected.file, content, index, expected);
    const semantic = requiredGradeErrors([result.record], [expected]);
    return { structuralErrors: result.errors, semanticErrors: semantic };
  }
  if (kind === "identity-copy-negative") {
    const expected = { id: "P-T3", file: "p-t3-copy.md" };
    const content = fixtureTranscript("P-T1", raw, "角色留在温室。", "PASS");
    const digest = sha256(raw);
    const index = `| P-T1 | \`${digest}\` | gpt-test | **PASS** | 2026-08-13/p-t3-copy.md |`;
    const result = validateTranscript(expected.file, content, index, expected);
    return { structuralErrors: result.errors, semanticErrors: [] };
  }
  throw new Error(`unknown fixture ${kind}`);
}

function selfTest() {
  const raw = "只写一句事实。";
  const expected = { id: "P-T0", file: "p-t0-valid.md", requiredGrade: "PASS" };
  const content = fixtureTranscript("P-T0", raw, "这是事实。", "PASS");
  const digest = sha256(raw);
  const index = `| P-T0 | \`${digest}\` | gpt-test | **PASS** | 2026-08-13/p-t0-valid.md |`;
  const valid = validateTranscript(expected.file, content, index, expected);
  if (valid.errors.length !== 0 || requiredGradeErrors([valid.record], [expected]).length !== 0) {
    throw new Error(`valid fixture rejected: ${[...valid.errors, ...requiredGradeErrors([valid.record], [expected])].join("; ")}`);
  }

  const semanticNegative = fixtureResult("planted-semantic-negative");
  if (semanticNegative.structuralErrors.length !== 0) throw new Error("structurally valid semantic negative was rejected structurally");
  if (!semanticNegative.semanticErrors.some((error) => error.includes("must be PASS"))) {
    throw new Error("independent semantic FAIL was promoted to PASS");
  }

  const identityNegative = fixtureResult("identity-copy-negative");
  if (!identityNegative.structuralErrors.some((error) => error.includes("probe_id") || error.includes("filename identity"))) {
    throw new Error("copied transcript identity mismatch was accepted");
  }
  console.log("validate-writing-probes self-test: PASS (identity and semantic negatives rejected independently)");
  return 0;
}

function main(argv = process.argv.slice(2)) {
  const fixtureIndex = argv.indexOf("--fixture");
  if (fixtureIndex !== -1) {
    const kind = argv[fixtureIndex + 1];
    const result = fixtureResult(kind);
    const errors = [...result.structuralErrors, ...result.semanticErrors];
    for (const error of errors) console.error(`ERROR ${error}`);
    return errors.length > 0 ? 1 : 0;
  }
  return argv.includes("--self-test") ? selfTest() : validateAll();
}

if (require.main === module) process.exitCode = main();

module.exports = {
  EXPECTED,
  canonicalRawRequest,
  fixtureResult,
  main,
  requiredGradeErrors,
  sha256,
  validateTranscript,
};
