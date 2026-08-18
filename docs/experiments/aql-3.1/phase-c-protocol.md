# Phase C Negative-Control Protocol

Protocol: `aql-3.1-phase-c/1`  
Status: `FROZEN`  
Inherited from plan v2 §4 / v1 Phase C (16 bidirectional queries, mechanical trigger, 7/8 suite threshold).

## Frozen runner

| Field | Value |
|---|---|
| Intended runner | `codex exec --ephemeral --sandbox read-only --json` |
| Intended model | `gpt-5.6-sol` |
| Fallback (decision #11) | Cursor Task subagent, model pinned per run receipt |
| Workspace | Isolated lab CWD under `F:\MySkill\aql31-lab\runs\<opaque-id>\` — not the AQL repo |
| Skill visibility | Only `agent-quality-loop` description is discoverable; prompt does not say “read the skill” |

## Mechanical trigger

A run is `TRIGGERED` iff the raw event/transcript stream contains a read or mount of `**/agent-quality-loop/SKILL.md` (any slash style). Model self-report is not a trigger.

## Queries

Frozen bytes: `phase-c-queries.json` (8 should-trigger + 8 near-neighbor should-not-trigger). Each query × 3 fresh repeats = 48 short runs.

## Per-query pass

- Should-trigger query: ≥2/3 triggered
- Should-not-trigger query: ≤1/3 triggered

## Suite verdict

- Bidirectional pass count ≥7/8 each direction → `PASS`
- Either direction = 6/8 → `BORDERLINE` (one description-only revision, then rerun that direction)
- Either direction <6/8 after one description revision, or <7/8 after revision → `TRIGGER_WEAKNESS` (decision #1); B0/D continue with forced mount

## Anti-rules

Do not add samples after seeing results. Do not change query bytes after the freeze commit.
