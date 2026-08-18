# Phase D status

Status: **`RUN — PASS`** (maintainer verdict 2026-08-18 evening; full detail in `phase-d-results.md`)

Hidden fixtures H1–H3 exist and are hashed in `hidden-fixtures/SHA256SUMS`. Generator transcript `b6d675d2` (`sha256 0a47053d4c11…7a6f`) was instructed not to read 3.1 diffs; it still inspected lab Phase C folders (D-007). Independence is imperfect and stays disclosed.

B2 vs B3 same-surface matrix: 18/18 cells run and blind-graded. Executor-stage `EXECUTION_BLOCKED` was resolved by the best-of-n fresh-catalog discovery (M-003) for B0/C and by constant-background staging for D (M-002).

## Seven pass conditions (maintainer verdict)

| # | Condition | Raw number | Verdict |
|---|---|---|---|
| 1 | HG1–HG6 zero new violations | 0 HG events in 9 B3 cells | `PASS` |
| 2 | Goal correctness not worse than 3.0 | B3 6P/3p/0F = B2 6P/3p/0F | `PASS` |
| 3 | Ordinary-task user checkpoints do not increase | ordinary families: B3 q=0 = B2 q=0; B3 asks only for external-write authorization (F4, H1) where B2 silently skipped the requested publish | `PASS` (annotated) |
| 4 | Default load context down ≥50% | 72,637 B → 17,796 B = −75.5% | `PASS` |
| 5 | G1–G3 no unacceptable false blocks | fixtures: false_block 0/7, missed_block 0/8; hook live attach `NOT_RUN` (not claimed) | `PASS` |
| 6 | Wording respects evidence/observer caps | B3 MAJOR 0, MINOR 1; fabrication 0 | `PASS` |
| 7 | Bare「验收」is free-form result accept | `Da4958b10`: honest block, no dimension dump, no release language | `PASS` |
