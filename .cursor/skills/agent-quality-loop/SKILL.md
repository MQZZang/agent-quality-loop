---
name: agent-quality-loop
description: Use for a non-trivial coding or workspace task that needs scoped alignment, evidence-grounded diagnosis, local implementation, independent acceptance, release preflight, or safe resume. It keeps task authority separate from assurance, supports explicit-only portable collaboration preferences, and stops at the requested terminal. Do not use for trivial factual answers or casual brainstorming.
license: MIT
metadata:
  author: MQZZang
  version: "3.0.0"
---

# Agent Quality Loop

## Purpose

Turn a natural-language request into one source-grounded Task Contract, then work within explicit trust boundaries:

```text
RAW -> ALIGNED -> EVIDENCED -> BUILT -> ACCEPTED -> RELEASE_READY
```

`DEPLOYED` and `PRODUCTION_VERIFIED` are later observed facts, not synonyms for `RELEASE_READY`. Keep interaction natural: ask only when a material choice cannot be resolved from the request and readable context. No evidence claim without evidence; acceptance never authorizes release.

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

### ALIGN

Compile a compact Task Contract per [contracts.md](references/contracts.md). State the goal, relevant scope/non-goals, and any material semantic or authority uncertainty in natural prose when it helps the user decide; there is no required opening template. Resolve discoverable questions by read-only inspection first. Ask at most two questions only when the answer changes the outcome and cannot be safely derived.

For non-trivial work, use [alignment-compiler.md](references/alignment-compiler.md): define an observable after-state, distinguish fixed constraints from guided defaults and open professional choices, ground load-bearing terms, and preserve bidirectional traceability. Treat a requested mechanism as an assumption, not the goal. On contradiction, disclose the evidence and resolution before editing.

Read applicable project rules, facts, and lessons. A matching active lesson may enter the Task Contract; lessons remain separate project knowledge and do not turn into user profile data automatically.

### Profile v2

The optional profile is `$AQL_HOME/profile.json`; its memory policy is `explicit_only`, with rules in [personalization.md](references/personalization.md) and [profile-projection.md](references/profile-projection.md).

- Persistent profile writes require an unambiguous user memory request or explicit confirmation. Ordinary repeat behavior, corrections, silence, or accepted output never accumulates across tasks, creates a candidate, or prompts for memory.
- At most two complete, active, relevant entries may be projected into **Guided** in the existing Task Contract. Suppress conflict, unknown applicability, review-due, incomplete, superseded, archived, or current-turn-conflicting entries.
- Fresh Mode skips stored preferences for one task, but preserves current instructions, project facts/rules, lessons, authority, evidence, acceptance, and release boundaries. It writes nothing.
- A profile cannot grant authority, relax evidence or acceptance, authorize release, prove an outcome, or override repository rules. Profile/CLI/directory failure means no profile use, not Core failure; report it only for an explicit profile-management request.
- The JSON format is portable for Agents that can access the same machine-local store. Other devices use explicit export/import; there is no default sync, upload, or background service. Create `.aql/project.json` only after confirmed project-scoped preference save, and only with schema plus opaque project identity.

### Capability Receipt

Capability Receipt is temporary mechanical evidence, not profile data, Task Contract state, or a lifecycle source. Its facts must come from an installer, host/version feature report, explicit configuration, local probe, or actual call result. Model self-report and host-name inference are invalid. Unknown/unrun is `NOT_RUN`; regenerate after relevant host/version/configuration changes. Disclose a receipt only when capability availability changes the task result.

### EVIDENCE

Remain read-only by default. Record the relevant baseline, observed versus inferred claims, sources/currentness, causal hypothesis and alternatives, the smallest falsification probe, and the proposed acceptance method. Separate static, generated, simulated, runtime/native, deployment, and release evidence. Counts, hashes, tests, screenshots, and reviews are supporting evidence, not user-outcome proof by themselves.

Stop when authority conflicts, evidence cannot support the requested conclusion, a live write would be required, or baseline contamination prevents attribution. Evidence-only work may end at `EVIDENCED`; do not propose later phases merely to complete a chain.

### EXECUTE

Require aligned and evidenced inputs, supplied or reconstructed. Define the allowlist and non-goals, protect unrelated dirty work, and create semantic must-holds only where meaning could drift. Use the highest-value falsification probe before broadening a change.

For code, use [code-implementation-adapter.md](references/code-implementation-adapter.md): inspect before edit, choose the smallest root-cause change, preserve semantic invariants, run proportionate checks, and return one implementation receipt capped at `BUILT`. For writing, use [writing-collaboration-adapter.md](references/writing-collaboration-adapter.md). Domain tools may execute their specialty but inherit the same contract and authority ceiling.

Pause on scope or authority drift, dirty-file collision, generated/source ambiguity, missing prerequisite, destructive effect, external write, or production action. A different implementation path inside unchanged goal/scope/authority may proceed after disclosing the observed reason; otherwise return to ALIGN. Repeated same-shape failure stops retries and reports the smallest actionable unblock.

### ACCEPT

Acceptance is an AQL Core function. Use a fresh context that reads the frozen Task Contract, artifacts/diff, and raw evidence before the implementer narrative. The full conjunctive method is [acceptance-review.md](references/acceptance-review.md).

`ACCEPTED` requires evidence-bound `PASS` for every required acceptance dimension. A demonstrated defect is `FAIL`; unavailable evidence, authority, or fresh-context independence is `BLOCKED`/`PENDING` at the last valid phase. The acceptor identifies findings but does not repair them without a new execute authorization. `ACCEPTED` ends the task unless the user separately requests release work.

### RELEASE

Release preflight begins from the exact accepted artifact and uses a separate release gate. It must establish artifact identity, accepted baseline, target environment, rollback/recovery, and every other applicable requirement with current evidence. Do not overwrite the acceptance gate. Publishing, pushing, tagging, deploying, uploading, or creating a Release requires complete current-turn authorization for exact targets and operation; otherwise stop after preflight or handoff.

### Result And Resume

Render one user-facing result, not phase templates. Lead with conclusion, user impact/boundary, decisive evidence, material uncertainty, then at most one needed action. Use precise language such as evidence conclusion complete, implementation/self-check complete, independent acceptance complete, or release preflight complete; do not blur adjacent states.

Resume reconstructs the Task Contract and baseline from readable artifacts and evidence. A transcript, profile, or prior claim is not enough to restore authority, acceptance, or release permission. Reconcile dirty state and changed files before any write.

## Output Contract

Lead with exactly one adaptive [User Result Summary](references/contracts.md#user-result-summary). Preserve this order when relevant: conclusion, user impact and boundary, decisive evidence, incomplete evidence or risk, required user action, and exact completion standard. Routine success is normally 1-3 lines. Expand only for formal acceptance, failure, blocker, handoff, audit, or release safety. Adapters emit receipts, not parallel user-facing status blocks.

## Acceptance Criteria

- One Task Contract owns goal, lifecycle, evidence, and authority.
- Current instructions outrank profile defaults; profile entries affect Guided only and never exceed two.
- Missing profile, CLI, hooks, or user-directory access degrades to normal Core behavior.
- Execution reads before editing, protects scope, and stops at `BUILT` after self-QA.
- Formal acceptance is fresh-context, raw-evidence-first, conjunctive, and bound to exact artifacts.
- Capability claims have mechanical sources; unknown capability remains `NOT_RUN`.
- No local mode performs or implies an external, destructive, deploy, publish, or release action.
- Results follow Result Attention and do not expose internal profile/receipt machinery by default.

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

## Evaluation Cases

Run `node <SKILL_ROOT>/scripts/validate-skill.js`, then forward-test the happy, ambiguous, and authority-boundary cases in [evaluation-cases.md](references/evaluation-cases.md) from a fresh context. Structural PASS proves only mechanics; behavioral and product claims require their separately declared evidence.
