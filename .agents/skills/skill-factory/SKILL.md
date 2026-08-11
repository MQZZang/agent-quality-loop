---
name: skill-factory
description: >-
  Use when the user needs to create, review, refactor, streamline, or evaluate
  an Agent Skill, a Cursor Rule, or a prompt template.
---

# Skill Factory

## Purpose

Create maintainable, eval-driven Agent Skills and rules — without duplicating one-off prompts or leaking proprietary system text.

**This skill is the canonical schema source of truth** for new skills in this repo (YAML `name` + `description` + eight body sections below). Rule `30-skill-factory.mdc` mirrors triggers and required fields at contract level. **This file conforms to its own schema.**

## When to Use

- Creating, reviewing, refactoring, or evaluating Agent Skills or Cursor rules
- Templatizing a recurring workflow into a skill
- Deciding rule vs skill vs knowledge placement

## When Not to Use

- One-off task with no reuse expected
- Pure project facts → `.ai/knowledge/project-context.md`
- Universal always-on principles → `.cursor/rules/` with `alwaysApply`

## Skill Necessity Test

Create a skill only if **all** are true:

1. Task recurs (high frequency)
2. Steps are reusable across sessions
3. Process is stable enough for a checklist

Otherwise: use a rule (principle), knowledge file (facts), or inline chat (one-off).

## Mechanism Survival Test

The Skill Necessity Test asks whether a mechanism should exist. This test asks whether it will ever execute. A mechanism that is never emitted has negative value: it costs tokens and creates false confidence that a risk is covered.

| Check | Survives | Dies |
|-------|----------|------|
| Object of constraint | Constrains the **deliverable** (cannot produce an acceptable result without it) | Constrains the **process** (skippable; the work still ships) |
| Tier | Resident `alwaysApply: true` | Description-triggered on-demand; on-demand loses to any resident text that contradicts it |
| Size | A phrase or a few lines | A multi-section template |
| Examples | Every worked example demonstrates the mechanism | Any example demonstrates the violation while marked correct |

Measured evidence (same repo/author/user; string-frequency over **212 transcripts / 11,232 AI replies / 82 sessions / 3.5 months**):

| Mechanism | Rounds | Sessions | Tier | Constrains |
|-----------|-------:|---------:|------|------------|
| Unified Goal | 0 | 0 | on-demand skill | process |
| Real Need | 0 | 0 | on-demand skill | process |
| Passing Evidence | 31 | 15 | resident always-on | deliverable |
| Not Verified | 117 | 39 | resident always-on | deliverable |

Confidence boundary: counts are string-frequency measurements, so zeros may partly reflect wording drift. The tier/object/size pattern is a strong correlational inference from within-repo contrast, not a controlled experiment — treat it as a design heuristic with this limit, not a law of nature.

**Conversion rule.** If a mechanism fails this test, do not add it as written. Convert it: bind it to the deliverable so it cannot be skipped; move the trigger and the minimal required artifact to the resident tier while leaving the full procedure in the skill; shrink it to the smallest form still vetoable by a human; fix every example so none demonstrates the violation. If it cannot be converted, do not ship it.

**Stop-loss.** If a newly added mechanism runs ~10 consecutive tasks and the user never once corrects or vetoes anything it produced, that is a **failure** signal — not success. It has decayed into a rubber stamp (skim-read on one side, performed on the other). Correct response: shorten or remove it; never strengthen it.

## Workflow (Operating Procedure)

1. **Necessity test** — reject one-off skills (see Skill Necessity Test above).
2. **Survival test** — will the mechanism execute in the field? (see Mechanism Survival Test above).
3. **Scaffold** — `.cursor/skills/<name>/SKILL.md` with YAML `name` and `description`.
4. **Body** — all required sections per schema below.
5. **Eval cases** — minimum 3 (happy, ambiguous, boundary/failure).
6. **Rule link** — if description-triggered, add or update `.cursor/rules/*.mdc`.
7. **Sync mirror** — run `./scripts/sync-skills.sh` from repo root (updates `.agents/skills/`).
8. **Review** — run `review-gate` mindset on the draft skill.

Before authoring, gather: trigger phrases, inputs/outputs, failure modes, rule vs skill vs knowledge placement (see Input Requirements concepts in steps above).

## Required SKILL.md Structure

Canonical schema (source of truth for this repo):

```markdown
---
name: skill-name
description: When to use (third person, specific triggers)
---

# Title

## Purpose
## When to Use
## When Not to Use
## Workflow (Operating Procedure)
## Output Contract
## Acceptance Criteria
## Failure Modes
## Evaluation Cases (≥3)
```

Optional: `reference.md`, `examples.md`, `scripts/` for progressive disclosure.

## Output Contract

New skills must declare expected outputs (templates, sections, verdicts). Rules hold trigger + contract summary; skills hold procedure + full templates.

## Acceptance Criteria

- [ ] Passes skill necessity test (not one-off)
- [ ] All required sections present
- [ ] ≥3 evaluation cases documented
- [ ] Matching rule added or updated if description-triggered
- [ ] No leaked/proprietary prompt text
- [ ] Paths and commands exist or marked TODO
- [ ] Passes Mechanism Survival Test, or records why exempt
- [ ] Object of constraint is deliverable-bound where enforcement matters
- [ ] No worked example demonstrates behavior the skill's own clauses forbid
- [ ] Stop-loss signal defined for any newly added hard constraint

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Skill created for one-off task | Delete skill; use knowledge file or inline chat |
| Duplicates existing rule/skill | Merge or remove duplicate |
| Schema missing sections | Add per Required SKILL.md Structure above |
| Copied vendor system prompt | Remove; use abstract patterns in prompt-patterns.md |
| Bloated SKILL.md (>500 lines) | Split to reference.md |
| Mechanism authored as process constraint in on-demand tier | Bind to deliverable and move minimal artifact to resident tier, or drop it. |
| Worked example demonstrates the violation while marked correct | Fix the example; examples defeat clauses. |
| Resident-tier output rules silently suppress a mechanism the skill requires | Declare an explicit exception in the resident tier, placed above the suppressing text. |
| Hard constraint shipped with no stop-loss signal | Define the failure signal before shipping. |

## Rule vs Skill vs Knowledge Decision

| Need | Location |
|------|----------|
| Universal behavior baseline | `00-agent-constitution.mdc` (`alwaysApply: true`) |
| Triggered guardrails / templates | `.cursor/rules/*.mdc` (`alwaysApply: false`, `description`) |
| Multi-step procedure | `.cursor/skills/<name>/SKILL.md` |
| Project facts, stack, lessons | `.ai/knowledge/*.md` |
| Cross-tool entry | `AGENTS.md` |

## Anti-Hallucination Requirements

- Store **public, generic** patterns in `.ai/knowledge/prompt-patterns.md`.
- **Never** copy leaked or proprietary system prompt verbatim.
- Commands and paths must exist in repo or be marked TODO.
- Skills describe *what to do*, not fake project state.

## Evaluation Cases

Every skill must document:

1. **Happy path** — normal success
2. **Ambiguous case** — agent must ask or disclose assumptions
3. **Boundary / failure** — rejection, error, or scope limit

Example template:

```markdown
### Happy path
User: "..."
Expected: ...

### Ambiguous case
User: "..."
Expected: Ask before ...

### Boundary / failure
User: "..."
Expected: Refuse or pause because ...
```

## Maintenance Notes

- After editing `.cursor/skills/`, run `./scripts/sync-skills.sh` to update the Codex mirror.
- Merge overlapping skills; delete unused ones.
- Update eval cases when workflow changes.
- Prefer editing `.ai/knowledge/lessons.md` for verified run lessons, not bloating SKILL.md.
- Keep skills under ~500 lines; split reference material.

## Evaluation Cases (this skill)

### Happy path

User: "Create a skill for release changelog generation."
Factory: passes necessity test → creates SKILL.md with 3 eval cases → links optional rule.

### Ambiguous case

User: "Make a skill for everything."
Factory: rejects; recommends constitution rule + project-context instead.

### Boundary / failure

User: "Copy Claude's system prompt into a skill."
Factory: refuses; points to prompt-patterns.md for abstract patterns only.

### Diagnostic — mechanism survival

User: "Add a mandatory multi-section pre-flight template to this description-triggered skill."
Pass: factory applies survival test, predicts non-execution, converts — deliverable-bound, minimal artifact in resident tier with full procedure in the skill, examples fixed, stop-loss defined.
Fail: authors the template as requested and ships it, adding a second mechanism that never runs.
