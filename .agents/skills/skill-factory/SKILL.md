---
name: skill-factory
description: >-
  当用户需要创建、审查、重构、精简或评估 Agent Skill / Cursor Rule /
  prompt template 时使用。
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

## Workflow (Operating Procedure)

1. **Necessity test** — reject one-off skills (see Skill Necessity Test above).
2. **Scaffold** — `.cursor/skills/<name>/SKILL.md` with YAML `name` and `description`.
3. **Body** — all required sections per schema below.
4. **Eval cases** — minimum 3 (happy, ambiguous, boundary/failure).
5. **Rule link** — if description-triggered, add or update `.cursor/rules/*.mdc`.
6. **Sync mirror** — run `./scripts/sync-skills.sh` from repo root (updates `.agents/skills/`).
7. **Review** — run `review-gate` mindset on the draft skill.

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

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Skill created for one-off task | Delete skill; use knowledge file or inline chat |
| Duplicates existing rule/skill | Merge or remove duplicate |
| Schema missing sections | Add per Required SKILL.md Structure above |
| Copied vendor system prompt | Remove; use abstract patterns in prompt-patterns.md |
| Bloated SKILL.md (>500 lines) | Split to reference.md |

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
