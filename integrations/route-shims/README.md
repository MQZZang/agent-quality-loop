# Route Shims

Explicit-only entry routes for `agent-quality-loop`. These packages are **generated** from `routes.json` by `scripts/gen-route-shims.js`; do not hand-edit outputs under `dist/route-shims/`.

## Invocation

```
Codex:       $aql-diagnose <task>
Cursor:      /aql-diagnose <task>
Claude Code: /aql-diagnose <task>
```

Replace `aql-diagnose` with `aql-accept`, `aql-release-check`, or `aql-resume` as needed.

## Host packaging

Generated outputs live under `dist/route-shims/` — **not** under default skill discovery trees (`.cursor/skills`, `.agents/skills`, or top-level `skills/`):

| Host | Dist tree | Install destination | Notes |
|---|---|---|---|
| Cursor / Claude | `dist/route-shims/cursor/<route>/` | `~/.cursor/skills/<route>/` or `~/.claude/skills/<route>/` | Frontmatter includes `disable-model-invocation: true` |
| Codex | `dist/route-shims/agents/<route>/` | `~/.agents/skills/<route>/` | Agent Skills standard frontmatter only |
| Agent Plugins | `dist/route-shims/plugins/<route>/` | (registry packaging) | `agents/openai.yaml` sets `allow_implicit_invocation: false` |

Catalog source of truth: `integrations/route-shims/routes.json`.

Regenerate after catalog changes:

```bash
node scripts/gen-route-shims.js
node scripts/gen-route-shims.js --check
```

Install to user skill trees (also installs compatible `agent-quality-loop` parent):

```bash
node scripts/install.js --suite routes --to all --dry-run
node scripts/install.js --suite routes --to all
```

**Uninstall:** the installer does not remove packages. Delete installed route folders (and optionally `agent-quality-loop`) manually from each destination tree, e.g. `~/.cursor/skills/aql-*` and `~/.agents/skills/aql-*`.
