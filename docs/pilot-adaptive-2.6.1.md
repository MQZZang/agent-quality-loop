# Adaptive terminal screening pilot — 2.6.1

Status: **SCREENING / descriptive only — not causal proof**.

Six-task scaffold drawn from **this adaptive branch work itself** as screening evidence for terminal selection behavior. Rows describe what happened in the authoring/worktree context; they do **not** prove longitudinal causal value vs baseline.

Do not cite this file as PASS for host probes. Do not claim ACCEPTED from same-context self-review.

---

## Screening targets (checklist — not proven)

- [ ] fast / standard not auto-upgraded to formal
- [ ] accept does not auto-enter release
- [ ] formal does not lower independence
- [ ] user need not learn RAW / BUILT / ACCEPTED vocabulary to get a correct stop
- [ ] ceremony proportional to chosen terminal

---

## Task table

| task id | class | user expected terminal | system chosen terminal | correct Y/N | user corrections | conclusive questions | time-to-result | ceremony lines | verify cmds | rework | user accepted Y/N | notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F1 | fast | BUILT | BUILT (descriptive) | Y (descriptive) | 0 | 0 | short (docs/skill typo-style edit) | minimal; no acceptor | local edit + read-back | none | Y (authoring) | Typo / UTF-8 punctuation fix style task on adaptive branch docs/skills. Expectation: stop at BUILT; no accept/release ceremony. **Screening only.** |
| F2 | fast | BUILT | BUILT (descriptive) | Y (descriptive) | 0 | 0 | short (Boundary line tweak) | minimal | local edit + `git diff --check` style | none | Y (authoring) | Docs Boundary / terminal wording tweak. Expectation: BUILT; no formal upgrade. **Screening only.** |
| S1 | standard | BUILT | BUILT (descriptive) | Y (descriptive) | 0 | low (disambiguation in docs) | medium | docs-level; no live accept | skill text review | none | Y (authoring) | Personalization「验收」disambiguation in docs/skills — clarification of accept vs release language. Expectation: BUILT (docs), not ACCEPTED. **Screening only.** |
| S2 | standard | BUILT | BUILT (descriptive) | Y (descriptive) | 0 | 0 | medium | eval authoring only | cases 66–73 + claim-count consistency checks | none | Y (authoring) | Evaluation cases 66–73 added for terminal selection. Expectation: BUILT artifacts; not a live host ACCEPTED run. **Screening only.** |
| R1 | formal | ACCEPTED | PENDING / NOT_RUN | n/a | — | — | — | would require **independent** fresh acceptor | — | — | N / pending | True ACCEPTED for this adaptive change needs a fresh independent acceptor. **This authoring context cannot self-ACCEPTED.** Status: **PENDING / NOT_RUN**. |
| R2 | formal | RELEASE_READY (preflight) | NOT_RUN | n/a | — | — | — | preflight-only; no publish | release-immutability / releasability checklist | — | N / pending | Release immutability / release-ready check for a **future** tag. **NOT_RUN**; preflight-only note — see `docs/immutable-release-policy.md`. No external publish. |

---

## Interpretation rules

1. F1–S2 are **descriptive** screening rows from real adaptive-branch work, not matched-pair causal evidence.
2. R1–R2 remain **NOT_RUN** for true formal terminals; do not backfill PASS from static text.
3. Overall pilot status stays **SCREENING** until a registered longitudinal design with baseline/treatment pairs is executed (see also `docs/longitudinal-pilot-2.6.1.md`).
