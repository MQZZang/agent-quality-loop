# Cursor Agent Workflow

Portable **Cursor rules + skills + knowledge templates** for AI coding agents.

**Unified Goal:** amplify the user's outcome through a **shared goal** — not merely avoid mistakes. Four stages: **对齐 → 规划 → 执行 → 验收**. On Pass, default to conversational prose with evidence (思路体). Reliability is the guardrail, not the goal.

**Risk dial:** 快 · 常 · 慎 — see [docs/guide.md](docs/guide.md).

## Quick Route

| 意图 | Prompt |
|------|--------|
| 小改 | `Follow ask-plan-code-qa 快档` |
| 正常开发 | `Follow ask-plan-code-qa 常档，Pass 时保持对话体` |
| 上生产 / 高风险 | 常档 + 完成后 `review-gate 验收` |
| 只验收 | `Use review-gate only` |

Training prompts (T0–T8) and full workflow details → **[docs/guide.md](docs/guide.md)**.

## Contents

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Cross-tool entry point for agents |
| `docs/guide.md` | Human-readable workflow guide + T0–T8 |
| `AI_AGENT_WORKFLOW_README.md` | Redirect stub (backward compatibility) |
| `.cursor/rules/` | Always-on and description-triggered rules |
| `.cursor/skills/` | Full procedural skills (Cursor) |
| `.agents/skills/` | Mirrored skills (Codex) — sync via `scripts/sync-skills.sh` |
| `.ai/knowledge/` | Generic patterns + per-project templates |

## Install in a Project

### Option A — Copy (recommended)

```bash
# From your target project root
cp -r /path/to/cursor-agent-workflow/.cursor ./
cp -r /path/to/cursor-agent-workflow/.agents ./
cp -r /path/to/cursor-agent-workflow/.ai ./
cp -r /path/to/cursor-agent-workflow/docs ./
cp /path/to/cursor-agent-workflow/AGENTS.md ./
cp /path/to/cursor-agent-workflow/AI_AGENT_WORKFLOW_README.md ./
```

Windows (PowerShell):

```powershell
Copy-Item -Recurse f:\cursor-agent-workflow\.cursor .
Copy-Item -Recurse f:\cursor-agent-workflow\.agents .
Copy-Item -Recurse f:\cursor-agent-workflow\.ai .
Copy-Item -Recurse f:\cursor-agent-workflow\docs .
Copy-Item f:\cursor-agent-workflow\AGENTS.md .
Copy-Item f:\cursor-agent-workflow\AI_AGENT_WORKFLOW_README.md .
```

Then customize:

1. Copy `.ai/knowledge/project-context.template.md` → `.ai/knowledge/project-context.md` and fill in stack, commands, and architecture.
2. Add verified lessons to `.ai/knowledge/lessons.md` over time.

### Option B — Submodule

```bash
git submodule add git@github.com:YOUR_USER/cursor-agent-workflow.git .cursor-agent-workflow
```

Symlink or copy `.cursor/`, `.agents/`, `.ai/`, `docs/`, and entry files into the project root as needed.

## Rules & Skills

| Rule | Skill | Use when |
|------|-------|----------|
| `00-agent-constitution` | — | Every task (always on) |
| `10-ask-plan-code-qa` | `ask-plan-code-qa` | Implement, fix, refactor, debug |
| `20-review-gate` | `review-gate` | Review / 验收 / audit completed work |
| `30-skill-factory` | `skill-factory` | Create or evaluate skills and rules |

Read **`examples.md`** under `ask-plan-code-qa` when calibrating output style.

## Maintenance

When changing workflow config:

1. Edit skills under `.cursor/skills/`.
2. Run `./scripts/sync-skills.sh` to update `.agents/skills/`.
3. Verify checklist in `AGENTS.md` (mirrors, four-stage consistency, Passing Evidence / Not Verified).

## License

MIT — see [LICENSE](LICENSE).
