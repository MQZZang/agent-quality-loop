# AI Agent Collaboration Assistant

This repository packages one public workflow entry and two bounded adapters for Cursor, Codex, and compatible coding agents.

## Canonical Architecture

| Component | Responsibility | Maximum authority/result |
|---|---|---|
| `agent-quality-loop` | Compile intent, assurance, scope, evidence, lifecycle, and authority; route domain work; own acceptance/release state | Only component that may map to `ACCEPTED` or release phases |
| `ask-plan-code-qa` | Code inspect/plan/implement/self-QA adapter | `local_write`, result at most `BUILT` |
| `review-gate` | Read-only independent review adapter | Findings/verdict only; never repairs or grants authority |
| `skill-factory` | Explicit workflow-maintenance helper | Skill/rule authoring only |

`agent-quality-loop` is the single default entry. The other skills are explicit compatibility entry points or embedded adapters. Do not run parallel lifecycle templates.

Trivial factual Q&A and casual brainstorming do not need this workflow.

## Quick Use

Natural language is enough:

- `修复本地超时，不部署。`
- `只诊断根因，不改文件。`
- `修复并做独立正式验收，不发布。`
- `只检查是否可发布，先不要发布。`

Explicit invocation is optional:

```text
$agent-quality-loop full：修复这个本地问题并独立验收，不发布。
```

Use `$ask-plan-code-qa` or `$review-gate` directly only when deliberately bypassing the public router for compatibility/testing. Direct ask-plan self-QA is not independent acceptance.

## Tool Paths

| Tool | Skill source |
|---|---|
| Cursor | `.cursor/skills/<name>/SKILL.md` |
| Codex | `.agents/skills/<name>/SKILL.md` |

Edit `.cursor/skills/` only, then run `./scripts/sync-skills.sh` to replace the Codex mirror. Never hand-edit `.agents/skills/`.

Cursor routing summaries live in `.cursor/rules/`:

- `00-agent-constitution.mdc`: always-on minimal invariants
- `05-agent-quality-loop.mdc`: public workflow router
- `10-ask-plan-code-qa.mdc`: explicit/embedded implementation adapter
- `20-review-gate.mdc`: explicit/embedded review adapter
- `30-skill-factory.mdc`: workflow authoring helper

## Non-Negotiable Boundaries

- Translate requests into a user-observable goal, scope allowlist, preserved non-goals, and falsifiable success evidence.
- Read before editing; prefer the smallest root-cause change; do not refactor unrelated surfaces.
- Keep intent, assurance, and action authority independent. More rigor never grants more permission.
- `align`, `evidence`, and `accept` are read-only. `execute` and `full` are at most local-write. `full` never publishes or deploys.
- External writes, destructive actions, deploys, uploads, and publication require a separate explicit current-turn release request with exact target, effects, role, rollback, checks, and side-effect-path evidence.
- Treat dry-run as scoped simulation only after every reachable side-effect path is inspected and proven short-circuited.
- Implementation self-QA may report `BUILT`; only a fresh/different-role acceptor reading raw evidence first may grant formal acceptance.
- `ACCEPTED`, `RELEASE_READY`, `DEPLOYED`, and `PRODUCTION_VERIFIED` are different states.
- Stop/scope/revoke invalidates external authority. Incomplete resume remains read-only and cannot authorize implementation.
- Never copy leaked/proprietary system prompts, secrets, tokens, private keys, or machine-local configuration into this repository.

## Project Knowledge

If installed into a project, read these when present:

1. The target project's `AGENTS.md` and scoped instructions.
2. `.ai/knowledge/project-context.md`; treat `Not Verified` as unknown.
3. `.ai/knowledge/collaboration-profile.md`; explicit current-turn user instructions still win.
4. `.ai/knowledge/lessons.md`; cite only verified/active lessons. ALIGN injects matching active lessons; ACCEPT checks recidivism. At `project` + local write, write verified lessons and disclose the diff; global/read-only yields candidates for confirmation.

Project facts belong in knowledge files, not in the generic skills.

After ACCEPT (or a FAIL/BLOCKED stop), a lightweight RETRO may harvest 0–3 lesson candidates; RETRO is not a lifecycle phase. Compile goals from the final consumer + medium; experiential work needs a declared-perspective consumer probe (or honest `NOT_RUN`) before `user_observable_result` can PASS. Subagent outputs are evidence, not acceptance; without host subagents, degrade honestly (acceptor cold-consumes; skip blind/divergence probes). On `formal` or high-ambiguity creative work, wait for explicit ALIGN OK; disclose contradictions rather than silently resolving them.

## Instruction Priority

1. Platform/system safety and the user's explicit current-turn instruction.
2. Target-project scoped instructions and authority boundaries.
3. `agent-quality-loop` lifecycle contract.
4. Selected embedded adapter contract.
5. Generic examples and templates.

When a lower layer conflicts, preserve the higher layer and disclose the conflict.

## Maintenance and Acceptance

After changing workflow files:

1. Edit `.cursor/skills/` and any matching `.cursor/rules/`/human docs.
2. Run `./scripts/sync-skills.sh`.
3. Run the Agent Quality Loop validator from its actual skill root:

   ```bash
   node .cursor/skills/agent-quality-loop/scripts/validate-skill.js
   ```

4. Run `node scripts/validate-workflow.js` when present.
5. Inspect `git diff --check` and the exact changed-file allowlist.
6. Forward-test at least: a normal local fix, independent acceptance, and `full + publish` boundary.
7. Use a fresh/different-role independent reviewer before declaring formal acceptance.

Production/external actions remain human-controlled even when all local checks pass.
