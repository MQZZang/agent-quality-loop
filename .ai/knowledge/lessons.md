# Lessons Learned

Verified, reusable experience from past agent sessions on this project. Not a chat log.

**Default scope of this file:** `project`. Global lessons use the same entry format but live in a deploy-side user-level lessons file (same template); this repo file does not migrate them.

## Rules for This File

1. **Only verified lessons** — observed in repo, tests, or production; not speculation.
2. **No chat fluff** — no greetings, no duplicate narrative from tickets.
3. **No doc duplication** — if it belongs in README or official docs, link there instead.
4. **Update over append** — refine an existing entry rather than adding a near-duplicate.
5. **Write policy (by authority and scope)** — not “propose-only”:
   - **project** scope and agent authority ≥ `local_write` → write the entry here directly and **disclose the diff** (user may revoke/revert).
   - **global** scope, or authority is **read-only** → output a **candidate entry** for confirmation; do not write until confirmed (or until authority/scope allows).
6. **Status and scope on every entry** — each lesson carries `status` (`active` | `merged` | `promoted` | `expired`) and `scope` (`project` | `global`). New writes to this file default to `scope: project` and `status: active`.
7. **Active cap** — prefer ≤ **30** `active` entries. When over the cap, **merge** near-duplicates or **expire** stale ones before adding more; do not grow an unbounded list.
8. **Promotion on recurrence** — if the same lesson recurs ≥ **2** times (same trigger/root cause), promote via **skill-factory** into a rule/skill (or other durable mechanism) change; mark the lesson `promoted` and link the resulting artifact.
9. **Harvest triggers** — RETRO and Self-QA may produce candidates (or direct writes when policy §5 allows). Global candidates follow the same template and cite this format; no migration tooling in this change.

## Feedback Loop (from ask-plan-code-qa QA / RETRO)

After verified implementation work (or RETRO), if a lesson is reusable:

1. Classify **scope** (`project` vs `global`) and check **authority**.
2. If **project** and authority ≥ `local_write`: write (or update) the entry with the template below, keep newest `active` entries near the top of **Lessons**, disclose the diff, and note revocability.
3. If **global** or **read-only**: put a full candidate (template fields) in QA **Next Step** / RETRO output for confirmation; do not treat “propose first” as the only path when §5 allows a direct write.
4. On recurrence ≥ 2, open a skill-factory promotion path instead of only appending another near-duplicate.

## Entry Template

```markdown
### YYYY-MM-DD — Short title

**Trigger:** When / what situation surfaces this lesson
**Root cause:** Why it happened (brief)
**Rule:** What to do differently next time (actionable)
**Evidence:** PR, commit, test, or file path
**Scope:** project | global
**Status:** active | merged | promoted | expired
**Applies when:** Trigger conditions for reuse

<!-- Optional equivalents (may mirror fields above): -->
<!-- **Context:** same role as Trigger / area -->
<!-- **Lesson:** same role as Rule (one paragraph) -->
```

---

## Lessons

<!-- Add entries below. Keep newest active entries near the top of the Lessons section. -->

### 2026-08-10 — Forward-test skill changes across the executor model matrix

**Trigger:** Behavioral forward-testing after changing SKILL/reference text
**Root cause:** A flagship-only probe samples one compliance regime; cheaper executor models are the ones most at risk of mechanical misreads, and single-tier tests miss cross-model routing variance
**Rule:** Run the same blinded probe on at least one flagship + one mid + one budget executor model; compare invariant compliance and note any label/routing variance
**Evidence:** 2026-08-10 tri-model blind probe (flagship/grok/composer) on a contradictory narrative request: all invariants held on all tiers; the align-vs-evidence mode-label variance surfaced only through the matrix
**Scope:** project
**Status:** active
**Applies when:** Forward-testing changes to agent-quality-loop, its adapters, or references before declaring them accepted
