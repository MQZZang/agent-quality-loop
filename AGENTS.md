# Agent Quality Loop

This repository packages one public workflow entry and two bounded adapters for Cursor, Codex, and compatible coding agents.

## Canonical Architecture

| Component | Responsibility | Maximum authority/result |
|---|---|---|
| `agent-quality-loop` | Compile intent, assurance, scope, evidence, lifecycle, and authority; route domain work; own acceptance/release state | Only component that may map to `ACCEPTED` or release phases |
| `ask-plan-code-qa` | Code inspect/plan/implement/self-QA adapter | `local_write`, result at most `BUILT` |
| `review-gate` | Read-only independent review adapter | Findings/verdict only; never repairs or grants authority |
| `skill-factory` | Explicit workflow-maintenance helper | Skill/rule authoring only |

`agent-quality-loop` is the single default entry. The other skills are explicit compatibility entry points or embedded adapters. Do not run parallel lifecycle templates.

Optional explicit route packages (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) are generated under `dist/route-shims/` and installed only via `--suite routes` (with the compatible `agent-quality-loop` parent). **Uninstall manually** by deleting installed folders. `aql-accept` does not by itself create independence on every host. Codex uses `$aql-…`; Cursor/Claude use `/aql-…`.

Local envelope cache writes go through packaged `scripts/aql-envelope.js` (invoke via `SKILL_ROOT` when installed); `.agent-quality-loop/` is optional.

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

For the bundled installer, see [README.md](README.md#installer-one-command-any-os); optional machine-decidable hook predicates are in [integrations/cursor-hooks](integrations/cursor-hooks/README.md).

| Tool | Skill source |
|---|---|
| Cursor | `.cursor/skills/<name>/SKILL.md` |
| Codex | `.agents/skills/<name>/SKILL.md` |
| Claude Code and other SKILL.md hosts | installed snapshot of `.agents/skills/<name>` (`node scripts/install.js --to claude`, or copy into the host's skills directory) |
| Agent Plugins clients | `skills/<name>/SKILL.md` (generated) with root `plugin.json` as the manifest; point the client's plugin locations at a repository clone |

The adjacent skill `manifest.json` is the version/distribution source of truth. Edit `.cursor/skills/` only, then run `node scripts/sync-skills.js` to regenerate both mirrors (`.agents/skills/` and top-level `skills/`). Never hand-edit either generated mirror; `scripts/sync-skills.sh` is deprecated compatibility only.

The public installer makes portable real-file snapshots and refuses to replace an existing junction. A repository maintainer may manually map user Cursor skills to `.cursor/skills/<name>` with a live junction; Codex maintenance uses snapshots from generated `.agents/skills/<name>`. Optional Cursor hooks live in `integrations/cursor-hooks/` and never establish semantic acceptance.

Cursor routing summaries live in `.cursor/rules/`:

- `00-agent-constitution.mdc`: always-on minimal invariants
- `05-agent-quality-loop.mdc`: public workflow router
- `10-ask-plan-code-qa.mdc`: explicit/embedded implementation adapter
- `20-review-gate.mdc`: explicit/embedded review adapter
- `30-skill-factory.mdc`: workflow authoring helper

## Non-Negotiable Boundaries

- Package non-negotiables: Style never escalates authority; No completion claim without evidence; Accepted is not released.
- Translate requests into a user-observable goal, scope allowlist, preserved non-goals, and falsifiable success evidence.
- Read before editing; prefer the smallest root-cause change; do not refactor unrelated surfaces.
- Keep intent, assurance, and action authority independent. More rigor never grants more permission.
- `align`, `evidence`, and `accept` are read-only. `execute` and `full` are at most local-write. `full` never publishes or deploys.
- External writes, destructive actions, deploys, uploads, and publication require a separate explicit current-turn release request with exact target, effects, role, rollback, checks, and side-effect-path evidence.
- Treat dry-run as scoped simulation only after every reachable side-effect path is inspected and proven short-circuited.
- Implementation self-QA may report `BUILT`; only a fresh-context acceptor with separation evidence, reading raw evidence first, may grant formal acceptance — a different role alone does not qualify.
- `ACCEPTED`, `RELEASE_READY`, `DEPLOYED`, and `PRODUCTION_VERIFIED` are different states.
- Stop/scope/revoke invalidates external authority. Incomplete resume remains read-only and cannot authorize implementation.
- Never copy leaked/proprietary system prompts, secrets, tokens, private keys, or machine-local configuration into this repository.

## Project Knowledge

If installed into a project, read these when present:

1. The target project's `AGENTS.md` and scoped instructions.
2. `.ai/knowledge/project-context.md`; treat `Not Verified` as unknown.
3. `.ai/knowledge/collaboration-profile.md`; explicit current-turn user instructions still win. ALIGN applies matching **active** phrase-lexicon and preference defaults; To Confirm candidates are not applied. Missing-profile bootstrap writes candidates only. User-level knowledge is explicit opt-in. RETRO may sediment 0–2 observed candidates per the skill's personalization reference; learned preferences never raise authority.
4. `.ai/knowledge/lessons.md`; cite only verified/active lessons. ALIGN injects matching active lessons; ACCEPT checks recidivism. At `project` + local write, write verified lessons and disclose the diff; global/read-only yields candidates for confirmation.

Project facts belong in knowledge files, not in the generic skills.

After ACCEPT (or a FAIL/BLOCKED stop), a lightweight RETRO may harvest 0–3 lesson candidates; RETRO is not a lifecycle phase.

Goal compile and consumer probe:
- Compile goals from the final consumer + medium.
- Any native-medium-consumable artifact (code uses behavior replay as its probe) needs acceptor cold consumption before `user_observable_result` can PASS; else honest `NOT_RUN`.
- Blind consumer only when (`assurance: formal` or experiential: docs/UI/game-design/narrative) and the host supports subagents; otherwise the acceptor cold-consumes before reading the implementer narrative.
- Subagent outputs are evidence, not acceptance; without host subagents, degrade honestly (acceptor cold-consumes; skip blind/divergence probes).

ALIGN and contradiction:
- On `formal` or high-ambiguity creative work, wait for explicit ALIGN OK; disclose contradictions rather than silently resolving them.
- Formal/high-ambiguity ALIGN needs observable success/counterexample forms; decision-changing counterexamples must be observed before PASS.
- Mismatched lessons are not injected.

Review, repair, and path:
- Review findings use severity (`blocker`/`warning`/`advisory`); source-align outranks probe consensus.
- Required corrections need an observable repair delta.
- In-scope route switches disclose a Path change.
- QA checks ruler integrity.
- Same-shape thrash ≥2 yields an unlock pack.

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
2. Run `node scripts/sync-skills.js` (mutating: regenerates the `.agents/skills/` and `skills/` mirrors and every package manifest).
3. Run the Agent Quality Loop validator from its actual skill root:

   ```bash
   node .cursor/skills/agent-quality-loop/scripts/validate-skill.js
   ```

4. Run `node scripts/validate-workflow.js` when present.
5. Inspect `git diff --check` and the exact changed-file allowlist.
6. Forward-test at least: a normal local fix, independent acceptance, and `full + publish` boundary.
7. Use a fresh-context independent reviewer with separation evidence before declaring formal acceptance; a different role alone does not qualify.

Production/external actions remain human-controlled even when all local checks pass.
