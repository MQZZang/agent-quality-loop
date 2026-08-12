# Contracts and Translation Rules

Use this reference when compiling a new request, handing work to another task, or interpreting a vague quality phrase. Keep outputs compact; omit empty optional fields.

## Contents

- [Task Contract](#task-contract)
- [Semantic Change Classes](#semantic-change-classes)
- [Evidence Labels and Levels](#evidence-labels-and-levels)
- [Phrase Translation](#phrase-translation)
- [Observability Gate (ALIGN)](#observability-gate-align)
- [Lifecycle Semantics and Legal Transitions](#lifecycle-semantics-and-legal-transitions)
- [Phase Summary and Full Envelope](#phase-summary-and-full-envelope)
- [Envelope Persistence (Canonical Carrier and Optional Cache)](#envelope-persistence-canonical-carrier-and-optional-cache)
- [Trust Badge (User-Facing Status Line)](#trust-badge-user-facing-status-line)
- [Envelope Consistency Check](#envelope-consistency-check)
- [Formal Quality Rule](#formal-quality-rule)
- [Ceremony Budget](#ceremony-budget)

## Task Contract

```yaml
schema_version: agent-quality-loop/v2
contract_id: stable short id
intent: align | diagnose | implement | accept | release | resume
assurance: fast | standard | formal
mode: align | evidence | execute | accept | release | full
phase: RAW | ALIGNED | EVIDENCED | BUILT | ACCEPTED | RELEASE_READY | DEPLOYED | PRODUCTION_VERIFIED
raw_request: exact user request or a faithful pointer
first_principles_goal: user-observable outcome
target_user_or_system: who or what experiences the result
problem_signal: observed pain, failure, or opportunity
success_observables: falsifiable results
counterexamples: cases that would disprove success
change_class: display_only | content | data | capability | algorithm | rollout | release | mixed
scope_allowlist: allowed surfaces
non_goals: preserved surfaces
evidence_authority: ordered sources
action_authority: read | local_write | external_write | destructive | release
executor_adapter: null or exact skill/workflow used for domain execution
release_intent: null | preflight | act
release_authorization: null or structured fields below
acceptance_gate: canonical applicability, required dimensions, and evidence-bound statuses
release_gate: null until release preflight; then a separate canonical gate
assumptions: safe and reversible assumptions only
unknowns: material unresolved facts
pause_conditions: conditions that prohibit the next phase
```

Do not force the user to fill this schema. Infer from the request, repository, and available history. Label inferred fields and ask only about unresolved choices that change the outcome or authority.

`target_user_or_system` means the **final consumer of the artifact plus the consumption medium** (e.g. end user in the shipped UI, reader of the published doc, player in the build)—not merely the requester or implementer. For experiential work (narrative, design, UI, games, docs), write `success_observables` and `counterexamples` in that consumer's perceptible terms.

Identifier, request, goal, target, problem, workspace, reconstruction, and expiry fields are non-empty scalar strings; do not serialize one-item arrays in their place. Collection fields are explicitly named as lists in the full envelope.

Keep the three routing axes independent:

- `intent` chooses the requested outcome; map it to the smallest compatible `mode`.
- `assurance` chooses evidence rigor: `fast` for trivial reversible work, `standard` by default, and `formal` for explicit formal-quality or high-consequence work.
- `action_authority` limits side effects and is never raised by assurance, available credentials, installed tools, or a lifecycle phase.

If an outcome-changing semantic or destructive ambiguity still requires user alignment, the active segment is `intent: align`, `mode: align`, `action_authority: read`, even when the raw request eventually asks for implementation. Preserve that eventual outcome in the request/goal fields; `intent: implement`, `mode: align` is not a legal route pair.

Authority is mode-bounded: `align`, `evidence`, and `accept` are read-only; `execute` and `full` are at most `local_write`; release preflight is read-only; release act uses explicit release authority. A non-null `release_intent` is valid only with `intent: release` and `mode: release`; resume must reconstruct and obtain a new current-turn release request rather than consume old authority.

For a compound request that combines local implementation/independent acceptance with publish or deploy language, serialize the current segment as `intent: implement`, `mode: full`, `release_intent: null`, and stop at most at `ACCEPTED`. Preserve the requested release as a handoff/non-goal, not as the active intent. A later explicit current-turn request starts the separate `intent: release`, `mode: release` route.

### Delegated-Agent Authority Inheritance

Any dispatched subagent's effective authority is at most the parent envelope's `action_authority`. The Dispatch Brief must state that ceiling explicitly. Needs that exceed the ceiling escalate upward; self-authorization is forbidden.

**Delegation boundary:** Host routing rules choose who executes, how many agents, and which model. This contract only defines trust conditions at measurement points: probe/acceptor independence, Brief completeness, and evidence before narrative.

`executor_adapter` is selected only after alignment and evidence. It receives the contract and may return at most a `BUILT` implementation receipt; it cannot grant acceptance or release authority.

For `external_write`, `destructive`, or `release`, require and preserve:

```yaml
release_authorization:
  authorized_this_turn: true | false
  environment: exact environment/project/account
  operation: exact deploy/upload/publish/write action
  targets: exact functions/collections/files/services
  expected_effects: externally observable mutations
  principal_or_role: human/service role that grants authority
  rollback: tested or reviewable recovery procedure
  manual_checks: required checks and current statuses
  expires_on: scope, target, environment, baseline, or turn change
```

Any missing field, `authorized_this_turn: false`, or expired scope blocks the external action. Never infer this authority from an earlier turn, a task envelope, credentials being available, a dry-run, or an acceptance PASS.

`release_intent: preflight` is read-only, uses `intent: release`, `mode: release`, `action_authority: read`, and keeps `release_authorization: null`. `release_intent: act` is a pre-action envelope: it uses the same explicit release route and requires `phase: RELEASE_READY`, `action_authority: release`, and the full structure above. After the authorized action finishes, emit a new `DEPLOYED` envelope with active authority and intent cleared; preserve what happened through evidence/artifact references rather than leaving a reusable act authorization. In `mode: full`, effective authority is never higher than `local_write`; release details cannot be consumed as permission.

For a command represented as a dry-run or simulation, preserve:

```yaml
side_effect_coverage:
  command: exact command or operation inspected
  mode: simulation | actual_action
  paths:
    - path: reachable write/deploy/publish/init/remote-call path
      effect: possible external effect
      expected_and_authorized: true | false | unknown
      rollback_ref: exact recovery step or authorization reference
      short_circuited: true | false | unknown  # required for simulation
      evidence_ref: implementation or trace evidence
  no_external_paths_evidence_ref: concrete readable current proof; required only when paths is empty
  all_paths_accounted_for: true | false
  all_external_effects_short_circuited: true | false
```

Every actual action requires `all_paths_accounted_for: true`, a non-empty `paths` list when an external path is reachable, and a non-empty readable current `evidence_ref` for every path; every path must also be expected, currently authorized, and rollback-accounted. An empty `paths` list is valid only with a non-empty readable current `no_external_paths_evidence_ref` that proves from inspected entrypoints that no external path is reachable. Only a simulation with the same coverage proof and `all_external_effects_short_circuited: true` supports calling that command side-effect-free. Neither condition alone proves runtime correctness, release readiness, or production safety beyond the inspected paths.

## Semantic Change Classes

Use the narrowest class supported by the user's words:

- `display_only`: visibility, layout, wording, or presentation; preserve data and capabilities.
- `content`: player/user-facing information changes; preserve unrelated UI and behavior.
- `data`: schema, stored values, seeds, or migrations; do not imply UI/capability deletion.
- `capability`: feature behavior or availability.
- `algorithm`: decision logic, ranking, classification, or recommendation behavior.
- `rollout`: route registration, feature flags, packaging, or audience exposure.
- `release`: deployment, upload, publication, production mutation, or human authorization.
- `mixed`: use only when the request explicitly requires multiple classes; list each boundary.

Words such as “删除、去掉、开放、上线、当前、正式、完成” are semantic-risk terms. Resolve their class before execution.

Quantifiers (“全部、所有、每个”, all/every) and negative-scope markers (“不要动、保持、除了”, do not touch/keep/except) are compile-risk terms: over-broad quantity and a dropped negative boundary are the two most common miscompiles. Preserve each one explicitly in `scope_allowlist` / `non_goals`.

## Evidence Labels and Levels

Label every material claim:

- `observed`: directly read, reproduced, measured, or witnessed.
- `inferred`: conclusion supported by cited observations.
- `assumption`: reversible working premise, explicitly disclosed.
- `unknown`: insufficient evidence; do not silently convert to a fact.

Keep evidence levels separate:

```text
source/static
generated artifact or receipt
simulation/mock/dry-run
local runtime
native/device/real environment
deployment fact
release or human authority
production verification
```

Evidence can support a higher-level decision only when an explicit contract says so. Names such as `PASS`, `ready`, `production`, or `current` do not raise authority by themselves.

## Phrase Translation

Translate recurring natural-language quality phrases into operations:

| Phrase | Operational meaning |
|---|---|
| 全面准确深度 | Cover all conclusion-changing evidence lanes; list excluded lanes and unknowns |
| 根因出发 | Reproduce, show a causal chain, and test plausible alternatives |
| 第一性目标 | State the user-observable outcome and constraints, not the requested mechanism |
| 苏格拉底式思考 | Resolve discoverable doubts; ask at most two conclusion-changing questions |
| 奥卡姆剃刀 | Minimize changed surfaces, assumptions, new abstractions, and verification cost while meeting the goal |
| 避免盲区 | Maintain an explicit unknown/not-run/risk register |
| 避免过度工程 | Run a falsification probe and vertical slice before scaling |
| 避免半成品 | Use phase-specific exit criteria; never hide required NOT_RUN or BLOCKED items |
| 玩家/用户视角 | Test decisions and observable behavior, not only internal structure |
| 写小说 | Compile `target_user_or_system` and observables from the **reader** perspective |
| 写大纲 | Compile from the **author-as-user** perspective (outline as working tool) |
| UI/UX | Compile from the **operator/user** interaction perspective |
| 游戏体验 | Compile from **player + designer** dual perspectives |
| 正式质量 | Require independent conjunctive acceptance and the necessary real-world evidence |

## Observability Gate (ALIGN)

For `assurance: formal` and high-ambiguity tasks, ALIGN must produce at least one observable `success_observables` item and at least one decidable `counterexamples` item. Write each as **who / on what medium / sees what**.

| Form | Reject (not observable/decidable) | Accept |
|---|---|---|
| success | “用户满意” / “质量看起来不错” | “结算页上，60 元订单显示运费 ¥8” |
| counterexample | “用户不满意即失败” / “体验不对就算失败” | “读者读完第 1 章前已在第 12 页前知道凶手姓名” |

If either cannot be produced in that form, record it under `unknowns` and treat it as blocking completion judgment.

## Lifecycle Semantics and Legal Transitions

Keep lifecycle phase and verdict orthogonal. Phase is the last evidenced milestone;
`FAIL`, `BLOCKED`, and `PENDING` never become phases.

| Phase | Plain-language meaning | Legal forward transition |
|---|---|---|
| `RAW` | not yet aligned | `ALIGNED` |
| `ALIGNED` | goal and scope aligned | `EVIDENCED` |
| `EVIDENCED` | requested diagnosis/evidence complete | `BUILT`, or terminal with `next_allowed_phase: null` |
| `BUILT` | implementation built; independent acceptance not yet passed | `ACCEPTED` |
| `ACCEPTED` | all required acceptance dimensions passed independently | `RELEASE_READY` through explicit release preflight |
| `RELEASE_READY` | frozen artifact is ready for an authorized release action | `DEPLOYED` |
| `DEPLOYED` | named target was changed and deployment was verified | `PRODUCTION_VERIFIED` |
| `PRODUCTION_VERIFIED` | required real-target outcomes were verified | terminal |

Goal/scope drift may move back to `RAW` or `ALIGNED`; evidence/baseline drift may move back to `EVIDENCED`; an invalidated build moves back to `EVIDENCED`. Record the reason. Never skip a forward transition.

Verdict semantics:

- `PASS`: all requirements for the current requested stage passed.
- `PASS_WITH_RISK`: the current stage passed; only explicitly non-required residual risk remains. It cannot grant `ACCEPTED` if any required dimension is not `PASS`.
- `FAIL`: evidence demonstrates a required defect.
- `BLOCKED`: a required decision cannot be made because evidence, authority, or safe state is missing.
- `PENDING`: work is intentionally awaiting the named next actor or check; it is not a pass.

## Phase Summary and Full Envelope

Maintain this six-field summary internally. Render it only when it clarifies a blocker, handoff/resume, release decision, or explicit user request; routine output should use equivalent plain language:

```yaml
phase: current phase
verdict: PASS | FAIL | BLOCKED | PASS_WITH_RISK | PENDING
goal: one user-observable sentence
scope: one compact in-scope/non-goal statement
evidence: only the decision-changing evidence or NOT_RUN gap
next: next allowed phase or required authority
```

Do not print the full task contract or full envelope during routine alignment. Maintain it internally and expand it only for cross-task handoff/resume, material blockers, release work, or an explicit user request.

Use the full envelope when expansion is justified:

Emit this at a handoff or stopping point:

```yaml
schema_version: agent-quality-loop/v2
skill_version: string, optional; from the package manifest
contract_id: inherited contract id
resume_ref: compact contract id plus workspace/artifact baseline reference
intent: inherited current intent
assurance: fast | standard | formal
mode: align | evidence | execute | accept | release | full
phase: current phase
verdict: PASS | FAIL | BLOCKED | PASS_WITH_RISK | PENDING
raw_request: exact request or durable source pointer
first_principles_goal: user-observable outcome
target_user_or_system: inherited target
problem_signal: inherited observed pain/failure/opportunity
success_observables: falsifiable results preserved from the contract
counterexamples: conditions that disprove completion
change_class: preserved semantic change class
scope_allowlist: current allowed surfaces
non_goals: preserved surfaces
evidence_authority: ordered source hierarchy
pause_conditions: conditions that invalidate progress
action_authority: effective action authority
executor_adapter: null or exact adapter identity/version
release_intent: null | preflight | act
release_authorization: exact structured authorization when action_authority exceeds local_write; otherwise null
side_effect_coverage: required for release act and dry-run/simulation safety claims; otherwise null
assumptions: safe reversible assumptions preserved from the contract
workspace_ref: branch/commit/tree hash or equivalent, plus dirty-state note
artifact_refs: changed or reviewed artifacts with hashes when material
evidence_refs: compact source/command/result references
implementation_receipt: null before execution; otherwise the structured adapter receipt below
acceptance_gate: preserved structured acceptance gate below
release_gate: null before release preflight; otherwise separate structured release gate below
reconstruction_status: supplied | reconstructed | incomplete
acceptance_independence: null or structured fields below
unknowns: remaining conclusion-changing unknowns
next_allowed_phase: one legal phase, or null for a legitimate terminal result
stop_reason: one enum below, or an ordered list when several apply
blocker: null or {reason, missing, owner, minimal_unlock, side_effects_not_taken}; every field non-empty for BLOCKED/PENDING
action_state_at_stop: null or structured fields below
expiry_or_drift_condition: when the envelope must be rebuilt
```

Allowed stop-reason values are `evidence_only_complete`, `user_cancelled`, `scope_changed`, `authority_revoked`, `ambiguity`, `evidence_gap`, `authority_gap`, `unsafe_workspace`, `acceptance_pending`, `acceptance_failed`, and `production_verified`. A user-requested pause normally uses `verdict: PENDING`; use `BLOCKED` only when a required decision or authorized next action is unavailable.

For user stop/pause, scope change, or authority revocation, preserve:

```yaml
action_state_at_stop:
  completed_actions: exact actions and observed effects
  in_flight_actions: actions not yet known complete or cancelled
  cancelled_before_start: queued actions that did not begin
  external_authority_invalidated: true | false
  local_edits: kept | revert_authorized | revert_pending_choice | none | unknown
```

Do not serialize an empty action-state object for these events. Record at least one concrete action, invalidated authority, or meaningful local-edit disposition. Unknown in-flight state must remain explicit until observed. For `user_cancelled`, `scope_changed`, or `authority_revoked`, use `verdict: PENDING` or `BLOCKED`, set `external_authority_invalidated: true`, clear `release_intent` and `release_authorization`, and reduce effective authority to at most `local_write`.

For domain execution, require this adapter receipt:

```yaml
implementation_receipt:
  adapter: exact skill/workflow and version or source ref
  input_contract_ref: aligned/evidenced contract id and baseline
  changed_artifacts: exact paths/objects or []
  verification_performed: exact commands/checks and results
  passing_evidence_refs: concrete references or []
  failing_evidence_refs: concrete references or []
  not_run: required checks not performed and why
  scope_deviations: deviations or []
  remaining_risks: residual risks or []
  result_phase: BUILT
```

An embedded adapter consumes the existing goal, scope, assumptions, assurance, authority, and must-hold checks. It does not emit a second alignment contract or user-facing lifecycle summary. Reject any receipt that claims `ACCEPTED`, `RELEASE_READY`, deployment, or new authority.

For acceptance, use:

```yaml
acceptance_independence:
  implementer_context_ref: task/thread/agent reference
  acceptor_context_ref: distinct task/thread/agent reference
  relation: fresh_context | different_role | same_context | unknown
  raw_evidence_before_implementer_narrative: true | false | unknown
```

Formal acceptance requires distinct non-empty context references, `relation` equal to `fresh_context` or `different_role`, and raw evidence first. Otherwise remain `phase: BUILT`, `verdict: PENDING`.

Rebuild the envelope after a baseline change, conflicting concurrent edit, evidence expiry, goal/scope change, or failed acceptance. Do not infer authority from an old envelope.

Resume discovery order is: explicit `resume_ref`; the same canonical envelope in available host persistence or an output handoff; then its permitted local cache at `.agent-quality-loop/envelope.json`. The envelope must preserve every Task Contract field above under the same name; do not rely on undocumented aliases such as `goal` or `authority`. This discovery order is distinct from reality-first trust: when recovered content conflicts with observable current workspace reality, the observable reality wins. If no complete envelope is available, set `reconstruction_status: incomplete`, reconstruct read-only, and request only the missing outcome-changing information. An incomplete reconstruction remains at or before `EVIDENCED`, uses `action_authority: read`, returns `BLOCKED` or `PENDING` with an actionable blocker, and cannot authorize a transition from `EVIDENCED` to `BUILT`. Never promise persistence the host does not provide.

## Envelope Persistence (Canonical Carrier and Optional Cache)

The canonical envelope is the only permitted lifecycle carrier/cache exception. It may be carried in host persistence or the output handoff; do not create a parallel state store, event ledger, or authority record. Persist a local cache only when `action_authority` is at least `local_write` **and** the target workspace permits the path or ignores it. Otherwise, do not write a local file: hand off the same envelope through the available host/output channel.

- Permitted local current-envelope cache: `<workspace>/.agent-quality-loop/envelope.json`.
- Optional local history snapshot: `<workspace>/.agent-quality-loop/history/<contract_id>-<phase>-<timestamp-or-artifact-id>.json`. The suffix must be unique for every snapshot; never overwrite a same-phase snapshot or rely on same-name append.
- Persist or hand off at every stopping point. The cache is a resumability aid, not authority or evidence; observable current workspace/repository reality always wins over it.
- Consumer projects that choose this cache should add `.agent-quality-loop/` to `.gitignore`.

## Trust Badge (User-Facing Status Line)

When the loop is active, append exactly one badge line at the end of every user-visible summary:

```text
[AQL <version> | <state> | evidence: <short summary> | next: <action or none>]
```

`version` comes from the package `manifest.json` `version` field; if unreadable, use `unversioned`.

Allowed `state` values (mapped from lifecycle phase / stop condition):

| State | Maps from |
|---|---|
| `aligned` | `ALIGNED` |
| `evidence-complete` | `EVIDENCED` |
| `built, self-QA passed` | `BUILT` after self-QA |
| `independently accepted` | `ACCEPTED` |
| `release-ready` | `RELEASE_READY` |
| `deployed` | `DEPLOYED` |
| `production-verified` | `PRODUCTION_VERIFIED` |
| `blocked` | blocked stop |
| `pending` | pending stop |

English example:

```text
[AQL 2.3.0 | independently accepted | evidence: all required dimensions PASS | next: none]
```

Chinese-scenario example (state words may be localized; syntax unchanged):

```text
[AQL 2.3.0 | 已独立验收 | evidence: 必选维度均 PASS | next: none]
```

## Envelope Consistency Check

Before handoff or release, verify:

- every required field exists and uses a declared enum;
- `schema_version`, `intent`, `assurance`, `mode`, and `action_authority` are present and mutually consistent;
- `align`, `evidence`, and `accept` remain read-only; `execute` and `full` never exceed local write;
- assurance does not raise action authority, and ordinary `implement + standard` work may stop at `BUILT` without inventing formal acceptance;
- any executor adapter receipt is bound to the current contract/baseline and reports exactly `result_phase: BUILT`;
- every Task Contract field is present under the same field name, including target user/system, problem signal, assumptions, and action authority;
- the current and next phases follow the legal-transition table, or `next_allowed_phase` is null for a valid terminal result;
- `mode: full` has not advanced beyond `phase: ACCEPTED`;
- `mode: full` has effective authority no higher than `local_write` and consumes no release authorization;
- a non-null `release_intent` appears only on the explicit `intent: release`, `mode: release` route; resume never consumes old release authority;
- any `external_write`, `destructive`, or `release` authority has a complete, current-turn, target-specific authorization; `read`/`local_write` carries none;
- `phase: BUILT` + `verdict: PENDING` represents unavailable independent acceptance;
- `acceptance_gate` and `release_gate` are distinct namespaces; release work preserves and never overwrites the accepted gate;
- `release_gate` remains null before preflight begins from `ACCEPTED`; a partial preflight may retain `phase: ACCEPTED` only with `release_intent: preflight`;
- each active gate's `required_dimensions` is non-empty, contains no unknown names, and exactly matches its canonical dimensions classified `required`;
- the acceptance gate always requires `goal_fidelity`, `semantic_invariants`, `user_observable_result`, and `reproducibility`; the release gate always requires `artifact_identity`, `accepted_baseline`, `target_environment`, and `rollback_recovery`;
- every canonical dimension has one applicability record; `not_applicable` includes a concrete readable relevant evidence ref and never means merely unavailable;
- every required acceptance dimension has an evidence-bound status and every required status is `PASS` before `ACCEPTED`;
- `RELEASE_READY` begins from the exact frozen `ACCEPTED` artifact and every required release-gate dimension has an evidence-bound `PASS`;
- `release_intent: act` exists only on the pre-action `RELEASE_READY` envelope, uses `action_authority: release`, binds the exact frozen artifact/target plan, and cannot skip preflight or be reused after deployment;
- `DEPLOYED` and `PRODUCTION_VERIFIED` preserve historical evidence but clear active authority to `read`, with null release intent and authorization;
- acceptance independence has distinct context references and raw-evidence-first ordering before `ACCEPTED`;
- every `PASS` has `evidence_refs.length >= 1`; every referenced item for `PASS` and `not_applicable` exists, is readable, is current for the declared baseline/artifact, and is relevant to that exact dimension;
- `unknown` or `NOT_RUN` appears only in unknown/missing-evidence records and forces the affected applicable dimension to `BLOCKED` or `NOT_RUN`, never `PASS` or `not_applicable`;
- hashes/baselines match the artifacts being handed off;
- `release_intent: preflight` remains read-only; `release_intent: act` has complete, current-turn, unexpired, target-specific authorization;
- every actual release action has non-vacuous side-effect coverage: reachable paths produce a non-empty list, every path has readable current evidence and is expected/authorized/rollback-accounted, while a zero-path claim has separate readable current proof;
- any dry-run/simulation safety claim has the same non-vacuous path proof and `all_external_effects_short_circuited: true` before the command is run;
- stop/pause/scope/revocation events cannot report PASS, contain traceable action state, invalidate external authority, and clear active release intent/authorization;
- `reconstruction_status: incomplete` remains read-only at or before `EVIDENCED`, with `BLOCKED`/`PENDING` and no authorized build transition;
- a blocked/pending stop contains all non-empty actionable blocker fields, and an evidence-only terminal contains `stop_reason: evidence_only_complete`.

Keep the last valid phase with `verdict: BLOCKED` when the envelope cannot pass this check. Do not invent a new phase label.

## Formal Quality Rule

Use a conjunctive decision, not a weighted average:

```text
formal_quality =
  acceptance_gate.required_dimensions.length > 0
  and acceptance_gate.canonical_applicability_complete
  and all(required_acceptance_dimension.status == PASS)
  and all(required PASS evidence_refs.length >= 1)
  and all(PASS/not_applicable evidence bindings are concrete, readable, current, and relevant)
```

Canonical acceptance dimensions are:

```text
goal_fidelity
semantic_invariants
user_observable_result
source_static
tests
runtime_native
privacy_security
reproducibility
```

`goal_fidelity`, `semantic_invariants`, `user_observable_result`, and `reproducibility` are always required. Classify every other canonical dimension as `required` or `not_applicable`; the latter needs a task-specific rationale and evidence reference. Missing evidence is `NOT_RUN` or `BLOCKED`, never `not_applicable`.

`user_observable_result`: when the artifact is consumable in its native medium, require a cold-consumption probe from the declared `target_user_or_system` perspective (see [domain-profiles.md](domain-profiles.md) for domain methods). A `PASS` must bind probe process evidence; if a probe is infeasible, use `NOT_RUN` and disclose why. Text self-check must not substitute for cold consumption.

Canonical release-readiness dimensions are:

```text
artifact_identity
accepted_baseline
automated_checks
runtime_native_or_real_target
privacy_security
target_environment
rollback_recovery
manual_release_checks
```

`artifact_identity`, `accepted_baseline`, `target_environment`, and `rollback_recovery` are always required for `RELEASE_READY`. Classify every other release dimension by the same rule. Preserve this in `release_gate`; never reuse or overwrite `acceptance_gate`. A non-required dimension is omitted from its gate's statuses only after its evidence-backed `not_applicable` record is preserved.

Use this structure:

```yaml
acceptance_gate:
  canonical_set: acceptance_v1
  required_dimensions: [goal_fidelity, semantic_invariants, user_observable_result, reproducibility]
  applicability:
    runtime_native:
      disposition: required | not_applicable
      rationale: task-specific reason
      evidence_ref: concrete readable evidence; never unknown or NOT_RUN for not_applicable
  status_by_dimension:
    goal_fidelity:
      status: PASS | FAIL | BLOCKED | NOT_RUN
      evidence_refs: [at least one concrete readable current dimension-relevant evidence for PASS]
      missing_evidence: null or explicit gap for BLOCKED/NOT_RUN
release_gate:
  canonical_set: release_v1
  required_dimensions: [artifact_identity, accepted_baseline, target_environment, rollback_recovery]
  applicability: every release canonical dimension classified independently
  status_by_dimension: same evidence-binding structure as acceptance_gate
```

Before release preflight, `release_gate` is `null`. After preflight begins, both gates remain in the envelope. `unknown`, `NOT_RUN`, and an empty list are never valid PASS evidence; `unknown`/`NOT_RUN` are also invalid for `not_applicable.evidence_ref`.

## Ceremony Budget

| Assurance | Ceremony allowed |
|---|---|
| `fast` | Badge line only; no other ritual output |
| `standard` | Badge plus receipt essentials |
| `formal` | Full required sections |

When ceremony volume clearly exceeds the size of the change, proactively suggest an assurance downgrade to the user.
