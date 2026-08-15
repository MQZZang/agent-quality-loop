# Agent Quality Loop Guide

## First-Principles Goal

The workflow exists to produce the user's observable outcome with the smallest sufficient scope, evidence, and authority. It is not a ritual checklist and does not require users to learn lifecycle YAML.

For installation, use the [installer entry](../README.md#installer-one-command-any-os): the bundled Node installer makes portable real-file snapshots into the Codex, Cursor, and Claude Code user trees and refuses existing junctions. Repository maintainers may manually keep Cursor live through a junction to `.cursor/skills/<name>`; Codex maintenance installs from generated `.agents/skills/<name>` snapshots. Optional deterministic predicates are documented in [Cursor hooks](../integrations/cursor-hooks/README.md), and never constitute semantic acceptance.

## Architecture

```text
Natural-language request
        ↓
agent-quality-loop
  ├─ align/evidence
  ├─ execute → ask-plan-code-qa adapter → BUILT receipt
  ├─ write   → writing collaboration adapter → BUILT receipt
  ├─ accept  → review-gate adapter → independent verdict
  └─ release → read-only preflight → separately authorized action
```

`agent-quality-loop` owns the goal, scope, evidence hierarchy, assurance, lifecycle, and authority. Adapters consume that contract and return bounded receipts; they do not create a second workflow.

## Three Independent Axes

| Axis | Values | Question answered |
|---|---|---|
| Intent | align / diagnose / implement / accept / release / resume | What outcome is requested? |
| Assurance | fast / standard / formal | How much evidence is proportionate? |
| Authority | read / local write / explicit external action | What side effects are allowed now? |

Formal assurance never raises authority. Credentials being available never grant permission.

## Three invariants

- Style never escalates authority — rigor and polish do not raise `action_authority`.
- No completion claim without evidence — pass/done requires firsthand evidence this turn.
- Accepted is not released — `ACCEPTED` is not deploy permission.

The parent workflow starts with exactly one adaptive user result summary. Routine implementation success is normally 1–3 natural-language lines: conclusion plus the decisive self-QA evidence, with no empty headings. Formal acceptance, failure, blocking, pending evidence, handoff/resume, and release expand enough to show phase/verdict, user impact, missing evidence, required action, completion standard, and exact dirty artifact identity when relevant. Adapters return receipts only and never add a second status summary.

For routine tasks, the workflow starts from the prefilled presets in the skill's `references/contract-presets.md` (data, not new modes) to keep ALIGN short — this is automatic; there is nothing for the user to open or fill.

## Lifecycle

```text
RAW → ALIGNED → EVIDENCED → BUILT → ACCEPTED
                                      ↓
                               RELEASE_READY
                                      ↓
                                  DEPLOYED
                                      ↓
                           PRODUCTION_VERIFIED
```

- Diagnosis may end at `EVIDENCED`.
- Implementation self-QA ends at `BUILT`.
- Formal acceptance requires a fresh-context reviewer with separation evidence reading raw evidence first.
- After ACCEPT (including FAIL) or a FAIL/BLOCKED stop, a lightweight RETRO may harvest at most 3 total candidates across lessons and the profile (at most 2 profile candidates); not a new phase.
- `RELEASE_READY` is not deployment permission.
- After deployment, active release authority is cleared; only historical evidence remains.

## User Experience

The default output is plain language:

1. Result or current blocker.
2. Scope changed and preserved surfaces.
3. Decision-changing evidence.
4. Required checks not run.
5. Smallest next action.

Internal phase/envelope details appear only for blockers, handoffs, resume, release, audit, or an explicit request.

Ask at most two questions, and only when the answer changes the outcome or authority and cannot be discovered safely from context.

Compile `target_user_or_system` as the final consumer + medium.

Personalization:
- ALIGN reads `.ai/knowledge/collaboration-profile.md` when present. Experimental Profile Projection v1 selects at most two complete, matching `active` entries as Guided defaults in the existing Task Contract; the current turn's explicit instruction removes conflicts before selection, and learned preferences never raise authority or lower evidence/acceptance floors.
- Copying `.ai/knowledge/collaboration-profile.template.md` unchanged creates an inert carrier: zero parsed entries, zero projectable defaults, and zero selected profile refs. Project-level opt-in begins only when the user creates a non-empty profile with at least one complete, valid `status: active` entry.
- Profile Projection is ephemeral: no persistent User Lens, second contract, profile score, or ranker. Exact applied entries are traced through the existing `injected_refs`; `validate-profile.js` opens canonical carrier paths and binds refs/hashes to exact entry bytes. Raw caller Markdown is not binding evidence, and a missing measured carrier is machine-failing source-binding `NOT_RUN`; semantic scope/condition matching remains agent judgment, not keyword scoring.
- Candidate blocks require a safe `source_ref` and real `observed_at`; rejected options are always project-scoped. Growth Focus requires `capability`, `observable_behavior`, `review_or_expiry`, and either `collaboration_posture` or `agent_support`; optional outcomes are limited to `PILOT`, `PASS`, `FAIL`, and `NOT_RUN`. Historical incomplete Growth Focus blocks remain readable but cannot project.
- Fresh Mode natural-language requests skip project and opted-in user collaboration-profile entries for one task. They do not skip project facts/rules/context, technical lessons, authority, evidence, acceptance, or release boundaries; they do not write/delete the profile or update `last_fired`.
- Missing profile: first-candidate bootstrap may create the file and write **only** under To Confirm; candidates are not standing authority and must not apply the same turn.
- RETRO may sediment observed candidates per the skill's `references/personalization.md` — auto tier disclosed in one line, decision-changing habits confirm-first, permission-like items refused.
- Narrow writing preferences and Growth Focus live in that same file. Structured writing posture, route aliases, rejected options, and Growth Focus are explicit-confirm-only and require a safe confirmation reference; they do not prove growth, trigger coaching, or become acceptance evidence. Outcomes remain separate `PILOT` / `PASS` / `FAIL` / `NOT_RUN` observations derived from existing receipts/evidence, never a hidden reward or second event store.
- User-level knowledge (`~/.ai/knowledge/…`) is explicit opt-in only; never default-read or default-write. When used, the existing Task Contract `assumptions` records a structured current-session opt-in and the runtime validator also requires the explicit opt-in flag.

Envelope cache, refs, and stats:
- Optional local cache under `.agent-quality-loop/` via packaged `aql-envelope.js` when `local_write+` is authorized; consumers invoke through `SKILL_ROOT`. Gitignore is the user's choice. Read-only tasks may leave no local envelope.
- When a lesson, profile, preset, domain profile, probe, or route is actually applied, record it in envelope `injected_refs`. A profile ref names one stable entry id and the canonical hash opened from its Markdown carrier; at most two profile refs apply per task. Absence of the field means measurement unknown, not “nothing injected”; `[]` means measured empty. `harvest_candidates` carries RETRO harvest (max 3 total, max 2 profile/rejected-option candidates).
- `node scripts/aql-stats.js` reports coverage and descriptive associations — **observable and falsifiable, not causally proven**.

Alignment compiler and routes:
- Non-trivial ALIGN follows `references/alignment-compiler.md` inside the existing contract — not a second workflow. External `goal-prompt` is design/eval inspiration only (not vendored, not a runtime dependency).
- Its cognitive layers are observable intent-to-outcome diagnostics, not neuroscience or mind-reading. It compiles only material layers and preserves fixed constraints, guided choices, and open AI strategy with bidirectional source traceability.
- Optional `--suite routes` installs explicit-only shims from `dist/route-shims/` plus the compatible `agent-quality-loop` parent (not in default discovery trees). **Uninstall manually** by deleting installed folders. `aql-accept` does not by itself create independence on every host. Codex: `$aql-diagnose …`; Cursor/Claude: `/aql-diagnose …`. See [route-shims README](../integrations/route-shims/README.md).
- External write hooks: exact `execution_plan` match → host-native **ask** only (never AQL auto-allow). Envelope authorization fields are not current tool consent. See [cursor-hooks README](../integrations/cursor-hooks/README.md).
- Stats: qualified associations require valid ordered snapshots; exposures union the contract timeline; current phase is max `snapshot.sequence`. Observable/falsifiable association, not causal proof.

Consumer probe and multi-agent:
- Any native-medium-consumable artifact (code uses behavior replay as its probe) needs acceptor cold consumption before `user_observable_result` can PASS; else honest `NOT_RUN`.
- Blind consumer only when (`assurance: formal` or experiential: docs/UI/game-design/narrative) and the host supports subagents; otherwise the acceptor cold-consumes before reading the implementer narrative and records the degradation.
- On ambiguity, `formal`, or high-ambiguity creative work, open a divergence probe when the host supports subagents.
- Subagent receipts are evidence, not verdicts.

ALIGN and contradiction:
- `formal` / high-ambiguity creative ALIGN ends with an explicit OK wait; contradictions are disclosed, not silently resolved.
- Formal/high-ambiguity ALIGN also needs who/medium/sees-what `success_observables` and decidable `counterexamples`; decision-changing counterexamples must be run before PASS.
- ALIGN grounds the compile before the freeze: load-bearing referents verified read-only against the environment, external conventions against authoritative sources (source and date recorded), premises contradicted by observation disclosed before any edit — never a fabricated referent. A requested mechanism compiles as outcome + hypothesis; depth per the ladder tiers (fast: touched referents; standard: plus named referents; formal: every conclusion-changing referent).

Review, repair, and path:
- Finding severity (`blocker`/`warning`/`advisory`) binds verdict mapping; source-align outranks probe agreement.
- Repairs need an observable delta.
- In-scope path changes disclose assumption / observation / kept·changed·stopped.
- Same-shape thrash ≥2 surfaces an unlock pack.

## Common Requests

| User says | Expected route |
|---|---|
| `修复这个本地问题，不部署` | standard local execute; ask-plan embedded; stop at BUILT |
| `只诊断根因，不改文件` | read-only evidence; may end at EVIDENCED |
| `修复并独立正式验收，不发布` | safe local full; execute then independent accept; maximum ACCEPTED |
| `独立验收这个改动，不修复` | read-only accept; review-gate embedded |
| `只检查是否可发布，先别发布` | read-only release preflight |
| `full：修复、验收并直接发布` | explain full cap; no publish; produce separate release handoff |
| `停，缩小范围并撤销发布权限` | stop new actions; invalidate external authority; rebuild alignment |
| `继续上次任务` | locate/validate envelope; incomplete reconstruction remains read-only |
| `直接给我成稿，不要教学` | writing adapter, `deliver`, source/truth boundary, stop at BUILT |
| `这次我想练开头` | writing adapter, explicit task-local `coach`, bounded scaffold and usable artifact |

## Semantic Safety

Words such as “删除、去掉、上线、完成、当前、正式” are ambiguous. Choose the narrowest evidenced change class:

- `display_only`: presentation changes; preserve data/capability.
- `data`: stored values/schema; do not imply UI/capability removal.
- `capability`: behavior/availability.
- `rollout/release`: audience exposure or external publication.

Example: “remove the overview marker but keep it in detail” means display-only unless evidence proves otherwise.

## Evidence Discipline

Separate:

```text
source/static
generated artifact/receipt
simulation/mock/dry-run
local runtime
native/device/real environment
deployment fact
human release authority
production verification
```

Tests and hashes are supporting evidence, not automatic proof of the user outcome. Required missing evidence is `BLOCKED` or `NOT_RUN`, never silently ignored.

## External Actions

Release preflight is read-only. An external action requires a new current-turn request naming:

- exact environment/account/project;
- operation and targets;
- expected effects;
- authorizing principal/role;
- rollback procedure;
- manual-check status;
- expiry/drift conditions;
- every reachable side-effect path.

Inspect dry-run implementation path by path. A flag is not proof that initialization, deploy, publish, or remote-call paths are disabled.

## Adapter Boundaries

### writing-collaboration-adapter

- Applies to drafting, revision, editorial, persuasive, factual, interpretive, fictional, and hybrid prose after the parent contract is aligned/evidenced.
- Selects one primary job from nine reader/author outcomes, one of four canonical truth modes, and a separate source-handling strategy; it also declares fixed/guided/open space and a task-local `deliver`, `co-create`, or explicit `coach` posture.
- Host document/presentation skills own file creation, rendering, layout, and format validation; domain profiles own consumer/cold-read acceptance.
- Returns the canonical receipt with `result_phase` at most `BUILT`. One artifact is not longitudinal growth evidence.

### ask-plan-code-qa

- Standalone only when explicitly invoked.
- Embedded by agent-quality-loop for code implementation.
- Reuses parent alignment; no duplicate opening/template.
- A delegated sub-executor receives a self-contained brief carrying the same agreed goal, boundaries, and evidence requirements (the Dispatch Brief, defined in `.cursor/skills/agent-quality-loop/references/code-implementation-adapter.md`, not in ask-plan-code-qa).
- Returns changed artifacts, checks, gaps, risks, and `result_phase: BUILT`.
- Never grants acceptance or release.

### review-gate

- Standalone only when explicitly invoked.
- Embedded by agent-quality-loop for independent acceptance.
- Read-only; reports Review Scope, evidence-backed findings with severity, Verdict, and What Was Checked. QA Review checks ruler integrity against the post-ALIGN frozen contract.
- Does not repair reviewed work or duplicate the parent's lifecycle summary.

## Project-level install

The bundled installer writes user-level skills only. For Cursor project rules, `AGENTS.md`, and knowledge templates, copy these paths into the target project:

- `.cursor/` (rules + skills) — required for Cursor
- `.agents/` (Codex skill mirror) — skip if you only use Cursor
- `AGENTS.md`
- `.ai/knowledge/` — optional; copy the two templates **and rename them**:

| Copy from this repo | Save in your project as | Holds |
|---|---|---|
| `.ai/knowledge/project-context.template.md` | `.ai/knowledge/project-context.md` | Verified facts about your project |
| `.ai/knowledge/collaboration-profile.template.md` | `.ai/knowledge/collaboration-profile.md` | How you prefer an agent to work with you |

If the target already has `.cursor/rules/` or `.cursor/skills/`, copy file by file rather than replacing the directory. Do **not** copy this repository’s `lessons.md`; it is maintenance history from this package, not a starter file for your project. `prompt-patterns.md` is maintainer reference only.

The public installer makes portable real-file snapshots and refuses to replace an existing junction. Repository maintainers may keep Cursor live through a manually managed junction to `.cursor/skills/<name>`; Codex maintenance consumes generated `.agents/skills/<name>` snapshots. These are deployment conventions, not extra installer modes.

Optional local envelope cache (requires `local_write` or higher):

```bash
node scripts/aql-envelope.js --workspace <project-dir> --input envelope.json
```

From an installed skill, invoke the packaged writer via `SKILL_ROOT`, never relative to the project working directory. Whether to gitignore `.agent-quality-loop/` is the consumer’s choice.

### Legacy Codex skill-installer

The bundled installer already covers Codex user-level skills (`--to agents`). This path exists only for people who already use **skill-installer**, a separate tool not shipped here. Ask it to install repository `MQZZang/agent-quality-loop`, ref `master`, from:

```text
.agents/skills/agent-quality-loop
.agents/skills/ask-plan-code-qa
.agents/skills/review-gate
.agents/skills/skill-factory
```

The installer does not overwrite existing skill directories; remove or back up an older installation deliberately first.

## Maintenance

1. Edit `.cursor/skills/` only.
2. Run `node scripts/sync-skills.js` to regenerate both generated mirrors (`.agents/skills/` and `skills/`) (`scripts/sync-skills.sh` is deprecated compatibility only).
3. Run structural validators. Profile Projection changes also run `node .cursor/skills/agent-quality-loop/scripts/validate-profile-projection.js --self-test`; this checks declared fixture mechanics, not semantic matching.
4. Reproduce fresh-context behavior with `node probes/run-profile-projection-smoke.js --self-test`; on a compatible authenticated Codex host run the smoke and addendum commands documented in `docs/profile-projection-v1-experiment.md`.
5. Run `node probes/run-profile-projection-review.js --self-test` and `node probes/verify-profile-projection-evidence.js`. Published behavior evidence must be sanitized, exact-byte bound, and raw-first reviewed. A behavior PASS does not upgrade an invalid A/B/C comparison or prove product value.
6. Forward-test ordinary fix, independent acceptance, and `full + publish` boundary.
7. Obtain an independent review before declaring formal acceptance.

See [AGENTS.md](../AGENTS.md) for repository-level invariants and [README.md](../README.md) for installation.
