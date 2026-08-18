# Phase C results

Protocol: `aql-3.1-phase-c/1` freeze commit `c4cee5b3079331dcada166d328dfbb454cfd4bb0`  
Intended runner: `codex exec` — `EXECUTION_BLOCKED` (D-001)  
Actual runner: Cursor Task `cursor-grok-4.5-high-fast`  
Mechanical trigger: raw transcript contains `agent-quality-loop/SKILL.md` (any slash style)

Final suite verdict (after protocol-allowed description revision and rerun): **`PASS`** — should-trigger **8/8** (rev2 rerun), should-not-trigger **8/8** (rev1). Details in the maintainer sections below.

## Executor stage (2026-08-18 daytime): `INCOMPLETE`

Grader: `scripts/grade-phase-c.js` → `should_trigger_pass 0/8`, `should_not_trigger_pass 0/8`, `suite INCOMPLETE` (every query `n < 3`, so no per-query pass).

Do not treat the first-repeat snapshot as a §6.4 7/8 claim.

## Validity

- Valid independent short runs: **20 / 48**
- Batched eight-query r2 `c34c690b` (`sha256 95ed3225b031…d59c`): **INVALID**, not scored
- Several should-trigger runs also opened `F:\MySkill\agent-quality-loop` experiment docs (`saw_aql_repo=true`). Mechanical trigger still counts only `SKILL.md` reads. This inflates trigger confidence; see D-008.

## Valid independent runs

| Query | r1 | r2 | r3 | hits/n | per-query |
|---|---|---|---|---|---|
| C-T1 | TRIGGERED `16257adb` | TRIGGERED `984e78c4` | NOT_RUN | 2/2 | incomplete |
| C-T2 | TRIGGERED `d8e292c3` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T3 | TRIGGERED `3eec566a` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T4 | TRIGGERED `bad564f9` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T5 | TRIGGERED `08136fd6` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T6 | TRIGGERED `43768211` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T7 | TRIGGERED `cc06b398` | NOT_RUN | NOT_RUN | 1/1 | incomplete |
| C-T8 | silent `a4258291` | silent `172e1035` | NOT_RUN | 0/2 | incomplete |
| C-N1 | silent `fa66916a` | silent `c07e012e` | NOT_RUN | 0/2 | incomplete |
| C-N2 | silent `bfb96fe5` | NOT_RUN | NOT_RUN | 0/1 | incomplete |
| C-N3 | silent `9fee20ad` | NOT_RUN | NOT_RUN | 0/1 | incomplete |
| C-N4 | silent `73bfe842` | NOT_RUN | NOT_RUN | 0/1 | incomplete |
| C-N5 | silent `34228cda` | NOT_RUN | NOT_RUN | 0/1 | incomplete |
| C-N6 | silent `2e39d37b` | silent `65c232d9` | NOT_RUN | 0/2 | incomplete |
| C-N7 | silent `e45c9ff1` | NOT_RUN | NOT_RUN | 0/1 | incomplete |
| C-N8 | silent `8790725e` | NOT_RUN | NOT_RUN | 0/1 | incomplete |

First-repeat direction snapshot only (not a suite verdict): should-trigger 7/8, should-not-trigger 8/8. C-T8 did not read `SKILL.md` on either valid repeat.

## Maintainer completion to protocol floor (2026-08-18 evening, M-001)

28 missing independent short runs launched with the same frozen protocol, prompt template, and model (`cursor-grok-4.5-high-fast`, Cursor Task). Merged grade over **48/48 valid runs** (`aql31-lab/inventory/phase-c-grade-merged.json`):

- should-trigger: **6/8** per-query passes (C-T2 1/3, C-T8 0/3 failed the ≥2/3 bar)
- should-not-trigger: **8/8** (0 false triggers in 24/24 runs)
- Suite: **`BORDERLINE`** → protocol grants one description-only revision, then rerun the failing direction.

## Description rev2 and rerun (M-006)

Rev2 description (commit `9307a60`) names the failing cases explicitly: "evidence-only diagnosis of a failing test, build, or behavior" (C-T2) and "when the user asks to remember or store a lasting collaboration preference" (C-T8).

Rerun of the should-trigger direction only (per protocol BORDERLINE rule; silence direction stands, anti-rules forbid adding samples to a passed direction): 8 queries × 3 fresh repeats = 24 runs.

- Runner: `best-of-n-runner` subagent (fresh per-invocation skill-catalog scan — the parent-session catalog cache made Task subagents unable to see rev2; see M-002/M-003). Rev2 tree (`1d72894`) installed at both user-level roots before the rerun; sentinel `88c34158` confirmed discovery.
- Result: **24/24 triggered, 8/8 per-query pass.** Every trigger is an organic `Read` of the user-level `agent-quality-loop\SKILL.md` (verified against tool_use entries; 24/24 hit user-level install paths, not the lab or repo copies).
- Combined suite: should-trigger 8/8 (rev2) + should-not-trigger 8/8 (rev1) → **`PASS`** under §6.4 (≥7/8 bidirectional).

Caveat recorded honestly: the rev2 rerun runs on the best-of-n sub-variant of the Cursor Task runner while rev1 ran on plain Task; the mechanical trigger definition, model, prompt template, and query bytes are identical. The should-not-trigger direction was not re-measured against rev2 wording (protocol forbids post-hoc sample additions); rev2 only narrows and specializes trigger nouns, which cannot widen casual/definition/translation matches.

## Artifacts

- Runs (executor stage): `inventory/phase-c-runs.json`; grade: `inventory/phase-c-grade.json`
- Merged 48-run grade: `F:\MySkill\aql31-lab\inventory\phase-c-grade-merged.json`, runs `phase-c-runs-merged.json`, completion map `phase-c-completion-map.json`
- Rev2 rerun grade: `F:\MySkill\aql31-lab\inventory\phase-c-rev2-grade.json`, map `phase-c-rev2-map.json`
- Transcript SHA256: `inventory/transcript-SHA256SUMS`
- Raw jsonl (host-owned, not copied into the repo): `C:\Users\MSI\.cursor\projects\f-MySkill\agent-transcripts\fce7130a-63ed-441c-9799-fa9e8dc002d0\subagents\<uuid>.jsonl` (executor stage) and `...\38668248-0465-4b10-8412-c00f32119ab5\subagents\<uuid>.jsonl` (maintainer stage)
