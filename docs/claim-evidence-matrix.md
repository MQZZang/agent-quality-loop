# Claim Evidence Matrix

| Claim | Evidence | Status |
| --- | --- | --- |
| One discoverable product Skill | STATIC | Validated by `scripts/validate-claims.js` after package/mirror synchronization. |
| Snapshot ownership lifecycle | SELF_TEST | `scripts/install.js --self-test` covers ownership, status, update/uninstall dry-run, drift refusal, unowned refusal, and profile preservation. |
| Mirror consistency | STATIC | `scripts/sync-skills.js --check`; the check path is read-only. |
| Task Contract sole truth and Profile v2 projection limits | SPEC + SELF_TEST | Mechanism coverage only; not a user-value result. |
| Capability Receipt source fields | SPEC + SELF_TEST | Mechanical observed-source contract only; no model self-report. |
| Historical Profile Projection v1 mechanism probes | HISTORICAL BLIND_RUNTIME | Historical, scoped evidence only. It does not validate Profile v2. |
| Historical Profile Projection v1 A/B/C value control | HISTORICAL BLIND_RUNTIME | `INVALID`; it must not support AQL 3.0 product claims. |
| AQL 3.0 Profile v2 product screening | BLIND_RUNTIME | `NOT_RUN`; protocol: [aql-3.0-product-screening/1](aql-3.0-product-screening-preregistration.md). |
| AQL 3.0 single-Skill non-inferiority | BLIND_RUNTIME | `NOT_RUN`; protocol: [aql-3.0-product-screening/1](aql-3.0-product-screening-preregistration.md). |
| Longitudinal user value | LONGITUDINAL | `NOT_RUN`. |
| 3.1 hot-path slimming vs missing-referent fabricate | SELF_TEST + PARTIAL BLIND | SKILL.md never-fabricate wording + G2/G3 scripts. Mid-tier p1 live rerun is recorded in the 3.1 execution report; not a product-value proof. |
| 3.1 question/material de-ritualization vs ceremonial checkpoints | SPEC | Prose + evaluation case 19. No claim that users ask fewer questions in the wild. |
| 3.1 observer axis vs agent_review upgraded to user PASS | SELF_TEST | `gates-g1-g3.js` g2-agent-review-pass DENY; `validate-envelope.js` rejects `observer_class: agent_review` on UOR PASS. |
| 3.1 re-anchor vs sausage-slice scope drift | SPEC | Frozen-allowlist comparison is prose; G1 covers formal envelope writes only. |
| 3.1 G1/G2/G3 vs silent scope/observer/decision drift | SELF_TEST | Bidirectional fixtures: false_block 0/7, missed_block 0/8 on the frozen set. Hook live attach `NOT_RUN`. Shell-indirect uncovered. |
| 3.1 standard acceptance vs dimension-bookkeeping ceremony | SPEC | `acceptance-review.md` two-tier. Bare「验收」expectation updated. |
| 3.1 capability qualification matrix vs stale-version inheritance | SPEC + STATIC | `MATRIX.md` binds model (exact) × host × task_class × assurance; unlisted or new versions default `unverified`; 3.1-tree combinations stay `unverified` until their own transcripts land. |
| 3.1 Phase C trigger control | BLIND_RUNTIME **PASS** | Merged 48/48 runs `BORDERLINE` (6/8 + 8/8) → protocol-allowed rev2 description → rerun of failing direction 24/24 triggered (8/8); silence 8/8 stands from rev1. Runner caveat (Task vs best-of-n) disclosed in `docs/experiments/aql-3.1/phase-c-results.md`. |
| 3.1 Phase B0 ablation | BLIND_RUNTIME `NO_LARGE_EFFECT_DETECTED` | 18 cells blind-graded; goal parity B0 vs B2 at n=6; qualitative hard-gate-adjacent differences on F1/F2 favor skill arms; not promoted to product value. `docs/experiments/aql-3.1/phase-b0-results.md`. |
| 3.1 Phase D candidate gate | BLIND_RUNTIME **PASS** | B2 vs B3, 9 families, blind-graded; seven pass conditions PASS on raw numbers; tested tree `9307a60`, final tree `1d72894` spot-verified on hidden fixtures. `docs/experiments/aql-3.1/phase-d-results.md`. |
| Cross-host automatic profile synchronization | N/A | Not claimed. Same-storage portability and explicit export/import only. |

Structural checks, hashes, and receipts prove only their named mechanism. They do not prove acceptance, release authorization, product benefit, or long-term value.
