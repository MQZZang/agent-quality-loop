# Phase C results

Protocol: `aql-3.1-phase-c/1` freeze commit `c4cee5b3079331dcada166d328dfbb454cfd4bb0`  
Intended runner: `codex exec` — `EXECUTION_BLOCKED` (D-001)  
Actual runner: Cursor Task `cursor-grok-4.5-high-fast`  
Mechanical trigger: raw transcript contains `agent-quality-loop/SKILL.md` (any slash style)

Official suite verdict: **`INCOMPLETE`**  
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

## Artifacts

- Runs: `inventory/phase-c-runs.json`
- Grade: `inventory/phase-c-grade.json`
- Transcript SHA256: `inventory/transcript-SHA256SUMS`
- Raw jsonl (host-owned, not copied into the repo): `C:\Users\MSI\.cursor\projects\f-MySkill\agent-transcripts\fce7130a-63ed-441c-9799-fa9e8dc002d0\subagents\<uuid>.jsonl`
