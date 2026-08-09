---
name: agent-quality-loop
description: Use when a user wants an AI coding or workspace agent to turn a natural-language objective into a scoped first-principles task, diagnose evidence, implement through the appropriate domain adapter, independently verify formal completion, prepare a release, or resume work without goal drift. Routes task intent, assurance level, and action authority separately; supports align, evidence, execute, accept, release, and safe local full workflows. Trigger on phrases such as 完整闭环、全面根因分析、转化为清晰目标、正式质量、独立验收、继续上个任务、准备发布, or explicit $agent-quality-loop use. Do not use for trivial factual Q&A or casual brainstorming with no execution or acceptance workflow.
---

# Agent Quality Loop

## Purpose

Compile the user's natural language into a stable task contract, then move work through explicit trust boundaries:

```text
RAW -> ALIGNED -> EVIDENCED -> BUILT -> ACCEPTED -> RELEASE_READY
```

Treat `DEPLOYED` and `PRODUCTION_VERIFIED` as later facts, never synonyms for `RELEASE_READY`.

Keep the user's input natural. Extract structure on the agent side; do not make the user fill a long form. Ask only when an unresolved choice materially changes the goal, scope, risk, or external authority.

## When to Use

Use the description as the trigger source of truth. After triggering, select one mode from the Mode Router. Do not expand scope merely because the user asks for “全面、深度、根因、第一性、苏格拉底、奥卡姆、无盲区”. Translate those phrases into concrete controls from [contracts.md](references/contracts.md).

## When Not to Use

- Do not use for one-line factual answers, casual ideation, or tasks with no reusable execution/acceptance lifecycle.
- Do not use `full` to perform external writes, deployment, upload, publication, purchases, destructive actions, or production data changes.
- Do not replace domain skills, repository instructions, human product judgment, real-device checks, or release authority.

## Three-Axis Router

Infer three independent axes from natural language. Do not make the user name them:

| Axis | Values | Purpose |
|---|---|---|
| `intent` | `align`, `diagnose`, `implement`, `accept`, `release`, `resume` | What outcome the user wants now |
| `assurance` | `fast`, `standard`, `formal` | How much evidence and independence the risk requires |
| `action_authority` | `read`, `local_write`, `external_write`, `destructive`, `release` | What side effects are allowed |

Choose the lowest sufficient assurance:

- `fast`: trivial, reversible, narrow work; focused evidence and self-QA remain required.
- `standard`: default for implementation; root-cause evidence, scoped plan, and proportionate verification.
- `formal`: explicit formal-quality request or high-consequence work; independent acceptance and applicable real-world evidence are required.

Assurance never grants authority. `formal + read` remains read-only; credentials or available tools never raise authority. A request for implementation plus formal independent acceptance may route to `full`, while ordinary implementation should stop at `BUILT` after self-QA instead of waiting ritualistically for an acceptor.

Map the intent to the smallest compatible lifecycle mode:

Honor an explicit mode. Otherwise infer the smallest mode that satisfies the request:

| Mode | Use for | Maximum phase |
|---|---|---|
| `align` | compile intent, resolve semantic scope, define success | `ALIGNED` |
| `evidence` | read-only diagnosis, root cause, current-state audit | `EVIDENCED` |
| `execute` | implement an already aligned and evidenced local change | `BUILT` |
| `accept` | independent acceptance of existing work or QA claims | `ACCEPTED`; otherwise keep the last valid phase |
| `release` | release preflight or explicitly authorized release action | `RELEASE_READY`, or a separately evidenced later state |
| `full` | safe local end-to-end work | independent `ACCEPTED`; never enter `release` automatically |

Mode also caps effective authority: `align`, `evidence`, and `accept` are read-only; `execute` and `full` are at most `local_write`. A non-null release intent is valid only on an explicit `intent: release`, `mode: release` route. Resume may reconstruct a release handoff but cannot consume an old authorization; the user must issue a new current-turn release request.

If a requested later mode lacks a trustworthy earlier envelope, reconstruct the missing phases read-only. Never invent phase completion.

Infer `full` when a request explicitly combines local implementation with independent acceptance and does not authorize external side effects. Do not stop at `BUILT` merely because the user omitted the mode name.

Routing precedence:

- `full` always has the stronger cap. If the same request says “publish/deploy”, finish at most through independent acceptance and return a release handoff; do not consume release authority inside `full`.
- In `release`, distinguish read-only `preflight` from external `act`. Preflight does not require mutation authority. Act requires the complete, current-turn authorization in the release contract.
- A read-only `evidence` request may finish at `EVIDENCED` with no next phase. Do not propose execution merely to fill a lifecycle field.
- A request to run an unspecified admin/production command, even with `--dry-run`, starts in ALIGN/EVIDENCE until the exact command, targets, reachable paths, and authority are known.

When `full` and publish/deploy language conflict, explain the local-only cap in the opening alignment before doing work so the user cannot mistake acceptance for publication.

### Adapter Router

Select an executor only after ALIGN and EVIDENCE. The lifecycle contract stays owned here; the adapter owns domain execution only.

- Code implementation: read [code-implementation-adapter.md](references/code-implementation-adapter.md); an installed `ask-plan-code-qa` may implement the same contract in `embedded` profile.
- Documents, data, design, cloud, or other domains: use the narrowest applicable domain skill and require the same adapter receipt.
- No suitable adapter: use the minimal generic plan/execute/self-QA loop; do not pretend a missing domain capability exists.

Every adapter consumes the aligned/evidenced contract and returns: changed artifacts, verification performed, passing/failing/not-run evidence, scope deviations, remaining risks, and a maximum lifecycle result of `BUILT`. An adapter must not grant `ACCEPTED`, `RELEASE_READY`, or external authority.

## Workflow (Operating Procedure)

### 1. ALIGN — Compile the first-principles contract

Restate three lines before non-trivial work and continue unless a genuine blocker remains:

```text
目标：quote the user's words, then state the user-observable outcome.
边界：name in-scope and explicit do-not-touch surfaces.
最可能误解：name the highest-variance semantic or authority interpretation.
```

Produce the compact contract defined in [contracts.md](references/contracts.md). Distinguish display, data, capability, rollout, and release changes. Resolve discoverable doubts through read-only inspection. Ask at most two questions only when the answer changes direction and cannot be derived safely.

Do not treat style words as permission, scope, evidence, or acceptance.

### 2. EVIDENCE — Establish truth before changing it

Default to read-only. Record:

- baseline identity: workspace, branch/commit or equivalent, relevant version, and dirty-state caveat;
- claims labeled `observed`, `inferred`, `assumption`, or `unknown`;
- source, timestamp/currentness, counterevidence, and confidence;
- reproduction or observable behavior;
- causal hypothesis and falsified alternatives;
- the smallest falsification probe and proposed acceptance method.

`action_authority: read` also prohibits repository-local/generated writes. Before running tests, builds, or diagnostics, inspect their outputs; use a temporary/ignored isolated destination only when that side effect is disclosed and allowed, otherwise do not run them. Read-only never permits an external call with mutation potential.

Separate static, generated, simulated, runtime, native/device, deployment, and release evidence. A test count, hash, report, screenshot, or AI review is supporting evidence, not a user-outcome oracle.

Stop when authority conflicts, evidence cannot support the conclusion, a live write would be required, or the baseline is too contaminated to attribute results.

For an evidence-only request, `phase: EVIDENCED` is a valid terminal result. Use `verdict: PASS` when the requested diagnosis is answered, `PASS_WITH_RISK` only for disclosed non-required uncertainty, or `BLOCKED` when a required conclusion remains unsupported; set `next_allowed_phase: null` and record the stop reason.

### 3. EXECUTE — Make the smallest authorized local change

Require `ALIGNED` and `EVIDENCED`, either supplied or reconstructed. For code, follow [code-implementation-adapter.md](references/code-implementation-adapter.md); if `ask-plan-code-qa` is available, use its compatible `embedded` profile. The adapter consumes the existing contract, skips duplicate alignment output, and returns only its implementation receipt. This skill owns lifecycle phase, assurance, evidence authority, and external-authority boundaries. Emit one combined user-facing summary, not parallel templates.

Before editing:

- define the file/data allowlist and non-goals;
- record the workspace baseline and protect unrelated dirty changes;
- define 3–7 semantic must-hold checks only when meaning could drift;
- run the highest-value falsification probe before scaling a broad change.

Implement the smallest root-cause change, match existing architecture, and verify in proportion to risk. Report `BUILT` with passing, failing, and not-run evidence. Self-QA never grants `ACCEPTED`.

Pause on scope expansion, dirty-file collision, generated-source ambiguity, missing secrets, destructive action, external write, or production effect.

### 4. ACCEPT — Run an independent goal-achievement review

Use `review-gate` when its skill and required references are readable. The acceptor must be a fresh context or different role and must read the original contract, artifacts, diff, and raw evidence before the implementer's narrative. Record distinct implementer/acceptor context references and the evidence-reading order. If review-gate is unavailable or incomplete, record the dependency gap and use this skill's conjunctive dimension review in the independent context; do not imitate or claim a review-gate run. If independence cannot be evidenced, keep `phase: BUILT`, return `verdict: PENDING`, and never self-certify.

When `review-gate` is invoked, its output contract governs the review report. Use this skill only to map that verdict and evidence into lifecycle phase and dimension statuses; do not replace or duplicate `Review Scope`, applicable findings, `Verdict`, or `What Was Checked`.

Map its verdict conservatively:

- `Proceed` -> `ACCEPTED` only when every required acceptance-gate dimension has evidence-bound `PASS`; otherwise keep `BUILT` and use the blocking dimension result.
- `Proceed with fixes` -> keep `BUILT`, normally `verdict: FAIL`; optional suggestions may instead be disclosed without changing an otherwise valid `Proceed`.
- `Block` -> keep the last valid phase and use `verdict: FAIL` for a demonstrated defect or `BLOCKED` for missing evidence/authority.
- Normalize any non-enum wording to one of those three meanings before lifecycle mapping.

Start from the canonical acceptance dimensions in [contracts.md](references/contracts.md). Classify every canonical dimension as `required` or `not_applicable` with rationale and concrete evidence; never omit a difficult dimension. `acceptance_gate.required_dimensions` must be non-empty and must always include goal fidelity, semantic invariants, user-observable result, and reproducibility. Judge each required dimension as `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` and bind every `PASS` to at least one readable, current, dimension-relevant evidence reference:

- goal fidelity and semantic invariants;
- user/player observable result and counterexamples;
- static, unit, and integration evidence;
- required runtime/native/device evidence;
- privacy, security, and permission boundaries;
- reproducibility from the declared baseline.

Report release readiness in a separate `release_gate`; never overwrite `acceptance_gate` or add release dimensions to it. Use a conjunctive acceptance gate: incomplete applicability classification, an empty required set, missing/unknown PASS evidence, or any required `FAIL`, `BLOCKED`, or `NOT_RUN` blocks formal acceptance. Do not average away blockers or mark a dimension not applicable merely because evidence is unavailable. The acceptor reports findings by default and does not repair them unless a new execute authorization is given.

### 5. RELEASE — Separate readiness from external action

Enter only through an explicit `release` request after acceptance. Default to read-only `preflight` and handoff, not mutation. Preflight preserves the completed `acceptance_gate`, starts a distinct `release_gate` for the frozen `ACCEPTED` artifact, classifies every canonical release-readiness dimension, and may reach `RELEASE_READY` without mutation authority only when its non-empty required set has evidence-bound PASS results; this still does not authorize an external action. `release_intent: act` may start only from that exact `RELEASE_READY` artifact and target plan.

For `release_intent: act`, require current-turn authorization that names the exact environment, operation, targets, expected effects, credentials/role, rollback, and manual checks. Record every reachable write, deploy, publish, initialization, and remote-call path in a side-effect coverage receipt, require a non-empty path list whenever any external path is reachable, and bind every path to readable current implementation/trace evidence. A zero-path claim needs separate readable evidence proving that no external path is reachable. Require each actual-action path to be expected, authorized, and rollback-accounted. Inspect the implementation of any `dry-run`; never assume the flag covers every action. A simulation additionally requires every external effect to be proven short-circuited. Missing coverage blocks the command and cannot support `RELEASE_READY` by itself.

Persist those exact fields in `release_authorization` from [contracts.md](references/contracts.md). Any missing field blocks external action. In `mode: full`, effective authority is capped at `local_write`; release details are handoff context only and must be re-authorized in a separate `release` request.

Report readiness by dimension. `RELEASE_READY` does not mean `DEPLOYED`. After an authorized action, verify the real target before reporting `DEPLOYED` or `PRODUCTION_VERIFIED`.

### 6. Maintain a resumable envelope

Maintain the envelope from [contracts.md](references/contracts.md) at every stopping point. In normal user-facing output, lead with a plain-language result: understood, evidence complete, implemented with self-QA, independently accepted, release-ready, deployed, or production-verified. Keep the compact phase summary internal unless phase detail helps resolve a blocker, supports handoff/resume, governs release, or the user asks for it. Keep any emitted envelope source-backed and small enough to hand to a fresh task. A transcript or implementer summary is not a substitute.

For resume, let the user say `继续 <resume_ref>`; locate the latest valid envelope and artifact references automatically from the current task, workspace artifact, or available host persistence. Never require the user to copy YAML. For bare “继续上次任务”, use the sole unambiguous candidate; if multiple candidates exist, show at most three compact references and ask one choice. If no durable envelope is available or it has drifted, reconstruct read-only and ask only for missing outcome-changing information. An incomplete reconstruction stays read-only at or before `EVIDENCED`, reports `BLOCKED` or `PENDING` with an actionable blocker, and cannot authorize implementation, acceptance, or release.

On “stop”, “pause”, scope correction, or revoked authority, stop scheduling new actions immediately and, when control returns, persist the structured stop action state: completed, still in flight, cancelled before start, external authority invalidation, and local-edit disposition. Return `PENDING` or `BLOCKED`, never PASS. Invalidate external authorization, clear active release intent/authorization, reduce effective authority to at most local write, preserve the last valid phase, and rebuild from the earliest changed phase before resuming. Never claim that an already completed side effect was cancelled. Keep completed local edits unless the user authorizes a revert; when they conflict with the narrowed scope, ask one explicit keep-or-revert question before further edits.

Before emitting a full envelope, resolve `SKILL_ROOT` as the directory containing this `SKILL.md`, then run `node <SKILL_ROOT>/scripts/validate-envelope.js <envelope.json>` when Node and a JSON serialization are available. Never resolve the script relative to the project working directory. The validator enforces structural invariants; human/agent review still owns whether evidence is current, readable, relevant, and semantically sufficient. Also validate referenced artifact/evidence existence, stop action state when applicable, and release authorization/side-effect coverage. Preserve the last valid phase with `verdict: BLOCKED` rather than serialize an invalid or stale handoff.

## Output Contract

Lead with the result. Show only the structure needed for the active mode.

Use plain-language state labels by default: understood, evidence complete, implemented with self-QA, independently accepted, release-ready, deployed, or production-verified. Show internal phase terms only when they help a decision or handoff. `BLOCKED`, `FAIL`, and `PENDING` are verdicts, not lifecycle phases.

Deep work does not require verbose output. Default limits are:

- `align`: the three alignment lines; add the compact phase summary only for ambiguity, blocker, handoff, or explicit request;
- `evidence`: conclusion, up to five material findings, unknowns, and next phase;
- `execute`: changed surfaces, passing/failing/not-run evidence, and next phase;
- `accept`: verdict first, then only decision-changing findings and dimension statuses;
- `release`: expand as needed for safety, authority, rollback, and manual checks.

Exceed these limits only when evidence is genuinely necessary for a decision or the user explicitly requests a full artifact.

When another workflow skill is active, emit at most one user-facing phase summary per turn. Reuse its required sections instead of restating the same goal, scope, plan, or QA narrative.

Always maintain internally, and expose in plain language when decision-relevant:

- current phase and verdict;
- first-principles goal and scope/non-goals;
- material evidence and its level;
- failing or not-run requirements;
- next allowed phase and any required authority; use `null` when the requested lifecycle legitimately ends here.

For every `BLOCKED` or `PENDING` result, make the next step executable: state the observable reason, missing evidence/input/authority, who or what can unlock it, the minimum unlock action, and external side effects that were not taken.

For `full`, proceed through safe local phases without asking for ritual approval. Stop only on a genuine goal-changing ambiguity, unsafe workspace state, missing evidence, failed acceptance, or external/production authority boundary.

## Acceptance Criteria

- [ ] Natural language is compiled into a user-observable goal, not merely paraphrased.
- [ ] Scope, non-goals, semantic change class, evidence hierarchy, and authority are explicit.
- [ ] Intent, assurance, and authority are inferred independently; assurance never grants authority.
- [ ] The lowest sufficient assurance is used, so routine work does not wait for formal acceptance unless required.
- [ ] No phase is claimed without its required evidence.
- [ ] Broad work uses a falsification probe before full-scale implementation.
- [ ] Self-QA and independent acceptance remain separate.
- [ ] Every required dimension must pass; no required blocker can be averaged away.
- [ ] Required dimensions are non-empty and every canonical dimension is explicitly required or evidence-backed not applicable.
- [ ] `full` never performs release or external side effects.
- [ ] `mode: full` never advances beyond `phase: ACCEPTED`.
- [ ] Pure evidence work can terminate without inventing an execute step.
- [ ] User stop, scope correction, and authority revocation invalidate future actions before resumption.
- [ ] Independent acceptance has distinct context evidence and raw-evidence-first ordering.
- [ ] Release requires exact current-turn authority and real post-action verification.
- [ ] The final envelope can resume work without reading the entire transcript.
- [ ] Routine output is plain-language and low-noise; internal phases expand only for blockers, handoff, release, or explicit request.
- [ ] Execution adapters return at most `BUILT`; formal acceptance and release remain owned by this lifecycle.
- [ ] Full envelopes pass the deterministic structural validator when available.
- [ ] Full handoff envelopes pass field, enum, reference, mode-phase, and release-authorization consistency checks.

## Failure Modes

| Failure | Recovery |
|---|---|
| Repeats a long universal prompt in every mode | Keep invariants here once; move schemas/examples to references |
| Makes the user fill the full contract | Compile it automatically; ask only outcome-changing questions |
| Dumps lifecycle YAML during routine alignment | Keep it internal; use plain language unless handoff, blocked, release, or explicitly requested |
| Expands “hide” into data or capability deletion | Return to ALIGN and set the semantic change class/non-goals |
| Treats test volume or a report as product success | Add user-observable counterexamples and run ACCEPT independently |
| Continues from a shared dirty workspace without attribution | Record baseline, isolate work, or block execution |
| Lets the implementer approve its own work | Keep `phase: BUILT`, return `verdict: PENDING`, and use a fresh reviewer |
| Treats partial dry-run as globally safe | Read each action path; block unproven side effects |
| Calls accepted work released or deployed | Restore the phase vocabulary and run RELEASE separately |
| Forces a read-only diagnosis toward implementation | End at `EVIDENCED` with `next_allowed_phase: null` |
| Continues after stop, scope correction, or revoked authority | Stop new actions, invalidate authority, report in-flight effects, and rebuild |
| Repeats ask-plan or review-gate output | Keep one internal envelope and one user-facing summary; reuse the invoked skill's required sections |
| Uses formal assurance for every task | Select the lowest sufficient assurance; reserve independent acceptance for explicit or high-consequence needs |
| Treats a code workflow as the universal executor | Route to the narrowest domain adapter and require the common implementation receipt |
| Trusts prose alone for structural gates | Run the bundled envelope validator; block invalid handoffs or release states |

## Evaluation Cases

Before trusting changes to this skill, resolve `SKILL_ROOT` from this file and run `node <SKILL_ROOT>/scripts/validate-skill.js`. Then forward-test the cases in [evaluation-cases.md](references/evaluation-cases.md), covering at least one happy path, one semantic ambiguity, and one authority/failure boundary in a fresh context without leaking expected answers. The script covers portable structure and deterministic envelope regressions; it does not replace behavioral forward-testing.
