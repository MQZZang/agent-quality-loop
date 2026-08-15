# Agent Quality Loop

[![validate](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml/badge.svg)](https://github.com/MQZZang/agent-quality-loop/actions/workflows/validate.yml)

**Agent Quality Loop (AQL) 2.8.0** is a portable workflow for AI coding agents. It keeps you and the model on one checkable goal during long work: what the agent understood, what it did, what evidence supports the claim, why it stopped, and whether the next step needs your authorization.

It is not a new IDE, panel, or standalone app. After you install the skills, the agent’s **default habits** change for non-trivial tasks. Writing is the first vertical scenario, not the product boundary.

中文一页速览：[docs/quickstart.zh-CN.md](docs/quickstart.zh-CN.md)。规范文本以英文为准。

Profile Projection v1 is an experimental, opt-in capability in AQL 2.8.0. For one task, AQL may apply at most two confirmed, genuinely relevant collaboration defaults. It does not turn the full profile into a second prompt contract, raise authority, or constrain the agent's professional method. Product effect and longitudinal value remain `NOT_RUN`.

## What changes for you

1. **One visible goal** — the agent states the outcome, edit boundary, and likely misunderstanding before substantial work.
2. **Claims stay attached to evidence** — local self-QA, independent acceptance, and release permission remain separate.
3. **Results lead with the decision** — the conclusion, practical boundary, evidence strength, and any required action appear before internal receipts.

## A 60-second example

```text
Review this architecture change, fix the root cause, and verify it locally.
Use my confirmed project defaults where they fit. Do not push or publish.
```

For a non-trivial task, the expected behavior is: align one Task Contract, let the current request override stored defaults, apply no more than two source-bound profile entries when their real carrier is readable, run proportionate checks, report the result and remaining uncertainty, then stop before any remote action.

## Fit / not a fit

**Fit:** long or ambiguous agent work; implementation that must stop locally; independent review; evidence-bound or creative writing; teams that need a readable separation between “built,” “accepted,” and “released.”

**Not a fit:** one-line facts, casual brainstorming, replacing human product judgment, hidden personalization, or treating test counts as proof of user value.

## Install

```bash
npx skills add MQZZang/agent-quality-loop
```

This installs skills, not probe transcripts or a runtime service. See [Installation details](#installation-details) for the bundled installer, suites, hosts, and project-level setup.

## Why AQL exists

Agents made producing a change cheap. The cost moved onto whoever has to decide whether “done” is true. Mechanical gates help when a command can settle the question. AQL covers the part a command cannot: whether the goal was the right goal, whether the evidence bears on the claim, whether “hide it” meant delete it, and whether local self-QA was silently treated as publish permission.

## How it behaves on non-trivial work

For the same kind of request you already make:

1. **A shared goal before heavy edits** — outcome, edit boundary, and the most likely misunderstanding, with named files or behaviors checked before the goal freezes.
2. **Claims with evidence attached** — a pass or “done” is only claimable when the agent ran or inspected that evidence in this turn.
3. **A visible stop** — diagnosis can end as diagnosis; ordinary implementation can end after self-QA.
4. **Separated authority** — self-QA, independent acceptance, and publish permission are different asks. Installing AQL never auto-publishes.
5. **Honest writing work** — prose names the reader job and truth boundary. A good draft is not proof that you “grew.”

## From a fuzzy request to a checkable result

```text
Natural-language request
        → align a checkable scope
        → execute only from evidence
        → independently accept only when asked
        → authorize release separately, if at all
```

You keep typing ordinary language. The agent infers what outcome you want now, how much evidence the risk warrants, and what side effects are allowed. Those three stay independent: asking for a thorough job does not authorize a deploy.

**Self-QA, independent acceptance, and release stay apart on purpose.**

| You asked for | What “done” may mean | What it is not |
|---|---|---|
| Fix / implement / self-test | Local changes plus the implementer’s own checks (`BUILT`) | Not independently accepted; not releasable |
| Independently accept this | A fresh-context review of raw evidence (`ACCEPTED`) | Not permission to push, tag, or deploy |
| Check whether this can ship / publish this | Read-only preflight, or a separately authorized external action | Not implied by a local fix, a green self-check, or formal wording |

`full` stops at most at independent acceptance. Publishing always needs a later, exact current-turn authorization.

**Routine output stays short; formal, failed, or blocked work expands.** Everyday success is normally 1–3 lines: conclusion, decisive evidence, and whether you must act. Formal acceptance, failure, blocking, pending evidence, handoff, and release expose phase, missing evidence, required action, and completion standard. Adapters return receipts only. There is no dashboard, HTML card, or decorative status chrome.

Three invariants do not move: style never escalates authority; no completion claim without evidence; accepted is not released.

## Installation details

Nothing to build and no runtime dependency. Installing copies Markdown rules and skills.

### Fastest: via the skills.sh CLI

```bash
npx skills add MQZZang/agent-quality-loop
```

Verified 2026-08-12: the CLI finds all four skills and installs from `.agents/skills/`. It has no `--dry-run`; list only with `npx skills add MQZZang/agent-quality-loop -l`. This path installs all four skills. The bundled installer below defaults to the three-skill `core` suite.

### Installer (one command, any OS)

```bash
node scripts/install.js --suite core --to agents
```

- `core`: `agent-quality-loop`, `ask-plan-code-qa`, `review-gate`. `--suite full` adds `skill-factory`. `--suite routes` adds explicit shims from `dist/route-shims/` (**uninstall manually**).
- `--to`: `agents` (Codex), `cursor`, `claude`, `both`, or `all`.
- `--dry-run` prints the plan. The installer never creates a live junction.

This repository also ships an [Agent Plugins](https://agent-plugins.org) layout. That is layout compatibility, verified by validators — not live-behavior PASS on every announced client.

The installer writes **user-level skills only**. For Cursor project rules, copy `.cursor/`, `AGENTS.md`, and renamed knowledge templates into the project. Do **not** copy this repository’s `lessons.md`. Details: [docs/guide.md](docs/guide.md#project-level-install).

Optional Cursor hooks check decidable mechanics only and never semantic acceptance: [integrations/cursor-hooks/README.md](integrations/cursor-hooks/README.md).

### First use

```text
Fix the local timeout. Do not deploy.
Diagnose the root cause only. Do not change files.
Fix it, then have it independently accepted. Do not publish.
Check whether this is releasable. Do not release yet.
Write the evidence-bound report and give me a usable draft; no coaching.
```

After a project-level copy, the unchanged collaboration-profile template is inert: it parses zero entries and opts into nothing. Project Profile Projection begins only when the user creates a non-empty profile containing at least one complete, valid `status: active` entry. A read-only diagnosis should restate goal, boundary, and likely misunderstanding, then stop without editing. After a user-level install, look for `/agent-quality-loop` (Cursor / Claude Code) or `$agent-quality-loop` (Codex).

**Before / after.** You ask for a bugfix and hear “done,” then still have to check tests, local-only scope, and whether self-QA was treated as sign-off. With AQL, the same request is expected to align the goal, stay inside the boundary, attach firsthand evidence, and stop without publishing unless you authorize that exact action in the **current** turn.

A real grounding example: the user asked to change `timeout` in `config.json`, but that file had no such field. The agent read the files, surfaced the false premise, asked one decidable question, and changed zero files. Transcript: [p1-grok-mid.md](probes/transcripts/2026-08-12/p1-grok-mid.md). A budget-tier model fabricated the field; that failure remains in [MATRIX.md](MATRIX.md).

## Fit / not a fit

**Fit:** long or high-ambiguity agent work; local implementation that must not become a deploy; independent review of existing work; evidence-bound or creative writing with visible source and posture.

**Not a fit:** one-line facts; replacing human judgment or release authority; a hidden recommender or growth score; treating hooks or test counts as an outcome oracle; expecting AQL to ship itself to GitHub.

## What is verified, and what is not

Profile Projection v1 is experimental and opt-in. Its current evidence is limited to named mechanism behavior; product effect and longitudinal value are `NOT_RUN`. Installing this repository still installs only the skill package: probe evidence is not an installation payload.

| Check | What it covers |
|---|---|
| 109 evaluation cases | Expected behavior in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). Count enforced by `scripts/validate-claims.js`. |
| Envelope regression suite | An adapter cannot grant itself acceptance; a local-only run cannot reach release state. |
| Blind forward-testing | Protocol: [probes/PROBES.md](probes/PROBES.md). Results, including failures: [MATRIX.md](MATRIX.md). |
| Writing probes | Structure, identity, and independent semantic grade are separate. P-W6 remains **FAIL**. Transcripts: [behavior-probes.md](docs/research/llm-learning-corpus/behavior-probes.md). |
| Profile Projection v1 probes | Sanitized, exact-byte-bound one-host evidence and a neutral raw-first review covered ten named mechanism behaviors with zero hard-gate events. The old A/B/C control is `INVALID`; a replacement protocol is preregistered but `NOT_RUN`, so product effect and longitudinal value remain `NOT_RUN`. Protocol and evidence: [profile-projection-v1-experiment.md](docs/profile-projection-v1-experiment.md), [v3 preregistration](docs/profile-projection-v1-abc-preregistration-v3.md). |
| Corpus research | 397 files inventoried; fourteen AQL-relevant claims distilled. Not semantic coverage of the whole corpus. Licenses remain `unknown`. |

CI runs the structural checks on every pull request and on pushes to `master`. Structural checks are not semantic acceptance.

**机制已实现；长期、因果和跨宿主效果仍在持续验证，不影响当前合同、权限和证据机制的使用。** The collaboration contract, authority split, and evidence rules in this package are implemented and locally validated. Longitudinal user growth, causal improvement on real projects, and live behavior on every advertised host remain `NOT_RUN` or screening-only. That gap does not block using the current contract. This package is not claimed to make you grow, and installing it does not auto-publish.

Seed probe rows were run by the maintainer’s agents. Treat them as falsifiable starting data. Reproduce a matrix row with `probes/make-fixtures.js`. Envelope statistics are **observable and falsifiable, not causally proven**. Claim mapping: [docs/claim-evidence-matrix.md](docs/claim-evidence-matrix.md).

## Status language

Do not collapse neighboring rows.

| State | What it means in practice |
|---|---|
| Implemented with self-QA (`BUILT`) | Local changes exist and the implementer ran its own checks. Not independently accepted. Not releasable. |
| Independently accepted (`ACCEPTED`) | A separate fresh-context review passed required acceptance evidence. Still not permission to deploy. |
| Release-ready (`RELEASE_READY`) | A frozen accepted artifact passed read-only release preflight. Still not a deploy. |
| Deployed (`DEPLOYED`) | A named external target was changed under an authorized release action. |
| Production-verified (`PRODUCTION_VERIFIED`) | Required outcomes were observed on the real target after deploy. |

## Compatibility and advanced use

| Surface | What you get |
|---|---|
| Cursor project rules (`.cursor/rules/`) | Always-on minimal boundaries plus routing summaries |
| Cursor / Codex / Claude skills | `agent-quality-loop` owns acceptance and release language; `ask-plan-code-qa` stops at `BUILT`; `review-gate` is read-only findings |
| Agent Plugins clients | Layout via `plugin.json` and top-level `skills/` |

`skill-factory` is optional authoring, not part of the quality loop. Optional routes (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) install only with `--suite routes`. Codex `$aql-…`; Cursor and Claude Code `/aql-…`.

Confirmed preferences can sediment into `.ai/knowledge/collaboration-profile.md` under a firewall: disclosed, revocable, content-bound to the readable carrier, and never a source of authority. AQL 2.8.0's experimental, opt-in Profile Projection v1 applies at most two complete matching active entries through the existing Task Contract and `injected_refs`; copying the template unchanged creates no active or candidate entry. It creates no User Lens state, ranker, or second contract. Fresh Mode skips stored collaboration defaults for one task without disabling project facts, lessons, authority, or evidence. Sanitized one-host mechanism evidence passed its recorded raw-first review; the old A/B/C value control remains `INVALID`, and the executable v3 replacement is only preregistered. Product and longitudinal value remain `NOT_RUN`. Growth Focus is an explicit practice intention, not evidence of growth.

Optional envelope cache and stats: [docs/guide.md](docs/guide.md).

## License

MIT — see [LICENSE](LICENSE).

## Deeper reading

- Day-to-day routing, project-level copy, envelope cache, and adapter boundaries: [docs/guide.md](docs/guide.md)
- Repository invariants: [AGENTS.md](AGENTS.md)
- How to propose a change: [CONTRIBUTING.md](CONTRIBUTING.md)
