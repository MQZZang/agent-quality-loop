# AI Agents — Project Entry

Cross-tool compatibility pointer for Cursor and other coding agents working in a repository that installs AI Agent Collaboration Assistant.

## Read First

1. **`.cursor/rules/00-agent-constitution.mdc`** — always-on behavior baseline (`alwaysApply: true`).
2. **`.ai/knowledge/project-context.md`** — project facts; treat **Not Verified** items as non-facts until confirmed.
3. **`.ai/knowledge/lessons.md`** — verified past lessons.

For reusable phase prompts, risk dial (快/常/慎), and output discipline, see **`docs/guide.md`**.

**Quick Route (daily):** 小改 → `快档` · 正常开发 → `常档`（Pass 对话体）· 高风险 → 常档 + `review-gate` · 只验收 → `review-gate only`.

**Description-triggered rules may not auto-load.** At task start, **read the matching rule and skill files explicitly** (do not rely on implicit injection alone):

### Cursor

| Task type | Read |
|-----------|------|
| Implement / fix / refactor / debug / multi-file change / project automation | `.cursor/rules/10-ask-plan-code-qa.mdc` + `.cursor/skills/ask-plan-code-qa/SKILL.md` (+ `examples.md` for output style) |
| Review / inspect / audit / validate / **acceptance review** / hallucination / risk / omission check | `.cursor/rules/20-review-gate.mdc` + `.cursor/skills/review-gate/SKILL.md` |
| Create / evaluate / refactor skill, rule, or prompt template | `.cursor/rules/30-skill-factory.mdc` + `.cursor/skills/skill-factory/SKILL.md` |

### Codex

| Task type | Read |
|-----------|------|
| Implement / fix / refactor / debug / multi-file change / project automation | `.agents/skills/ask-plan-code-qa/SKILL.md` (+ `examples.md`; + `.cursor/rules/10-ask-plan-code-qa.mdc` for contract summary) |
| Review / inspect / audit / validate / **acceptance review** / hallucination / risk / omission check | `.agents/skills/review-gate/SKILL.md` (+ `.cursor/rules/20-review-gate.mdc` for contract summary) |
| Create / evaluate / refactor skill, rule, or prompt template | `.agents/skills/skill-factory/SKILL.md` (+ `.cursor/rules/30-skill-factory.mdc` for contract summary) |

**Do not rely on Codex reading `.cursor/skills/`** — use `.agents/skills/` as the Codex skill source. Rules remain under `.cursor/rules/`.

## Skill Paths (Cursor ↔ Codex)

| Tool | Skills location |
|------|-----------------|
| **Cursor** | `.cursor/skills/<name>/SKILL.md` |
| **Codex** | `.agents/skills/<name>/SKILL.md` |

When you change a skill, edit **`.cursor/skills/` only** — never edit `.agents/skills/` directly — then run `./scripts/sync-skills.sh` from repo root to update the Codex mirror. Cursor rules (`.cursor/rules/*.mdc`) are shared; only skill procedure files are mirrored.

## Instruction Priority / Conflict Handling

1. **User's explicit instruction this turn** takes highest priority.
2. **This repo's `AGENTS.md`, `.cursor/rules/`, and skills** (`.cursor/skills/` for Cursor, `.agents/skills/` for Codex) are the in-repo workflow baseline.
3. **External user-level skills** (e.g. global `superpowers-*` skills) — **prefer disabling Superpowers** when this repo is installed (workflow conflict; see `docs/guide.md` § Superpowers). If both are active, follow the user's explicit instruction and this `AGENTS.md` unless the user explicitly asks to use the external skill; then **state how it differs** from the repo workflow.
4. **Windows popup fix:** If Superpowers stays enabled and new chats show “open session-start”, run `scripts/fix-superpowers-windows.ps1` once and restart Cursor.
5. When unsure which workflow applies, ask before implementing.

## 10 vs 20 — QA vs Acceptance

| Workflow | Use for |
|----------|---------|
| **`10` / `ask-plan-code-qa`** | Implement, fix, refactor, debug, multi-file work; after Code → **implementation self-QA reporting** (agent reports its own verification) |
| **`20` / `review-gate`** | User asks to **review / 验收 / inspect**; **acceptance review** of completed work, plans, code, or **existing QA reports**; risk / hallucination / omission checks |

If the user says **「帮我验收」** or **「review this」** → **`20`**, not `10`. If the user says **「fix / implement / debug」** → **`10`**, then self-QA via `10`'s template when done.

**`ask-plan-code-qa`:** Thinking workflow in four stages — **对齐 Align → 规划 Plan → 执行 Execute → 验收 Review** (internal Ask → Gate → Inspect → Plan → Gate → Code → Self-QA). Align one **Unified Goal** with the user before building; resolve your own doubts (穷尽求解) and escalate only genuine blockers; deliver a result-oriented outcome (no half-product). **User-facing output** defaults to conversational prose on Pass (see Output Discipline + `examples.md`). Risk dial: 快 / 常 / 慎. Details: `docs/guide.md`.

## Core Expectations

| Principle | Requirement |
|-----------|-------------|
| Align goal first | Co-build and confirm one **Unified Goal** before building; never execute a misaligned goal |
| Read before edit | Open target files and related code before modifying |
| Plan before multi-step work | 常/慎: internal plan (path + boundary + acceptance & QA standards) + gates; user sees prose on Pass unless ambiguous or high-risk (see `ask-plan-code-qa`) |
| Output discipline | Default colleague-style prose; structured headers only for ambiguity, blocked, or material risk |
| Resolve own doubts | **Doubt Resolution（穷尽求解）** first; escalate only genuine, self-verified blockers — not mechanical or hallucinated asks |
| Contract changes | Grep/search references when changing APIs, types, paths, components, configs, schemas |
| Finish with self-QA | After implement/fix, use `10`'s **implementation self-QA** template (judge against the original goal) — not user acceptance review |
| Result-oriented | Deliver a real root-cause result; no half-product, no over-engineering (奥卡姆/Occam) |
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
- **Collaboration profile:** `.ai/knowledge/collaboration-profile.md` — the user's stable collaboration preferences (output density, question threshold, risk tolerance, quality bar, decision habits); read at **对齐 Align**, apply as defaults, populate incrementally (propose-on-confirm).
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
- [ ] Run `./scripts/sync-skills.sh` after editing `.cursor/skills/`
- [ ] Four-stage model (对齐/规划/执行/验收), goal-first alignment, Doubt Resolution (穷尽求解), collaboration-profile (L2), Ask / Plan gates, **快/常/慎** risk dial, and output discipline consistent across `00`, `10`, skill, `examples.md`, and `docs/guide.md`
