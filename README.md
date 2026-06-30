# Cursor Agent Workflow

Portable **Cursor rules + skills + knowledge templates** for AI coding agents.

Workflow: **Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA**, plus a separate **Review Gate** for user-driven acceptance review.

## Contents

| Path | Purpose |
|------|---------|
| `AGENTS.md` | Cross-tool entry point for agents |
| `AI_AGENT_WORKFLOW_README.md` | Human-readable workflow guide |
| `.cursor/rules/` | Always-on and description-triggered rules |
| `.cursor/skills/` | Full procedural skills (Cursor) |
| `.agents/skills/` | Mirrored skills (Codex) |
| `.ai/knowledge/` | Generic patterns + per-project templates |

## Install in a Project

### Option A — Copy (recommended)

```bash
# From your target project root
cp -r /path/to/cursor-agent-workflow/.cursor ./
cp -r /path/to/cursor-agent-workflow/.agents ./
cp -r /path/to/cursor-agent-workflow/.ai ./
cp /path/to/cursor-agent-workflow/AGENTS.md ./
cp /path/to/cursor-agent-workflow/AI_AGENT_WORKFLOW_README.md ./
```

Windows (PowerShell):

```powershell
Copy-Item -Recurse f:\cursor-agent-workflow\.cursor .
Copy-Item -Recurse f:\cursor-agent-workflow\.agents .
Copy-Item -Recurse f:\cursor-agent-workflow\.ai .
Copy-Item f:\cursor-agent-workflow\AGENTS.md .
Copy-Item f:\cursor-agent-workflow\AI_AGENT_WORKFLOW_README.md .
```

Then customize:

1. Copy `.ai/knowledge/project-context.template.md` → `.ai/knowledge/project-context.md` and fill in your stack, commands, and architecture.
2. Add verified lessons to `.ai/knowledge/lessons.md` over time.

### Option B — Submodule

```bash
git submodule add git@github.com:YOUR_USER/cursor-agent-workflow.git .cursor-agent-workflow
```

Symlink or copy `.cursor/`, `.ai/`, and entry files into the project root as needed.

## Rules & Skills

| Rule | Skill | Use when |
|------|-------|----------|
| `00-agent-constitution` | — | Every task (always on) |
| `10-ask-plan-code-qa` | `ask-plan-code-qa` | Implement, fix, refactor, debug |
| `20-review-gate` | `review-gate` | Review / 验收 / audit completed work |
| `30-skill-factory` | `skill-factory` | Create or evaluate skills and rules |

## Quick Prompts

| 意图 | Prompt |
|------|--------|
| 小改 | `Follow ask-plan-code-qa 快档` |
| 正常开发 | `Follow ask-plan-code-qa 常档，Pass 时保持对话体` |
| 验收 | `Use review-gate only` |

**Acceptance review:**

```text
Use review-gate only. Do not use Plan Gate or ask-plan-code-qa for acceptance.
```

## Maintenance

When changing workflow config:

- [ ] Each triggered rule (`10`, `20`, `30`) has a matching skill under `.cursor/skills/<name>/`
- [ ] Each skill has `name`, `description`, When to Use, When Not to Use, Failure Modes, Evaluation Cases (≥3)
- [ ] `AGENTS.md` indexes all rules and skills
- [ ] QA templates retain **Passing Evidence** and **Not Verified**
- [ ] Ask / Plan compact-mode boundary consistent across `00`, `10`, skill, and `AI_AGENT_WORKFLOW_README.md`

## License

MIT — see [LICENSE](LICENSE).
