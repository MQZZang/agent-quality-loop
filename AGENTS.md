# AI Agents — Project Entry

Cross-tool compatibility pointer for Cursor and other coding agents working in a repository that installs this workflow.

## Read First

1. **`.cursor/rules/00-agent-constitution.mdc`** — always-on behavior baseline (`alwaysApply: true`).
2. **`.ai/knowledge/project-context.md`** — project facts; treat **Not Verified** items as non-facts until confirmed.
3. **`.ai/knowledge/lessons.md`** — verified past lessons.

For reusable phase prompts and risk-based workflow modes, see **`AI_AGENT_WORKFLOW_README.md`**.

**Description-triggered rules may not auto-load.** At task start, **read the matching rule and skill files explicitly** (do not rely on implicit injection alone):

### Cursor

| Task type | Read |
|-----------|------|
| Implement / fix / refactor / debug / multi-file change / project automation | `.cursor/rules/10-ask-plan-code-qa.mdc` + `.cursor/skills/ask-plan-code-qa/SKILL.md` |
| Review / inspect / audit / validate / **acceptance review** / hallucination / risk / omission check | `.cursor/rules/20-review-gate.mdc` + `.cursor/skills/review-gate/SKILL.md` |
| Create / evaluate / refactor skill, rule, or prompt template | `.cursor/rules/30-skill-factory.mdc` + `.cursor/skills/skill-factory/SKILL.md` |

### Codex

| Task type | Read |
|-----------|------|
| Implement / fix / refactor / debug / multi-file change / project automation | `.agents/skills/ask-plan-code-qa/SKILL.md` (+ `.cursor/rules/10-ask-plan-code-qa.mdc` for contract summary) |
| Review / inspect / audit / validate / **acceptance review** / hallucination / risk / omission check | `.agents/skills/review-gate/SKILL.md` (+ `.cursor/rules/20-review-gate.mdc` for contract summary) |
| Create / evaluate / refactor skill, rule, or prompt template | `.agents/skills/skill-factory/SKILL.md` (+ `.cursor/rules/30-skill-factory.mdc` for contract summary) |

**Do not rely on Codex reading `.cursor/skills/`** — use `.agents/skills/` as the Codex skill source. Rules remain under `.cursor/rules/`.

## Skill Paths (Cursor ↔ Codex)

| Tool | Skills location |
|------|-----------------|
| **Cursor** | `.cursor/skills/<name>/SKILL.md` |
| **Codex** | `.agents/skills/<name>/SKILL.md` |

When you change a skill, **sync both paths** so semantics stay identical. Cursor rules (`.cursor/rules/*.mdc`) are shared; only skill procedure files are mirrored.

## Instruction Priority / Conflict Handling

1. **User's explicit instruction this turn** takes highest priority.
2. **This repo's `AGENTS.md`, `.cursor/rules/`, and skills** (`.cursor/skills/` for Cursor, `.agents/skills/` for Codex) are the in-repo workflow baseline.
3. **External user-level skills** (e.g. global `superpowers-*` skills) — if they conflict with this repo's workflow, follow the user's explicit instruction and this `AGENTS.md` unless the user explicitly asks to use the external skill; then **state how it differs** from the repo workflow.
4. When unsure which workflow applies, ask before implementing.

## 10 vs 20 — QA vs Acceptance

| Workflow | Use for |
|----------|---------|
| **`10` / `ask-plan-code-qa`** | Implement, fix, refactor, debug, multi-file work; after Code → **implementation self-QA reporting** (agent reports its own verification) |
| **`20` / `review-gate`** | User asks to **review / 验收 / inspect**; **acceptance review** of completed work, plans, code, or **existing QA reports**; risk / hallucination / omission checks |

If the user says **「帮我验收」** or **「review this」** → **`20`**, not `10`. If the user says **「fix / implement / debug」** → **`10`**, then self-QA via `10`'s template when done.

**`ask-plan-code-qa` flow:** Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA. Details: `AI_AGENT_WORKFLOW_README.md`; skills at `.cursor/skills/` (Cursor) or `.agents/skills/` (Codex).

## Core Expectations

| Principle | Requirement |
|-----------|-------------|
| Read before edit | Open target files and related code before modifying |
| Plan before multi-step work | Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Self-QA (see `ask-plan-code-qa`) |
| Contract changes | Grep/search references when changing APIs, types, paths, components, configs, schemas |
| Finish with self-QA | After implement/fix, use `10`'s **implementation self-QA** template — not user acceptance review |
| Honesty | No "fixed/done/passing/verified" in Summary without Passing Evidence |
| Project context | Cite only **Verified** facts from `project-context.md`; never treat **Not Verified** as fact |
| Prompt hygiene | Do not copy leaked or proprietary system prompt text |

## Workflows (Skills)

| Skill | Use when |
|-------|----------|
| `ask-plan-code-qa` | Implement, fix, refactor, debug, multi-file work; post-implement **self-QA reporting** |
| `review-gate` | **Acceptance review**; review plans, code, existing QA reports; risks, gaps, hallucination checks |
| `skill-factory` | Create or evaluate skills, rules, templates |

## Pause — Confirm With User

Stop and ask before:

- Destructive operations (force push, hard reset, mass delete)
- Production deploy or live data mutation
- Secrets, credentials, payments, billing

## Knowledge

- **Patterns:** `.ai/knowledge/prompt-patterns.md` — generic agent design patterns only.
- **Context:** `.ai/knowledge/project-context.md` — stack, commands, architecture; see **Not Verified** section before citing.
- **Lessons:** `.ai/knowledge/lessons.md` — propose entries after verified work; write only when user confirms or asks.

## Rules Index

| Rule | Apply | Trigger |
|------|-------|---------|
| `00-agent-constitution` | **always** | Every task |
| `10-ask-plan-code-qa` | on-request / description-triggered | Implement / fix / refactor / debug / multi-file / automation |
| `20-review-gate` | on-request / description-triggered | Review / inspect / audit / validate / acceptance / risk / hallucination / omission |
| `30-skill-factory` | on-request / description-triggered | New or refactored skill / rule / template |

## AI Workflow Maintenance Checklist

When changing agent workflow config, verify:

- [ ] Each triggered rule (`10`, `20`, `30`) has matching skills under **both** `.cursor/skills/<name>/` and `.agents/skills/<name>/` (keep in sync)
- [ ] Each skill has `name`, `description`, When to Use, When Not to Use, Failure Modes, Evaluation Cases (≥3)
- [ ] `AGENTS.md` indexes all rules and skills (Cursor + Codex paths)
- [ ] QA templates retain **Passing Evidence** and **Not Verified**
- [ ] No leaked or proprietary system prompt text copied into rules/skills/knowledge
- [ ] Ask / Plan gates and compact-mode boundary consistent across `00`, `10`, skill, and `AI_AGENT_WORKFLOW_README.md`
