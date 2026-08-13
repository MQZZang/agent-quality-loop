# Agent Quality Loop

[![validate](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml/badge.svg)](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml)

**Agent Quality Loop (AQL) keeps you and an AI agent on one checkable goal during long work:** what the agent understood, what it did, what evidence supports the claim, why it stopped, and whether the next step needs your authorization.

It is a portable workflow package for Cursor, the Codex CLI, Claude Code, and other agents that read the open `SKILL.md` format. It does not add a panel or button. After install, the agent’s **default habits** change for non-trivial tasks. Writing is the first vertical scenario, not the product boundary. “Cognitive” here means observable, falsifiable intent-to-outcome reasoning — not mind-reading, personality scoring, or neuroscience.

中文一页速览：[docs/quickstart.zh-CN.md](docs/quickstart.zh-CN.md)。规范文本以英文为准。

## Who this is for

Use this if you already run non-trivial work through an AI coding or workspace agent and still have to reconstruct the truth after it says “done”: whether the goal was the right goal, whether the evidence actually bears on the claim, whether “hide it” meant delete it, and whether “accepted” was silently treated as “published.”

Mechanical gates are the right tool when a command can settle the question. This package covers the part a command cannot settle. It constrains what the agent is allowed to claim.

Skip it for one-line factual answers, casual brainstorming, or tasks with no reusable execution or acceptance lifecycle.

## What changes after you install

For the same kind of request you already make, you should be able to observe:

1. **A shared goal before heavy edits** — the agent restates the outcome, the edit boundary, and the most likely misunderstanding, and checks named files or behaviors before freezing the goal.
2. **Claims with evidence attached** — a pass or “done” is only claimable when the agent ran or inspected the evidence for that claim in this turn.
3. **A visible stop** — diagnosis can end as diagnosis; local implementation can end after self-QA; independent acceptance and publish are different later asks.
4. **A separate publish switch** — deploy, upload, or release needs an exact current-turn authorization. A thorough local job does not unlock it.
5. **Writing that keeps source and authority honest** — prose work names the reader job and truth boundary, still stops at local self-QA unless you ask for independent review, and does not treat a good draft as proof that you “grew.”

These are collaboration results, not an internal module list. The packaged skills, adapters, and validators exist to make those results checkable.

## Before / after

**Before:** You ask the agent to fix a bug. It says “done.” You still have to check whether it ran the tests, whether “done” means only local edits, and whether it treated its own self-check as a formal sign-off.

**After:** For the same request, the agent is expected to align the goal, stay inside the stated boundary, attach firsthand evidence to any pass, and stop without publishing unless you authorize that exact action in the **current** turn.

A real grounding example: the user asked to change `timeout` in `config.json`, but that file had no such field. The agent read the files, surfaced the false premise, asked one decidable question, and changed zero files. The [verbatim probe transcript](probes/transcripts/2026-08-12/p1-grok-mid.md) is preserved, including its older status-line grammar. The same probe on a budget-tier model fabricated the field; that failure remains in [MATRIX.md](MATRIX.md).

## How a task moves

```text
Natural-language request
        → align the checkable scope
        → execute only from evidence
        → independently accept only when asked
        → authorize release separately, if at all
```

You keep typing ordinary language. The agent infers what outcome you want now, how much evidence the risk warrants, and what side effects are allowed — and those three stay independent. Asking for a thorough job does not authorize a deploy.

Trivial Q&A stays direct. This package is for diagnosis, implementation, writing, independent acceptance, release checks, and resume without goal drift.

Three invariants do not move:

- Style never escalates authority.
- No completion claim without evidence.
- Accepted is not released.

## Install

Nothing to build and no runtime dependency. Installing copies Markdown rules and skills; the only executables are the Node installer and optional maintainer tools.

### Fastest: via the skills.sh CLI

```bash
npx skills add MQZZang/agent-quality-loop
```

Verified 2026-08-12: the CLI finds all four skills in this repository and installs from its cross-client `.agents/skills/` tree. It has no `--dry-run`; to list what would be installed without installing, use `npx skills add MQZZang/agent-quality-loop -l`. This path picks up all four skills. The bundled installer below defaults to the three-skill `core` suite and writes user-level real-file snapshots.

### Installer (one command, any OS)

From a clone of this repository:

```bash
node scripts/install.js --suite core --to agents
```

- `core` installs `agent-quality-loop`, `ask-plan-code-qa`, and `review-gate`. `--suite full` adds `skill-factory`. `--suite routes` installs four explicit route shims plus the compatible parent from `dist/route-shims/` (not part of `core`/`full`; **uninstall manually** by deleting installed folders).
- `--to` picks the user-level destination: `agents` (Codex CLI, `~/.agents/skills/`), `cursor` (Cursor personal skills), `claude` (Claude Code personal skills), `both`, or `all`.
- `--dry-run` prints the planned copy without writing. The installer never creates a live junction and refuses to replace an existing symlink or Windows junction.

The repository also ships an [Agent Plugins](https://agent-plugins.org) layout (`plugin.json` plus the generated top-level `skills/` tree). That is layout compatibility, verified by this repo’s validators — not a claim that every announced client has been live-behavior tested.

Any other `SKILL.md` host can copy `.agents/skills/<name>` into its skills directory.

The installer writes **user-level skills only**. For Cursor project rules, `AGENTS.md`, and knowledge templates, copy those paths into the target project (file by file if the project already has `.cursor/`). Do **not** copy this repository’s `lessons.md`. Details and the knowledge-template rename table: [docs/guide.md](docs/guide.md#project-level-install).

Optional Cursor hooks check decidable mechanics only and never semantic acceptance: [integrations/cursor-hooks/README.md](integrations/cursor-hooks/README.md).

### First use

Natural language is enough:

```text
Fix the local timeout. Do not deploy.
Diagnose the root cause only. Do not change files.
Fix it, then have it independently accepted. Do not publish.
Check whether this is releasable. Do not release yet.
Write the evidence-bound report and give me a usable draft; no coaching.
```

After a project-level copy, a read-only diagnosis should restate goal, boundary, and likely misunderstanding, then stop without editing. After a user-level installer run, check the host skill list for `/agent-quality-loop` (Cursor / Claude Code) or `$agent-quality-loop` (Codex). Explicit skill names are optional.

`full` stops at most at independent acceptance. Publishing always needs a later, exact current-turn release request.

## Fit / not a fit

**Fit**

- Long or high-ambiguity agent work where you need a shared, checkable goal.
- Local implementation that must not quietly become a deploy.
- Independent review of an existing change, without the implementer grading itself.
- Evidence-bound or creative writing that must keep source, truth, and posture visible.

**Not a fit**

- One-line facts, casual ideation, or “just do something.”
- Replacing domain skills, human product judgment, real-device checks, or release authority.
- A hidden recommender, growth score, or proof that using the package makes you better over time.
- Treating hooks, test counts, or an AI review as an oracle for the user outcome.

## What is verified, and what is not

A package that says “no evidence, no pass” has to hold itself to that rule.

| Check | What it covers |
|---|---|
| 88 evaluation cases | Written scenarios with expected behavior in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). Count is validator-enforced by `scripts/validate-claims.js`. |
| Envelope regression suite | Pins the state machine: an adapter cannot grant itself acceptance; a local-only run cannot reach release state. |
| Blind forward-testing | Scenario replay on a model that has not seen the intended answer. Protocol: [probes/PROBES.md](probes/PROBES.md). Results, including failures: [MATRIX.md](MATRIX.md). |
| Writing probes | Structure, identity, and independent semantic grade are separate. P-W6 remains **FAIL** under its frozen story ruler. Transcripts: [behavior-probes.md](docs/research/llm-learning-corpus/behavior-probes.md). |
| Corpus research | 397 files were inventoried. Fourteen AQL-relevant claims were distilled. That is not semantic coverage of the whole corpus. All inventoried licenses remain `unknown`. |

CI runs the structural checks on every push and pull request.

**Do not read this working tree as the 2.6.1 GitHub Release.** Packaged skill manifests still declare version `2.6.1`; the collaboration-result, writing-vertical, and README changes in this branch are **Unreleased** relative to that tag.

Seed probe rows were run by the maintainer’s agents. Treat them as falsifiable starting data, not a third-party audit. Reproduce a matrix row with `probes/make-fixtures.js`. Envelope statistics and `injected_refs` are **observable and falsifiable, not causally proven**. Missing `injected_refs` means measurement unknown, not “nothing was injected.”

This package has not been shown to improve real-project outcomes over time. Longitudinal writing growth remains `NOT_RUN`. Live behavior on every advertised host is not claimed; the repo provides install and package layout for Cursor, Codex, Claude Code, and Agent Plugins clients. Optional host-probe and pilot docs stay `NOT_RUN` or screening-only until live transcripts exist. Claim mapping: [docs/claim-evidence-matrix.md](docs/claim-evidence-matrix.md).

## Status language

Do not collapse neighboring rows.

| State | What it means in practice |
|---|---|
| Implemented with self-QA (`BUILT`) | Local changes exist and the implementer ran its own checks. Not independently accepted. Not releasable. |
| Independently accepted (`ACCEPTED`) | A separate fresh-context review passed the required acceptance evidence. Still not permission to deploy. |
| Release-ready (`RELEASE_READY`) | A frozen accepted artifact passed read-only release preflight. Still not a deploy. |
| Deployed (`DEPLOYED`) | A named external target was actually changed under an authorized release action. |
| Production-verified (`PRODUCTION_VERIFIED`) | Required outcomes were observed on the real target after deploy. |

Every active AQL reply starts with one adaptive user result summary. Routine success is 1–3 lines. Formal, failed, blocked, pending, handoff, and release results expose the audit detail. Adapters return receipts only.

## Compatibility and advanced use

| Surface | What you get |
|---|---|
| Cursor project rules (`.cursor/rules/`) | Always-on minimal boundaries plus routing summaries |
| Cursor / Codex / Claude skills | The same core loop: `agent-quality-loop` owns acceptance and release language; `ask-plan-code-qa` stops at `BUILT`; `review-gate` is read-only findings |
| Agent Plugins clients | Layout via `plugin.json` and top-level `skills/` |

`skill-factory` is an optional authoring helper, not part of the quality loop. Optional explicit routes (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) install only with `--suite routes`. Invocation spelling differs by host: Codex `$aql-…`; Cursor and Claude Code `/aql-…`.

Recurring phrases and confirmed preferences can sediment into `.ai/knowledge/collaboration-profile.md` under a strict firewall: disclosed, revocable, never a source of authority. This is not a hidden ranker, embedding profile, or engagement reward. User-level knowledge paths are explicit opt-in only. Growth Focus is an explicit practice intention, not evidence of growth and not a reason to enter coaching.

The compact lifecycle envelope can travel in host persistence or the turn handoff. Optional local cache and stats: [docs/guide.md](docs/guide.md).

## License

MIT — see [LICENSE](LICENSE).

## Deeper reading

- Day-to-day routing, project-level copy, envelope cache, and adapter boundaries: [docs/guide.md](docs/guide.md)
- Repository invariants for agents working in this package: [AGENTS.md](AGENTS.md)
- How to propose a change, mirror sync, and AI-assisted contribution rules: [CONTRIBUTING.md](CONTRIBUTING.md)
