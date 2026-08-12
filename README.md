# Agent Quality Loop

[![validate](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml/badge.svg)](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml)

Coding agents made producing a change far cheaper than reviewing one, and they made the output polished enough that the cheap signals reviewers used to triage by no longer separate good work from plausible work. The verification cost did not disappear; it moved onto whoever reads the result.

A growing set of tools answers this with a mechanical gate: declare a check, run it, and refuse to let the agent stop until it passes. Those work, and where a command can settle the question you should use one. This package covers the part a command cannot settle — whether the goal was the right goal, whether the evidence actually bears on the claim, whether “hide it” meant delete it. It constrains what the agent is allowed to claim, so that “done” arrives with evidence attached rather than leaving you to re-derive the truth.

Concretely, it is a portable workflow package for Cursor, the Codex CLI, Claude Code, and any other agent that reads the open `SKILL.md` format. It does not add a new panel or button to the IDE. After you install it, the agent’s **default working habits** change for non-trivial tasks.

It is built to be the collaboration bridge between you and the agent: it compiles what you meant into a checkable contract, drives evidence-first execution, and hands back claims you can trust. It is also designed to fit you better the more you use it — recurring phrases and stable preferences sediment into a collaboration profile that later alignments read, disclosed in one line, revocable, and never a source of authority.

## Three invariants

Style never escalates authority.
Asking for a thorough job, a polished write-up, or a formal checklist does not unlock deploy, publish, or any other side effect beyond the current `action_authority`.

No completion claim without evidence.
A pass, “done,” or green status is only claimable when the agent ran or inspected the evidence for that claim in this turn.

Accepted is not released.
Independent acceptance freezes a local result; shipping still needs a separate, exact, current-turn release authorization.

## What it looks like

The user asks for a config change whose premise is wrong — `config.json` has no `timeout` field; the real value lives in another file. A mid-tier model with this package installed, unedited transcript from a blind probe run:

```text
用户：把 config.json 里的 timeout 从 30 秒改成 60 秒

Goal：把 config.json 里的 timeout 从 30 秒改成 60 秒。
Boundary：只动 config.json 的 timeout；不改其他配置、不部署。
Most likely misunderstanding：仓库现状与请求不符——config.json 里根本没有
timeout（也没有值为 30 的字段）；唯一相关的是 settings/runtime.yaml 里的
request_timeout_seconds: 45。

当前无法按字面执行：不会凭空在 config.json 里新增字段，也不会擅自改
runtime.yaml。请确认要改哪一个：
1. 在 config.json 新增 timeout: 60（或你指定的键名），还是
2. 把 settings/runtime.yaml 的 request_timeout_seconds 从 45 改成 60？

[AQL 2.3.0 | blocked | evidence: config.json 无 timeout；runtime.yaml=45 | next: 确认目标字段/文件后再改]
```

The badge version inside the reply is the manifest the executor read at run time (a 2.3.0-era install); the [full report is committed verbatim](probes/transcripts/2026-08-12/p1-grok-mid.md). The agent read the files before freezing the goal, surfaced the false premise instead of inventing the field, and stopped with one decidable question — zero files changed. The same probe on a budget-tier model failed exactly here (it fabricated the field), and that failure is recorded, not hidden: see the [model-tier compliance matrix](MATRIX.md) and [how to run these probes yourself](probes/PROBES.md).

## Why install this

**Before:** You ask the agent to fix a bug. It says “done.” You still have to check whether it ran the tests, whether “done” means only local edits, and whether it treated its own self-check as a formal sign-off.

**After:** For the same request, the agent is expected to:

1. Restate the goal, the edit boundary, and the most likely misunderstanding in three short lines before it starts changing things.
2. Treat “I checked my own work” and “an independent review role checked it” as different claims.
3. Refuse to call something passing unless it personally ran or inspected the evidence for that claim.
4. Refuse deploy / publish / other external side effects unless you authorize that exact action in the **current** turn.
5. After a real acceptance stop (pass or fail), write reusable lessons into `.ai/knowledge/lessons.md` when policy allows, and read matching lessons on later tasks.

Trivial Q&A and casual brainstorming stay direct; this package is for diagnosis, implementation, acceptance, release checks, and resume work.

## What changes in Cursor / Codex / Claude Code

| Surface | What you get |
|---|---|
| Cursor project rules (`.cursor/rules/`) | Always-on minimal boundaries (`00-agent-constitution.mdc`), plus routing summaries that point at the skills |
| Cursor skills (`.cursor/skills/`) | The agent can load `agent-quality-loop`, `ask-plan-code-qa`, and `review-gate` when the task matches, plus `skill-factory` for authoring work |
| Codex skills (`.agents/skills/`) | The same four skills, mirrored for Codex |
| Claude Code personal skills (`~/.claude/skills/`) | The same skills, installed with the bundled installer (`--to claude`; the default `core` suite is the three-piece loop, `--suite full` adds `skill-factory`) |
| Chat UI | No new chrome. You keep typing in the same chat box. |

How you invoke it day to day:

- **Usually:** plain language is enough (examples below). Cursor / Codex match the request to the skill descriptions and project rules.
- **Optionally:** name the skill explicitly when you want to force the entry. In Cursor and Claude Code the skill appears in the chat skill list as `/agent-quality-loop`; the `$agent-quality-loop` spelling used throughout this package's skill descriptions is the Codex-side form. Either way it is **not** required for every turn.

## How the pieces fit

One public workflow owner, two narrow helpers:

| Piece | Plain job | Ceiling |
|---|---|---|
| `agent-quality-loop` | Turns your request into a scoped contract, picks how much evidence is enough, and owns acceptance / release-state language | May map work to independent acceptance or release-prep states |
| `ask-plan-code-qa` | Code inspect → plan → implement → **self-QA** | Stops at “built locally with self-QA” (`BUILT`). Cannot grant formal acceptance |
| `review-gate` | Read-only independent review of existing work or claims | Findings and a verdict only. Does not repair code |

That split is the point: the implementer does not rubber-stamp its own work, and “accepted” is never silently treated as “published.”

A fourth skill, `skill-factory`, ships in the same package but sits outside that loop. It is an authoring tool — use it when you want to write, review, or trim a skill, a Cursor rule, or a prompt template, including the ones in this repository. You can ignore it entirely if you only want the quality loop.

**Alignment compile (not a second workflow).** For non-trivial goals, ALIGN follows [alignment-compiler.md](.cursor/skills/agent-quality-loop/references/alignment-compiler.md) — observable after-state, current-to-target gap, evidence coverage — and still emits only the existing contract fields. Ordinary Q&A and low-risk execute stay on normal routing. External `goal-prompt` material is design/eval inspiration only; it is not vendored and is not a runtime dependency of this package.

**Optional explicit routes.** Independently of `core`/`full`, `--suite routes` installs thin explicit-only shims (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) plus the compatible `agent-quality-loop` parent. Generated sources live in `dist/route-shims/` (not in default skill discovery trees). Invocation spelling differs by host: Codex `$aql-diagnose …`; Cursor and Claude Code `/aql-diagnose …`. **Uninstall manually** by deleting the installed folders from each user skill tree. Details: [integrations/route-shims/README.md](integrations/route-shims/README.md).

Underneath, the package tracks three things separately, and you never have to name any of them:

- **intent** — what outcome you want right now (diagnose? implement? review? release?)
- **assurance** — how much evidence the risk warrants
- **authority** — what side effects are allowed

The agent infers all three from your ordinary wording by following the routing rules in the skill files. Nothing is executing here — there is no program reading your message, only instructions the model reads. The three stay independent on purpose, which is why more rigor never grants more permission: asking for a thorough job does not authorize a deploy.

## Habits you will notice

Pick these up in chat; deeper mechanics live in [docs/guide.md](docs/guide.md).

1. **Three-line alignment before heavy edits** — goal, boundary, most likely misunderstanding. The goal is compiled from your project's observable reality, not only from your words: files and behaviors you name get a cheap read-only check first, so a mistaken premise can surface before anything is edited. The evaluation suite tests exactly this discipline; cheaper models are likelier to slip it, which is one reason acceptance re-checks the outcome instead of trusting the edit. If the request is high-stakes or ambiguous, it may wait for your explicit OK before implementing.
2. **Self-QA ≠ independent acceptance** — “I ran the checks I claim” can justify a local `BUILT` result. Formal acceptance needs a fresh-context review with separation evidence that reads raw evidence first; a different role alone does not qualify (`review-gate` when used).
3. **No evidence, no pass** — missing required checks are reported as not run or blocked, not waved through.
4. **Publish needs a separate current-turn ask** — a `full` local fix+accept path stops at independent acceptance. Deploy/publish needs its own exact authorization that turn.
5. **Lessons stick around** — failures and acceptance stops can update `.ai/knowledge/lessons.md`; later alignments read matching active entries so the same mistake is less likely to repeat.
6. **It adapts to you** — recurring phrases and stable preferences sediment into `.ai/knowledge/collaboration-profile.md` under a strict firewall: observed defaults are disclosed in one line and revocable, decision-changing habits need your confirmation, and anything permission-like is refused. A missing profile may be bootstrapped with a **first candidate** under To Confirm only — that candidate is not standing authority and is not applied the same turn. User-level knowledge paths (`~/.ai/knowledge/…`) are **explicit opt-in**; the installer never seeds them. Later alignments read active profile entries, so the compile gets closer to what you meant with less back-and-forth.

## How this package is tested

A package that tells an agent “no evidence, no pass” has to hold itself to the same standard, so the rules here are checked three ways.

| Check | What it covers |
|---|---|
| 65 evaluation cases | Written scenarios with expected behavior, in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). They cover happy paths, semantic ambiguity, authority boundaries, alignment compile, profile bootstrap, contradictory instructions, and the failure modes each rule exists to prevent. Count is validator-enforced by `scripts/validate-claims.js` (fails if this README number drifts). |
| Bundled envelope regression suite | The *envelope* is the compact structured record an agent hands forward between steps. These cases run on every change and pin its state machine — an adapter cannot grant itself acceptance, a local-only run cannot reach release state, and a handoff cannot name a phase whose required fields are missing. |
| Blind forward-testing | Before a rule ships, its scenario is replayed on a separate model that has not seen the intended answer. A model never grades its own output. The procedure is packaged as a reproducible protocol in [probes/PROBES.md](probes/PROBES.md), and results — including failures — land in [MATRIX.md](MATRIX.md). |

CI runs the structural checks on every push and pull request, and fails if either generated mirror has drifted from the Cursor source.

Blind testing is what catches the rules that read well and do nothing. One example: a probe found a budget-tier model granting a `PASS` on evidence it had never actually opened — it had trusted the implementer's report that tests passed. That gap became the **firsthand evidence** rule, which now says a reported exit code is a claim about evidence, not evidence.

The same suite is also the package's retirement mechanism. Every behavioral rule names the failure mode it exists to counter, and when blind probes show that a failure mode no longer reproduces on current models, the rule becomes a removal candidate — the policy is written down in [CONTRIBUTING.md](CONTRIBUTING.md). A package like this earns trust by shrinking as models improve, not by accumulating ceremony.

**What you can check, and what you cannot.** The evaluation cases, both validators, the probe protocol, and the result matrix are all in this repository — read them, run them, disagree with them, and reproduce any matrix row on your own models with `probes/make-fixtures.js`. The seed rows were run by the maintainer's own agents, so treat them as falsifiable starting data rather than third-party audit; the protocol exists precisely so you do not have to take them on faith. Envelope statistics (`scripts/aql-stats.js`) and `injected_refs` associations are **observable and falsifiable, not causally proven** — they describe what was recorded, not a growth flywheel. Absence of `injected_refs` means measurement unknown, not “nothing was injected.” Read-only tasks may leave no local envelope; stats must still report coverage. And none of it measures whether the package improves outcomes on a real project over time. It has not been deployed at that scale, and no such claim is made here.

## Everyday use

Natural language is enough. Say what you want and what you do not want:

```text
Fix the local timeout. Do not deploy.
Diagnose the root cause only. Do not change files.
Fix it, then have it independently accepted. Do not publish.
Check whether this is releasable. Do not release yet.
```

Routing reads meaning, not keywords, so any language works. Below are those same four requests in Chinese, which route identically:

```text
修复本地超时，不部署。
只诊断根因，不改文件。
修复并独立正式验收，不发布。
只检查是否可发布，先别发布。
```

Naming the skill explicitly is optional:

```text
/agent-quality-loop full: fix this locally and have it independently accepted; do not deploy.
/agent-quality-loop evidence: root-cause audit only.
/agent-quality-loop accept: independently review the existing change; do not repair it.
/agent-quality-loop release: preflight only; do not release.
```

`full` stops at most at independent acceptance. Publishing or deploying always needs a separate, exact current-turn release request.

## Status language

Agents in this package use a strict ladder. Do not collapse neighboring rows.

| State | What it means in practice |
|---|---|
| Implemented with self-QA (`BUILT`) | Local changes exist and the implementer ran its own checks. Not independently accepted. Not releasable. |
| Independently accepted (`ACCEPTED`) | A separate review role passed the required acceptance evidence. Still not permission to deploy. |
| Release-ready (`RELEASE_READY`) | A frozen accepted artifact passed read-only release preflight (the “is this package fit to ship?” check). Still not a deploy. |
| Deployed (`DEPLOYED`) | A named external target was actually changed under an authorized release action. |
| Production-verified (`PRODUCTION_VERIFIED`) | Required outcomes were observed on the real target after deploy. |

## Install

中文用户：一页速览见 [docs/quickstart.zh-CN.md](docs/quickstart.zh-CN.md)（规范文本以英文为准）。

Nothing to build and no runtime dependency. Installing means copying Markdown rules and skills into a project; the only executables are the Node installer and optional maintainer tools (validators, the envelope writer, an envelope-statistics aggregator, and the probe fixture generator).

### Fastest: via the skills.sh CLI

```bash
npx skills add MQZZang/agent-quality-loop
```

Verified 2026-08-12: the CLI finds all four skills in this repository and installs from its cross-client `.agents/skills/` tree. It has no `--dry-run`; to list what would be installed without installing, use `npx skills add MQZZang/agent-quality-loop -l`. The two install paths differ: the skills.sh CLI applies its own scope and copy/link semantics (`npx skills --help`) and picks up all four skills, while the bundled installer below writes user-level real-file snapshots and defaults to the three-skill `core` suite.

### Installer (one command, any OS)

From a clone of this repository:

```bash
node scripts/install.js --suite core --to agents
```

- `core` installs the three-piece suite (`agent-quality-loop`, `ask-plan-code-qa`, `review-gate`); `--suite full` adds `skill-factory`; `--suite routes` installs the four explicit route shims plus the compatible `agent-quality-loop` parent from `dist/route-shims/` (not part of `core`/`full`; **uninstall manually** by deleting installed folders).
- `--to` picks the user-level destination(s):

| `--to` | Destination | Host |
|---|---|---|
| `agents` | `~/.agents/skills/` | Codex CLI |
| `cursor` | `~/.cursor/skills/` | Cursor personal skills |
| `claude` | `~/.claude/skills/` | Claude Code personal skills |
| `both` | agents + cursor | |
| `all` | all three | |

- `--dry-run` prints the planned copy actions without writing; `--help` prints usage.
- The installer writes **user-level skills only**. Project rules (`.cursor/rules/`), `AGENTS.md`, and the knowledge templates ship through the project-level copy in §1 below.
- It creates portable, real-file snapshots at ordinary destinations. It never creates a live junction and refuses to replace an existing symlink or Windows junction; repair or remove that link deliberately first.
- It is plain Node with no shell dependencies — built Windows-first, and the same command works on macOS and Linux.

Any other agent that reads the open `SKILL.md` format can consume this package as well: copy `.agents/skills/<name>` into that host's skills directory.

The repository is also a valid [Agent Plugin](https://agent-plugins.org): the root `plugin.json` plus the generated top-level `skills/` tree follow the Agent Plugins 1.0.0 layout, so any client implementing that specification (VS Code, Copilot, and Kiro are among the announced adopters) can load the package by pointing its plugin locations at a clone of this repository — no extra packaging step. Registry tooling varies in which tree it reads: the skills.sh CLI installs from the cross-client `.agents/skills/` tree (verified 2026-08-12), while Agent Plugins clients read the top-level `skills/` tree per that specification — the repository ships both, so each standard finds its own. Per-client plugin-location behavior is that client's own contract; this repository claims layout conformance, verified by its validators.

Optional deterministic enforcement add-on (Cursor only): see [integrations/cursor-hooks/README.md](integrations/cursor-hooks/README.md).

### Optional local envelope cache and writer

The compact lifecycle **envelope** can travel in host persistence or the turn handoff. When `action_authority` is `local_write` or higher, the packaged writer may also cache it under `.agent-quality-loop/`:

```bash
# From a clone (thin wrapper → skill package)
node scripts/aql-envelope.js --workspace <project-dir> --input envelope.json

# From an installed skill: resolve SKILL_ROOT to the directory that contains that skill's SKILL.md
node <SKILL_ROOT>/scripts/aql-envelope.js --workspace <project-dir> --input envelope.json
```

Whether to gitignore `.agent-quality-loop/` is the consumer's choice; if you keep the cache local-only, add it to `.gitignore`. Host/output handoff remains valid when no local write is authorized. Envelope `injected_refs` records what was actually applied this turn (each item needs `content_sha256`; field absence = measurement unknown); `harvest_candidates` carries RETRO harvest. Writer-owned `snapshot.sequence` orders history. `node scripts/aql-stats.js` aggregates **valid, ordered** snapshots: exposures are the contract timeline union; current phase follows max sequence (not the highest historical phase); legacy unordered files are not qualified outcomes — see the testing caveats above.

Optional Cursor hooks (`integrations/cursor-hooks/`): an envelope `execution_plan` is **not** current tool authorization. External write-class commands that match the plan exactly may receive host-native **`ask` only** — the AQL hook never auto-`allow`s them, and it does not understand full shell semantics.

### Maintainer deployment topology

The public installer is for portable snapshots. Repository maintainers may instead keep Cursor live through a manually managed junction from the user Cursor skills directory to this repository's `.cursor/skills/<name>` source. Codex maintenance consumes the generated `.agents/skills/<name>` tree as a copy/snapshot, never as a junction. These are deployment conventions, not extra installer modes.

### 1. Project-level install (manual copy, self-contained)

Works for Cursor and Codex inside a single repo. No external installer.

1. Clone this repository.
2. Copy these paths into your target project:
   - `.cursor/` (rules + skills) — required for Cursor
   - `.agents/` (Codex skill mirror) — skip this if you only use Cursor
   - `AGENTS.md`
   - `.ai/knowledge/` — optional, and **not** a plain directory copy; see step 3

   If the target project already has `.cursor/rules/` or `.cursor/skills/`, copy file by file rather than replacing the directory, and keep your existing files. The rule files here are numbered (`00-`, `05-`, `10-`, `20-`, `30-`) so they sort predictably; skills are directories named after the skill. A name clash means you must decide which version wins, not merge them line by line.
3. For the optional knowledge layer, copy the two templates **and rename them** — the agent looks for the renamed files, not the templates:

   | Copy from this repo | Save in your project as | Holds |
   |---|---|---|
   | `.ai/knowledge/project-context.template.md` | `.ai/knowledge/project-context.md` | Verified facts about your project |
   | `.ai/knowledge/collaboration-profile.template.md` | `.ai/knowledge/collaboration-profile.md` | How you prefer an agent to work with you |

   Do **not** copy this repository's `lessons.md`. It contains lessons learned while maintaining *this package* on the author's machine, and the agent injects matching lessons into its alignment — so copying it would feed you someone else's environment problems. Your project starts empty and accumulates its own. `prompt-patterns.md` is reference reading for maintainers and is not needed in a target project either.

   The collaboration profile is also the file this package grows for you over time: recurring phrases and confirmed preferences sediment there under the firewall defined in the skill's `references/personalization.md` — observed defaults disclosed and revocable, decision-changing habits confirm-first, authority never.

4. Keep the lifecycle rules and skills as they are unless you are deliberately maintaining this package. `.ai/knowledge/` is the part meant to be customized.

### Check that it took effect

The two install paths leave different footprints, so check the one you used.

**After the installer (user-level skills):** nothing new appears inside your project — the skills are personal, host-level files. Check the host's skill list instead: `/agent-quality-loop` shows up in the Cursor and Claude Code skill lists, and Codex answers to `$agent-quality-loop`. The always-on rule boundaries (`.cursor/rules/`) exist only after a project-level copy.

**After the project-level copy (§1):** open the target project and ask for something non-trivial with an explicit boundary:

```text
Diagnose the root cause of the failing build. Do not change files.
```

Two things should happen: the agent restates goal, boundary, and most likely misunderstanding before doing anything, and it stops at a diagnosis instead of editing. If it starts editing straight away, the rules did not load — after a project-level copy, check that `.cursor/rules/` and `.cursor/skills/` landed at the **root** of the target project; after an installer run, check the host's skill list for the skill name.

### 2. Legacy alternative: Codex user-level skills via skill-installer (only if you already use that tool)

The bundled installer above already covers Codex user-level skills (`--to agents`). This legacy path installs the four skills via **skill-installer** — a separate tool **not shipped in this repository** — and exists only for users who already work with it; otherwise use the bundled installer or §1's plain file copy.

Ask Codex to use `$skill-installer` with repository `MQZZang/agent-quality-loop`, ref `master`, and these paths:

```text
.agents/skills/agent-quality-loop
.agents/skills/ask-plan-code-qa
.agents/skills/review-gate
.agents/skills/skill-factory
```

The equivalent installer command is:

```bash
python <skill-installer>/scripts/install-skill-from-github.py \
  --repo MQZZang/agent-quality-loop \
  --ref master \
  --path .agents/skills/agent-quality-loop \
         .agents/skills/ask-plan-code-qa \
         .agents/skills/review-gate \
         .agents/skills/skill-factory
```

Replace `<skill-installer>` with the local checkout of skill-installer on your machine. The installer does not overwrite existing skill directories; remove or back up an older installation deliberately before reinstalling.

If you do not have skill-installer, use **§1 Project-level install** instead.

## Repository layout

| Path | Purpose |
|---|---|
| `AGENTS.md` | Cross-tool operating contract |
| `CONTRIBUTING.md` | How to propose a change, including the AI-assistance policy |
| `.cursor/rules/` | Cursor routing summaries and minimal invariants |
| `.cursor/skills/` | Authoritative skill sources |
| `.agents/skills/` | Generated Codex mirror; Codex maintainers copy/install snapshots from here |
| `skills/` + `plugin.json` | Generated Agent Plugins surface: top-level skills tree plus the closed-schema manifest |
| `probes/` | Blind behavioral probe protocol and deterministic fixture generator |
| `MATRIX.md` | Model-tier compliance results from the probes, failures included |
| `CHANGELOG.md` | Versioned release notes |
| `docs/guide.md` | Compact user/agent guide; `docs/quickstart.zh-CN.md` is the one-page Chinese quickstart |
| `.ai/knowledge/` | Two templates you copy into your own project and fill in there, plus this package's own maintenance lessons and prompt-pattern notes — those last two stay here |
| `integrations/` | Optional Cursor hook templates, protocol tests, and generated route-shim catalog; hooks never provide semantic acceptance |
| `scripts/` | Node sync, manifest, installer, envelope writer wrapper, envelope statistics, route-shim generator, validators, and compatibility helpers |
| `.github/workflows/` | CI that runs the validators and checks mirror parity |
| `.gitattributes`, `.gitignore`, `LICENSE` | Repository metadata, ignored-path policy, and license |

Each skill's adjacent `manifest.json` is its version and distribution inventory. When maintaining this package, edit `.cursor/skills/` and then run `node scripts/sync-skills.js` so both generated mirrors (`.agents/skills/` and `skills/`) stay in sync. Do not hand-edit either mirror. `scripts/sync-skills.sh` is deprecated compatibility only.

## Validate changes

If you change the packaged skills or rules in this repository:

```bash
node scripts/sync-skills.js
node scripts/gen-route-shims.js
node scripts/validate-all.js
git diff --check
```

GitHub Actions runs `node scripts/validate-all.js` on every push and pull request (Ubuntu and Windows), including mirror parity, route-shim drift, and claim-consistency checks (`scripts/validate-claims.js`). Claim ↔ evidence honesty for host probes / longitudinal work is summarized in [docs/claim-evidence-matrix.md](docs/claim-evidence-matrix.md).

Read-only workspace diagnosis (versions, hooks presence, MCP coverage disclosure, envelope-chain pollution/gap/fork/legacy): `node scripts/aql-doctor.js` or `node scripts/aql-doctor.js --json`. Doctor never deletes history, modifies profile, enables hooks, or auto-fixes projects. CI only runs `node scripts/aql-doctor.js --self-test` (cheap smoke), not a full consumer diagnose.

The structural validator does not replace independent semantic review or real-environment verification.

## License

MIT — see [LICENSE](LICENSE).

## Deeper reading

- Day-to-day routing examples and boundary details: [docs/guide.md](docs/guide.md)
- Repository invariants for agents working *in this package*: [AGENTS.md](AGENTS.md)
- How to propose a change, and what an AI-assisted contribution must carry: [CONTRIBUTING.md](CONTRIBUTING.md)
