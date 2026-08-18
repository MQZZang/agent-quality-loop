# AQL 3.1.0 formal acceptance record

Date: 2026-08-18 evening (UTC+8)  
Acceptor: maintainer-side agent (independent of the build executor's session; fresh-context verifier agents and blind graders used for all artifact judgments that must not be self-graded)  
Object under acceptance: branch `aql-3.1-candidate`, skill tree at `1d72894` plus the evidence commit `43acfb3`; version bump to 3.1.0 is a metadata-only delta applied after this record  
Assurance: formal (release-bound) → four-dimension conjunctive review applies

## Contract recap (what 3.1 promised)

Binding sources: `docs/aql-3.1-iteration-plan.md` (WP1–WP7, §6 release standards), `docs/aql-3.1-execution-directive.md` (authorization boundaries, decision table), frozen protocols under `docs/experiments/aql-3.1/`.

## Dimension 1 — goal_fidelity: PASS

- WP1–WP7 implemented in the authoritative tree and mirrors; verified by fresh-context verifier V1 (content conformance, found WP6 FAIL + WP3/WP4 partial gaps — all closed in `1d72894` and logged as M-004) and V2 (claims audit vs raw artifacts, PASS).
- The user's standing correction is honored in the shipped text: standard acceptance is result-anchored free review (three free-form questions, no dimension bookkeeping); the conjunction below applies only because this release itself is formal/release-bound.
- Observation sources: agent_review (artifact-bounded: rubric consistency, diff-vs-scope, internal contradictions) + mechanical_runtime (`validate-all` green).

## Dimension 2 — semantic_invariants: PASS

- 56/56 envelope regression fixtures green; G1–G3 bidirectional fixtures false_block 0/7, missed_block 0/8 (self-test 16/16, re-run independently by both verifiers).
- Negative observer test: `g2-agent-review-pass` DENY (agent_review cannot PASS `user_observable_result`).
- Hard-boundary invariants held live: 0 HG events across all 39 graded cells (no executed publish/push, no fabricated referent in any skill arm, no standing authority stored, no fake acceptance/release).
- Observation sources: mechanical_runtime (validators, fixtures) + blind agent_review (transcript facts).

## Dimension 3 — user_observable_result: PASS

- Phase D end-to-end gate: seven pass conditions all PASS on raw numbers (`docs/experiments/aql-3.1/phase-d-results.md`), blind-graded transcripts as native-medium runtime evidence.
- Phase C routing: suite PASS — rev2 should-trigger 8/8 (24/24 organic user-level `SKILL.md` reads), rev1 should-not-trigger 8/8.
- Load reduction: default hot path 72,637 → 17,796 bytes (−75.5%), measured twice independently from staged/release trees.
- Spot rerun on the final tree (hidden fixtures H1–H3): grade shapes identical to the D-tested candidate; M-004 mitigated.
- Observation sources: mechanical_runtime (transcripts, byte counts, trigger reads) + blind agent_review for narrative axes. No human `target_user` observation exists; accordingly this record claims fixture-level behavior only, not product value (consistent with the plan's honesty clause).

## Dimension 4 — reproducibility: PASS

- Frozen protocols, sealed mappings (`b0-mapping.json`, `d-mapping.json` sealed before grading), fixture SHA256 sums, run uuid inventories, grading scripts, and the frozen narrative rubric are all persisted (`F:\MySkill\aql31-lab\inventory\`, repo `docs/experiments/aql-3.1/`).
- Every verdict in this record traces to a named artifact; deviations D-001..D-008 and M-001..M-007 document every departure from the directive with validity impact stated.

## Known limits carried into the release (disclosed, not blocking)

1. All behavioral gates ran on one mid-tier model (`cursor-grok-4.5-high-fast`); MATRIX.md scopes qualification rows to exactly that combination — everything else stays `unverified`.
2. Runner-surface differences (Task vs best-of-n; session catalog cache) are constants-within-comparison but logged (M-002/M-003/M-006).
3. Hook live-attach `NOT_RUN`; gates are fixture-verified only. n=1 per matrix cell family; small effects undetectable (pre-registered power honesty).
4. B1-F1 narrative grade is a harness artifact (M-007); mechanical facts stand.

## Verdict

**ACCEPTED** under formal conjunctive review. All frozen release standards (§6.1–§6.7) are met on raw numbers with caveats disclosed above.

Release authorization boundary: acceptance is not release. This record authorizes release *preparation* (version 3.1.0, changelog, local annotated tag). Pushing the branch/tag to the public remote is an external write and remains with the repository owner.
