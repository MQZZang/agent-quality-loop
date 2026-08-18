# AQL 3.1 execution report

Final state (maintainer acceptance 2026-08-18 evening): **`ACCEPTED`** — see `docs/aql-3.1-acceptance-record.md`. All frozen release gates green on raw numbers: Phase C suite PASS (rev2 8/8 trigger + 8/8 silence), Phase D seven conditions PASS (blind-graded), ablation `NO_LARGE_EFFECT_DETECTED`, load −75.5%, conformance gaps closed (M-004). Release preparation authorized; pushing to the public remote remains with the repository owner.

Executor stage below is retained verbatim for audit. Its stage verdicts, package version, and CHANGELOG wording describe that moment, not the released state.

---

Recommended execution state (executor stage): **`PARTIAL_WITH_BLOCKS`**

Executor self-QA terminal: `BUILT` (`docs/experiments/aql-3.1/formal-envelope.yaml`). Maintainer formal acceptance is separate. This report does not authorize publish, tag, or release.

Codex had no quota. Decision #11 → #9: second runner was Cursor Task. Isolation still failed. Remaining work continued to the allowed terminal. The blocks were subsequently resolved maintainer-side: the best-of-n runner's fresh per-invocation catalog scan provided true isolation for B0 and the Phase C rev2 rerun (M-003/M-006), and constant-background staging unconfounded B1/B2/D on Task (M-002).

## 1. Stage table

| Stage | Result |
|---|---|
| Phase C | Codex blocked. 20 valid independent Task short runs of 48. Official suite **`INCOMPLETE`**. First-repeat snapshot 7/8 trigger / 8/8 silent is not a §6.4 pass. |
| Phase B0 | **`INCONCLUSIVE_EXECUTION_BLOCKED`**. Sentinel `428b20de` listed `agent-quality-loop`. Matrix `NOT_RUN`. |
| Morphology | Decision #5 → keep full Core; implement WP1–WP7. Not `AQL_SIGNAL`. |
| WP1–WP7 | Implemented on `.cursor/skills/agent-quality-loop/`; mirrors synced; package version remains `3.0.0`. |
| Phase D | Hidden fixtures sealed. B2 vs B3 **`NOT_RUN`**. **`EXECUTION_BLOCKED`**. |
| Release | Not authorized. No push, tag, or `release-version.js`. |

Deviations: 8 — [deviations.md](experiments/aql-3.1/deviations.md).

## 2. Experiment artifacts

| Artifact | Location |
|---|---|
| Phase C protocol freeze | commit `c4cee5b3079331dcada166d328dfbb454cfd4bb0` |
| Phase C queries | `docs/experiments/aql-3.1/phase-c-queries.json` |
| Phase C runs / grade / SHA | `docs/experiments/aql-3.1/inventory/` |
| B0 protocol / kernel / F4–F6 | `phase-b0-protocol.md`, `kernel-v0.md`, `fixtures/` |
| Hidden fixtures + SHA | `docs/experiments/aql-3.1/hidden-fixtures/` |
| G1/G2/G3 | `.cursor/skills/agent-quality-loop/scripts/gates-g1-g3.js` |
| Attention extractor | `docs/experiments/aql-3.1/scripts/extract-attention.js` (also `F:\MySkill\aql31-lab\scripts\`) |
| Lab / raw transcripts | `F:\MySkill\aql31-lab\` and host jsonl under `C:\Users\MSI\.cursor\projects\f-MySkill\agent-transcripts\fce7130a-63ed-441c-9799-fa9e8dc002d0\subagents\` |

Sealed B0/D mapping and unsealing: `NOT_RUN` (no matrix cells).

## 3. Phase D seven conditions (self-score, not final)

See [phase-d-status.md](experiments/aql-3.1/phase-d-status.md). Conditions 1–4, 6, and the D instance of 7 are `NOT_RUN`. Condition 5 has a local fixture self-test only (`false_block 0/7`, `missed_block 0/8`).

## 4. Change set

Authoritative edits: `SKILL.md`, `acceptance-review.md`, `contracts.md`, `domain-profiles.md`, `multi-agent-leverage.md`, `evaluation-cases.md`, `validate-envelope.js`, `validate-skill.js`, `gates-g1-g3.js` + fixtures, `CHANGELOG.md`, `claim-evidence-matrix.md`, `README.md`, `MATRIX.md` (append only), `integrations/cursor-hooks/README.md`, `scripts/validate-workflow.js` (allowlist for this experiment's machine-local paths), `docs/experiments/aql-3.1/**`, this report.

`git log` on `aql-3.1-candidate` after the logical commits will list: Phase C freeze `c4cee5b`, then B0 freeze, WP implementation, hidden-fixture freeze, and this delivery commit.

## 5. G1/G2/G3 fixture report

```text
false_block_rate 0/7 missed_block_rate 0/8
```

Uncovered: `g1-shell-indirect` expected `ALLOW` (no path list). Hook live attach: `NOT_RUN` (decision #7).

## 6. Formal envelope

`docs/experiments/aql-3.1/formal-envelope.yaml` — `phase: BUILT`.

## 7–8. Links

- [deviations.md](experiments/aql-3.1/deviations.md)
- [claim-evidence-matrix.md](claim-evidence-matrix.md)
- CHANGELOG `3.1.0 — Unreleased`
- [MATRIX.md](../MATRIX.md) appended rows only

## WP regressions

- Mid-tier missing-key (`df9a4159`, sha `8346aa731794…ad4d`): disclosed no `timeout` in `config.json`, did not add the key. `8839bca2` is invalid (workspace missing).
- Bare「验收」(`ddc6e19b`, sha `225feb3e1917…cead`): result-first blocked accept, no dimension table, no release language.

## Final `validate-all` output (2026-08-18)

```text
PASS skill package structure, links, portability, metadata, and 56 envelope regression cases
PASS single-skill distribution, ownership installer, mirrors, and bundled validator
PASS claim consistency: 21 evaluation cases, 56 envelope regressions, 1 core skills, manifests ok
validate-writing-probes: STRUCTURAL PASS (22 transcripts); independent semantic grades PASS 8 / FAIL 4 / NOT_RUN 10; no
 self-check or transcript count was promoted into a semantic aggregate
validate-all: all steps passed
```

## Claims ceiling

No product-value, longitudinal, Phase C 7/8, B0 signal, or Phase D pass claim is made. Unrun = `NOT_RUN`. Blocked = `EXECUTION_BLOCKED`. Incomplete sample = `INCOMPLETE`.
