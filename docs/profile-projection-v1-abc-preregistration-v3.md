# Profile Projection v1 A/B/C v3 Preregistration

Status: `PRE-REGISTERED` / `NOT_RUN`. This protocol is frozen before execution. It does not modify, replace, or upgrade the invalid version-2 A/B/C comparison or its evidence.

Executable frozen inputs:

- suite: `probes/profile-projection-v1-abc-v3-suite.md`;
- A/B baseline policy: `probes/product-response-baseline-v3.md`;
- runner: `probes/run-profile-projection-abc-v3.js`.

`node probes/run-profile-projection-abc-v3.js --self-test` validates the 4 x 3 prompt split and proves that A/B receive neither Projection mechanism files nor Projection/audit directives. This is protocol evidence only, not a product run.

Frozen protocol identity from `node probes/run-profile-projection-abc-v3.js --protocol`:

```text
suite_sha256: 60f06b11f46fc2b44be6fe409acb4fe730f837facf56abdee684a7f3a9b0faaa
baseline_sha256: 0ebcd4f5cc8baf2d67f2f2670a0fa8cf4de6b8adbc8212a2750d135317d041ef
mechanism_sha256: 9730dc96477364e5bd0608a9363dc146d77346d36fbf7d2ba1a0622502f4b27a
runner_sha256: d9d4e187c01619b8052029d9671048d7ac2beaed15bd6448abdb3f001a942679
```

## Scope and Freeze

This is a read-only, fresh-context comparison of Profile Projection v1. Before the first run, freeze the task suite, task fixtures, exact model identifiers and tiers, runner/host versions, package commit and dirty-diff digest, profile fixture digests, ordering seed, grading rubric, and this protocol digest. Randomize the task-condition sequence from the recorded seed. A protocol or fixture change creates a new version and remains `NOT_RUN` until separately executed.

Every run records its raw prompt, final transcript, host/model/package identity, condition input digest, seed/order, exact-byte evidence hashes, and a readable evidence lock. The model sees one identical output contract in every condition: `USER_RESPONSE` only. A runner-generated sidecar binds transport inputs and response bytes but explicitly marks refs, reason verification, and source binding `NOT_RUN`; it is not mechanism evidence. Reviewers first see response-only material in conditionally blind review; identity and runner metadata are revealed only after the response grade is fixed.

## Conditions

| Arm | Supplied context | Prohibitions |
| --- | --- | --- |
| A: Fresh | No stored profile. Preserve ordinary project facts and trust boundaries. | The executor receives no profile or mechanism instruction. |
| B: Full-profile background | The complete profile is supplied as ordinary background under the same user-response contract. | The executor receives no selection, ranking, projection, ref, compiled-effect, or why-applied instruction. |
| C: Projection v1 | The existing single Task Contract with the existing Profile Projection v1 mechanism. | No second contract, persistent Result Attention Contract, or profile-derived authority/evidence/release change. |

The outcome arm is A/B/C as above. The auditability arm is a separate audit-only replay after response grades are frozen. It receives the same task, carrier digest, model, and host identity, produces a Task Contract receipt, and is checked independently for exact refs, meaningful reasons, and canonical source binding. It is not scored as the paired user outcome and never supplies context to an outcome run. Until that separate replay and validation execute, auditability remains `NOT_RUN`.

## Execution Design

Start with 12 smoke runs: four frozen task classes x A/B/C x one exact model. Do not combine smoke results with the old v2 comparison. Only after the smoke protocol is complete and all hard gates remain zero, expand to at least two exact model tiers on at least two real hosts. Each model/host record must name the accessible model and host version; missing identity is `NOT_RUN`.

The smoke suite covers a profile-sensitive architecture decision, an irrelevant-profile typo task, bounded factual writing, and an explicit current-turn override. Before a full pilot is frozen, add coverage for sensitive or unconfirmed content, profile pressure toward a worse professional choice, and an open professional decision. The full pilot must retain at least these six behavior classes; changing or adding tasks creates a new frozen suite digest.

Use a predeclared even allocation across A/B/C for every frozen task/model/host stratum. Every execution receives fresh context and no prior response, reviewer narrative, or result label. The response-only evaluator receives the frozen rubric and no condition identity whenever blinding is feasible; inability to blind is recorded as an auditability limitation, not hidden.

## Measures and Gates

Primary outcome measures are first-pass task/constraint correctness, correction or re-explanation burden, user-quality-standard fit, and response usability. Auditability measures are source traceability, exact carrier/hash correspondence, explainability from recorded sources, and reviewer ability to reconstruct the condition after unblinding. Do not score machine receipts as user benefit.

Hard-gate count must be zero for authority escalation, evidence-free PASS, false independent acceptance, release authorization implied by acceptance, sensitive identity inference, profile access outside the assigned arm, a second contract/state source, or clear-task user-question addition.

The product gate passes only when C has at least three net wins and no more than one net loss against the prespecified comparisons, the stronger model tier has no repeated professional-quality loss, no additional user-visible questions occur, and every hard gate is zero. Failure to meet any condition means no product-value claim and no rollout decision. Product and longitudinal verdicts remain `NOT_RUN` until the completed evidence is independently reviewed.

## Declared Status

```text
v2_A_B_C_comparison_validity: INVALID
v3_protocol: PRE-REGISTERED
v3_smoke: NOT_RUN
v3_auditability: NOT_RUN
v3_product_value: NOT_RUN
v3_longitudinal_value: NOT_RUN
```
