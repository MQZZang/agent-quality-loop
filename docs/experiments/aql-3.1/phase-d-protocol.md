# Phase D Candidate-Acceptance Protocol

Protocol: `aql-3.1-phase-d/1`  
Status: `FROZEN` (maintainer-side resumption; commit hash of this file is the freeze evidence)

## Question

Does the final 3.1 candidate (B3) behave at least as well as frozen 3.0 (B2) end-to-end on hard gates, goal correctness, and attention cost?

## Arms (same surface)

| Arm | Skill tree bytes | Surface |
|---|---|---|
| B2 | full `.cursor/skills/agent-quality-loop/` tree at `f0fdb08` | staged in-run tree + frozen forced-mount sentence |
| B3 | full tree at the B3 ref recorded in `d-mapping.json` | identical surface; bytes only differ |

Runner: Cursor Task subagent, model pinned `cursor-grok-4.5-high-fast` (decision #11 lineage from D-001).

Host constant: the session skill catalog line for `agent-quality-loop` is process-cached by the host and visible to every arm equally; both user-level disk installs are moved out during the window, so the only readable AQL bytes are the staged per-run tree. The catalog line is a cross-arm constant and cannot differentially favor an arm.

## Fixtures

F1-F6 (Phase B0 families) + hidden H1-H3 (sealed at `6dc4263`, independence caveat D-007). 9 fixtures x 2 arms = 18 cells, one repeat each in stage 1. Stage 2: families with cross-arm differences get 2 extra repeats each (both arms).

## Hard gates

HG1-HG6 as in `phase-b0-protocol.md`. Any HG in either arm is reported; any HG in B3 that B2 does not show on the same family is a release blocker.

## Measures

- Mechanical: files changed vs sealed baseline SHA, forbidden command attempts (push/publish/deploy/upload), profile-persistence writes, test outcomes where the fixture defines one.
- Narrative (blind): goal correctness and wording-overreach graded from anonymized packets (REPLY + diff summary + commands; skill paths stripped; no arm labels) by a fresh-context subagent against a frozen rubric.
- Attention proxies per cell from transcripts: questions, tool calls, transcript bytes (extract-attention.js), plus assistant checkpoints observed in REPLY.
- Load bytes: mechanical byte count of SKILL.md + always-read references per arm (computed from staged trees, not from prose claims).

## Blinding and sealing

Opaque ids (`D` + 8 hex); `d-mapping.json` sealed by commit before any grading; narrative graders never see arm labels or skill bytes.

## Verdict

The seven pass conditions of `phase-d-status.md` are computed with raw numbers. The maintainer issues the final PASS/FAIL; executor-side numbers are provisional by construction.

## Anti-rules

No post-hoc sample additions to flip a verdict. No fixture edits after sealing. Stage-2 repeats only per the pre-declared rule above.
