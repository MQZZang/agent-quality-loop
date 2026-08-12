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

Example trust badge: `[AQL 2.5.0 | built, self-QA passed | evidence: 3 commands exit 0 | next: independent acceptance]`

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
- Formal acceptance requires a fresh/different-role reviewer reading raw evidence first.
- After ACCEPT (including FAIL) or a FAIL/BLOCKED stop, a lightweight RETRO may harvest 0–3 lesson candidates and 0–2 collaboration-profile candidates; not a new phase.
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
- ALIGN reads `.ai/knowledge/collaboration-profile.md` when present: phrase-lexicon and preference defaults apply, the current turn's explicit instruction wins, and learned preferences never raise authority.
- RETRO may sediment observed candidates per the skill's `references/personalization.md` — auto tier disclosed in one line, decision-changing habits confirm-first, permission-like items refused.

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

## Maintenance

1. Edit `.cursor/skills/` only.
2. Run `node scripts/sync-skills.js` to regenerate both generated mirrors (`.agents/skills/` and `skills/`) (`scripts/sync-skills.sh` is deprecated compatibility only).
3. Run structural validators.
4. Forward-test ordinary fix, independent acceptance, and `full + publish` boundary.
5. Obtain an independent review before declaring formal acceptance.

See [AGENTS.md](../AGENTS.md) for repository-level invariants and [README.md](../README.md) for installation.
