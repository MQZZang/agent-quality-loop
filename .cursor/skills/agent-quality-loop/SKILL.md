---
name: agent-quality-loop
description: Use when a coding or workspace task needs scoped alignment, evidence-only diagnosis of a failing test, build, or behavior, local implementation with self-QA, independent acceptance (独立验收), release preflight, or safe resume of interrupted work, and when the user asks to remember or store a lasting collaboration preference (explicit-only). It keeps task authority separate from assurance and stops at the requested terminal. Do not use for trivial factual answers, dictionary definitions, translations, or casual brainstorming.
license: MIT
metadata:
  author: MQZZang
  version: "3.1.1"
---

# Agent Quality Loop

## Purpose

Turn a natural-language request into one source-grounded Task Contract, then work within explicit trust boundaries:

```text
RAW -> ALIGNED -> EVIDENCED -> BUILT -> ACCEPTED -> RELEASE_READY
```

`DEPLOYED` and `PRODUCTION_VERIFIED` are later observed facts, not synonyms for `RELEASE_READY`. Default professional freedom: no template, bookkeeping, or ceremony on ordinary tasks. Structured rigor enters only for `assurance: formal`, irreversible/release actions, or an explicit user request.

## When to Use

Use for non-trivial local work that needs aligned scope, evidence-grounded diagnosis, implementation and self-QA, independent acceptance, release preflight, or resumable handoff. Natural-language intent is the canonical interface.

## When Not to Use

Do not invoke for one-line factual answers or casual brainstorming. Do not use AQL to replace domain expertise, human product judgment, real-target verification, or current-turn authority for an external or destructive action.

## Core Boundaries

- The Task Contract is the sole task/lifecycle/authority truth. A Dispatch Brief is a transient projection of it, never a second contract or persisted workflow.
- Current-turn instructions override stored preferences. Project rules, authority, evidence, acceptance, and release boundaries override preferences in every case.
- AQL Core works without a profile, CLI, user directory, hooks, or host-specific shortcut. Do not claim unavailable capabilities.
- Keep output decision-first under [Result Attention](references/result-attention.md). Ordinary results do not expose internal contracts, profile projections, or capability receipts.
- `full` means safe local alignment, evidence, execution, and independent acceptance only. It never publishes, deploys, uploads, purchases, or changes production data.
- Never fabricate a missing referent to satisfy the letter of a request. A mechanical edit that cannot produce the user-observable outcome is a miscompile, not a resolution. On contradiction, disclose the mismatch, then stop or ask. Adding a missing referent is never a resolution.
- Claim labels: `observed` / `inferred` / `assumption` / `unknown`. Do not silently convert `unknown` into a fact. Names such as `PASS`, `ready`, or `production` do not raise authority.
- Semantic-risk words (删除/去掉/开放/上线/当前/正式/完成) must have a change class before execution. Quantifiers (全部/所有/每个) and negative-scope markers (不要动/保持/除了) belong in `scope_allowlist` / `non_goals`.
- Keep a six-field card internally (phase, verdict, goal, scope, evidence, next). Do not print the full contract on routine turns.
- Fixed constraints, Guided defaults, and Open professional choices stay distinct. The allowlist is the ALIGN-frozen surface set.
- Chinese status stays precise: 已对齐 / 证据结论完成 / 实现与自检通过 / 独立质量验收通过 / 发布准备检查通过. Do not write 已验收可发布.
- Mini phrase map: 验收 → read-only independent accept; 正式质量 → formal conjunctive accept; 上线/发布 → separate current-turn release; 苏格拉底式 → at most two conclusion-changing questions after read-only grounding.

## Workflow (Operating Procedure)

### Routing

Infer three independent axes. Use the lowest sufficient assurance; assurance never grants authority.

| Axis | Values |
|---|---|
| intent | `align`, `diagnose`, `implement`, `accept`, `release`, `resume` |
| assurance | `fast`, `standard`, `formal` |
| action authority | `read`, `local_write`, `external_write`, `destructive`, `release` |

| Mode | Purpose | Maximum terminal |
|---|---|---|
| `align` | settle goal, scope, semantic meaning, and success | `ALIGNED` |
| `evidence` | read-only diagnosis or current-state audit | `EVIDENCED` |
| `execute` | implement aligned/evidenced local work | `BUILT` |
| `accept` | independently assess existing work | `ACCEPTED`, when justified |
| `release` | release preflight or explicitly authorized release action | `RELEASE_READY`, or later observed fact |
| `full` | local end-to-end through independent acceptance | `ACCEPTED` |

Ordinary implementation stops at `BUILT`; do not create an independent acceptor unless requested or required by `formal`/consequence. `accept` is read-only and requires a genuinely fresh context. `release` requires a separate, current-turn, target-specific authorization; preflight is read-only. If a request mixes local work and publish/deploy, complete only the local segment and return a release handoff.

When outcome-changing ambiguity remains, align read-only instead of silently selecting an interpretation. When an earlier phase is missing or stale, reconstruct it read-only. Never invent phase completion or reuse old release authority.

Mechanical scope/decision gates exist only for `assurance: formal` when a frozen envelope is present (`scripts/gates-g1-g3.js`). Routine tasks stay prose-constrained. External-write / destructive commands still never auto-allow.

### ALIGN

Compile a compact internal Task Contract. For routine work, keep the six-field card; do not load the full [contracts.md](references/contracts.md) machine protocol. Expand that file only for formal, handoff, resume, release, or envelope writes. State the goal, relevant scope/non-goals, and any material semantic or authority uncertainty in natural prose when it helps the user decide. Resolve discoverable questions by read-only inspection first.

Ask only when, after read-only grounding, at least two credible interpretations remain AND they lead to different after-states, authority, scope, or success criteria. Do not ask to fill a contract field for its own sake. Prefer a closed choice when the credible options are exhaustive; otherwise ask one bounded open question that names the decision boundary. No broad questionnaires. At most two questions in one early checkpoint. External-write, destructive, and release authorization remain a separate checkpoint.

When the user's single message already supplies goal, scope, target, operation, and current-turn authorization, act on it; do not re-split a combined authorization into ceremonial confirmations.

For non-trivial work, define an observable after-state, distinguish fixed / guided / open choices, and ground load-bearing terms. Treat a requested mechanism as an assumption, not the goal. On contradiction, disclose the mismatch, then stop or ask.

Read applicable project rules, facts, and lessons. A matching active lesson may enter the Task Contract; lessons remain separate project knowledge.

### Profile v2

The optional profile is `$AQL_HOME/profile.json` (`explicit_only`). Persistent writes need an unambiguous memory request or confirmation. At most two complete, active, relevant entries may enter Guided. A profile cannot grant authority, relax evidence or acceptance, authorize release, or override repository rules.

Read [personalization.md](references/personalization.md) / [profile-projection.md](references/profile-projection.md) only when the task explicitly attaches a projection handle, a capability receipt declares a profile this turn, or the user explicitly requests a memory operation. Do not scan directories looking for a profile.

### Capability Receipt

Capability Receipt is temporary mechanical evidence, not profile data or lifecycle state. Facts must come from an installer, host/version report, configuration, local probe, or actual call. Model self-report is invalid. Unknown/unrun is `NOT_RUN`.

### EVIDENCE

Remain read-only by default. Separate static, generated, simulated, runtime/native, deployment, and release evidence. Counts, hashes, tests, and reviews are supporting evidence, not user-outcome proof.

`observer_class`: `implementer_self` | `agent_review` | `mechanical_runtime` | `human` (with `human_role`: `reviewer` | `operator_tester` | `target_user`). There is no total order; each claim type declares its valid observation-source set. `agent_review` supports only artifact-bounded claims — rubric consistency, diff-vs-scope, internal contradictions, missing named counterexamples, observable properties of the supplied artifact, and candidate comparisons under frozen criteria — and never upgrades them into environment, target-user, or production claims. `user_observable_result: PASS` requires both a native-medium / runtime `evidence_kind` and a valid observation source (`mechanical_runtime`, or `human` with an applicable role).

### EXECUTE

Require aligned and evidenced inputs. Protect unrelated dirty work. Use the highest-value falsification probe before broadening a change.

For code, use [code-implementation-adapter.md](references/code-implementation-adapter.md). For writing, use [writing-collaboration-adapter.md](references/writing-collaboration-adapter.md). Domain tools inherit the same contract and authority ceiling.

Re-anchor on resume/compaction, path change, repeated same-shape failure, first read-to-write, scope expansion, release preflight, or a premise contradiction. Compare touched surfaces to the ALIGN-frozen allowlist, never to the previous increment. Re-anchor cannot raise phase or authority, adds no badge, fires at most once per event, and keeps no ledger of its own: if it surfaces a material decision, the note lives in that decision's three-line record.

A decision is material iff any of: a public/exported symbol, schema, or persisted shape changes; recovery needs more than reverting files this session authored; the frozen allowlist names two or more systems; a requested mechanism is contradicted by workspace evidence; two mutually exclusive causal hypotheses remain; or an algorithm/data change alters external choice policy, ranking, economic outcomes, public behavior, or persistence semantics. Plain display/content fixes and internal-only tweaks do not trigger. The three-line record (chosen / strongest credible alternative including no-change–delete–reuse / overturning observation) is internal only. Goal-field forks must be asked; same after-state implementation forks are recorded, not asked.

Pause on scope or authority drift, dirty-file collision, generated/source ambiguity, missing prerequisite, destructive effect, external write, or production action. Repeated same-shape failure (same check, error class, or missing referent) stops retries.

### ACCEPT

Acceptance is an AQL Core function: fresh context, read-only, contract → artifact/diff → raw evidence → implementer narrative. It does not self-certify, repair, or authorize release. Ordinary tasks stay at `BUILT`.

Standard acceptance is result-anchored free review. Answer three questions with whatever probes professional judgment selects, in any order, with no dimension bookkeeping: (1) Does the frozen goal's observable after-state hold? (2) Is any hard boundary violated? (3) Is every claim within its evidence and observer limits? Report findings result-first in plain prose, ordered by consequence.

The four-dimension conjunctive method in [acceptance-review.md](references/acceptance-review.md) is `assurance: formal` or release-bound acceptance only.

### RELEASE

Release preflight begins from the exact accepted artifact and uses a separate gate. Publishing, pushing, tagging, deploying, uploading, or creating a Release requires complete current-turn authorization for exact targets and operation; otherwise stop after preflight or handoff.

### Result And Resume

Render one user-facing result. Lead with conclusion, user impact/boundary, decisive evidence, material uncertainty, then at most one needed action. Resume reconstructs the Task Contract from readable artifacts and evidence. A transcript or prior claim is not enough to restore authority, acceptance, or release permission.

## Output Contract

Lead with exactly one adaptive [User Result Summary](references/contracts.md#user-result-summary). Preserve this order when relevant: conclusion, user impact and boundary, decisive evidence, incomplete evidence or risk, required user action, and exact completion standard. Routine success is normally 1-3 lines. Expand only for formal acceptance, failure, blocker, handoff, audit, or release safety. Do not read the full contracts file for routine output; the order is inlined here. Adapters emit receipts, not parallel user-facing status blocks.

## Acceptance Criteria

- One Task Contract owns goal, lifecycle, evidence, and authority.
- Current instructions outrank profile defaults; profile entries affect Guided only and never exceed two.
- Missing profile, CLI, hooks, or user-directory access degrades to normal Core behavior.
- Execution reads before editing, protects scope, and stops at `BUILT` after self-QA.
- Formal acceptance is fresh-context, raw-evidence-first, conjunctive, and bound to exact artifacts. Standard acceptance is result-anchored free review.
- Capability claims have mechanical sources; unknown capability remains `NOT_RUN`.
- No local mode performs or implies an external, destructive, deploy, publish, or release action.
- Results follow Result Attention and do not expose internal profile/receipt machinery by default.
- Mechanical gates, when present, check only fields, timing, paths, authority, and state invariants.

## Failure Modes

| Failure | Recovery |
|---|---|
| Mechanism or profile becomes a second contract | Restore the Task Contract as sole truth; retain only a bounded receipt/ref |
| Repetition is treated as memory consent | Discard it; require explicit memory intent or confirmation |
| Missing optional runtime blocks ordinary work | Skip personalization/control operation and continue Core |
| Self-QA is called independent acceptance | Restore `BUILT`; dispatch a demonstrably fresh acceptor |
| A test/hash is treated as product outcome proof | Narrow the claim and run the declared behavioral/consumer probe |
| Acceptance is treated as release permission | Stop; require a separate current-turn release request |
| Ceremony exceeds the task | Keep the contract internal and render only the adaptive result |
| Mechanical gate used as a semantic judge | Return quality, alternative-strength, and evidence-sufficiency questions to the brain/accept layers |

## Evaluation Cases

Run `node <SKILL_ROOT>/scripts/validate-skill.js`, then forward-test the happy, ambiguous, and authority-boundary cases in [evaluation-cases.md](references/evaluation-cases.md) from a fresh context. Structural PASS proves only mechanics; behavioral and product claims require their separately declared evidence.
