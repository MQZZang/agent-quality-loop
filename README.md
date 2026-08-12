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

Underneath, the package tracks three things separately, and you never have to name any of them:

- **intent** — what outcome you want right now (diagnose? implement? review? release?)
- **assurance** — how much evidence the risk warrants
- **authority** — what side effects are allowed

The agent infers all three from your ordinary wording by following the routing rules in the skill files. Nothing is executing here — there is no program reading your message, only instructions the model reads. The three stay independent on purpose, which is why more rigor never grants more permission: asking for a thorough job does not authorize a deploy.

## Habits you will notice

Pick these up in chat; deeper mechanics live in [docs/guide.md](docs/guide.md).

1. **Three-line alignment before heavy edits** — goal, boundary, most likely misunderstanding. The goal is compiled from your project's observable reality, not only from your words: files and behaviors you name get a cheap read-only check first, so a mistaken premise surfaces before anything is edited. If the request is high-stakes or ambiguous, it may wait for your explicit OK before implementing.
2. **Self-QA ≠ independent acceptance** — “I ran the checks I claim” can justify a local `BUILT` result. Formal acceptance needs a fresh / different-role review that reads raw evidence first (`review-gate` when used).
3. **No evidence, no pass** — missing required checks are reported as not run or blocked, not waved through.
4. **Publish needs a separate current-turn ask** — a `full` local fix+accept path stops at independent acceptance. Deploy/publish needs its own exact authorization that turn.
5. **Lessons stick around** — failures and acceptance stops can update `.ai/knowledge/lessons.md`; later alignments read matching active entries so the same mistake is less likely to repeat.
6. **It adapts to you** — recurring phrases and stable preferences sediment into `.ai/knowledge/collaboration-profile.md` under a strict firewall: observed defaults are disclosed in one line and revocable, decision-changing habits need your confirmation, and anything permission-like is refused. Later alignments read the profile, so the compile gets closer to what you meant with less back-and-forth.

## How this package is tested

A package that tells an agent “no evidence, no pass” has to hold itself to the same standard, so the rules here are checked three ways.

| Check | What it covers |
|---|---|
| 45 evaluation cases | Written scenarios with expected behavior, in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). They cover happy paths, semantic ambiguity, authority boundaries, contradictory instructions, and the failure modes each rule exists to prevent. |
| Bundled envelope regression suite | The *envelope* is the compact structured record an agent hands forward between steps. These cases run on every change and pin its state machine — an adapter cannot grant itself acceptance, a local-only run cannot reach release state, and a handoff cannot name a phase whose required fields are missing. |
| Blind forward-testing | Before a rule ships, its scenario is replayed on a separate model that has not seen the intended answer. A model never grades its own output. |

CI runs the structural checks on every push and pull request, and fails if the Codex mirror has drifted from the Cursor source.

Blind testing is what catches the rules that read well and do nothing. One example: a probe found a budget-tier model granting a `PASS` on evidence it had never actually opened — it had trusted the implementer's report that tests passed. That gap became the **firsthand evidence** rule, which now says a reported exit code is a claim about evidence, not evidence.

The same suite is also the package's retirement mechanism. Every behavioral rule names the failure mode it exists to counter, and when blind probes show that a failure mode no longer reproduces on current models, the rule becomes a removal candidate — the policy is written down in [CONTRIBUTING.md](CONTRIBUTING.md). A package like this earns trust by shrinking as models improve, not by accumulating ceremony.

**What you can check, and what you cannot.** The evaluation cases and both validators are in this repository — read them, run them, disagree with them. Blind forward-testing is a maintainer practice rather than a stored artifact: the probe transcripts are not committed, so treat that row as a description of process, not as evidence you can audit. And none of it measures whether the package improves outcomes on a real project over time. It has not been deployed at that scale, and no such claim is made here.

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

Nothing to build and no runtime dependency. Installing means copying Markdown rules and skills into a project; the only executables are the Node installer and optional maintainer validators.

### Installer (one command, any OS)

From a clone of this repository:

```bash
node scripts/install.js --suite core --to agents
```

- `core` installs the three-piece suite (`agent-quality-loop`, `ask-plan-code-qa`, `review-gate`); `--suite full` adds `skill-factory`.
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

Optional deterministic enforcement add-on (Cursor only): see [integrations/cursor-hooks/README.md](integrations/cursor-hooks/README.md).

If a consumer deliberately enables the optional local envelope cache, it should add `.agent-quality-loop/` to `.gitignore`; host/output handoff remains valid when no local write is authorized.

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

### 2. Codex user-level skills (optional; needs a separate installer)

This path installs the four skills into your Codex user skill area via **skill-installer** — a separate tool **not shipped in this repository**. Use it only if you already have skill-installer available; otherwise use §1, which needs nothing beyond a file copy.

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
| `docs/guide.md` | Compact user/agent guide |
| `.ai/knowledge/` | Two templates you copy into your own project and fill in there, plus this package's own maintenance lessons and prompt-pattern notes — those last two stay here |
| `integrations/` | Optional Cursor hook templates and protocol tests; hooks never provide semantic acceptance |
| `scripts/` | Node sync, manifest, installer, envelope statistics, validators, and compatibility helpers |
| `.github/workflows/` | CI that runs the validators and checks mirror parity |
| `.gitattributes`, `.gitignore`, `LICENSE` | Repository metadata, ignored-path policy, and license |

Each skill's adjacent `manifest.json` is its version and distribution inventory. When maintaining this package, edit `.cursor/skills/` and then run `node scripts/sync-skills.js` so `.agents/skills/` stays a mirror. Do not hand-edit the Codex mirror. `scripts/sync-skills.sh` is deprecated compatibility only.

## Validate changes

If you change the packaged skills or rules in this repository:

```bash
node scripts/sync-skills.js
node .cursor/skills/agent-quality-loop/scripts/validate-skill.js
node scripts/validate-workflow.js
git diff --check
```

GitHub Actions runs the same two validators on every push and pull request, and additionally fails the build if the Codex mirror has drifted from the Cursor source.

The structural validator does not replace independent semantic review or real-environment verification.

## License

MIT — see [LICENSE](LICENSE).

## Deeper reading

- Day-to-day routing examples and boundary details: [docs/guide.md](docs/guide.md)
- Repository invariants for agents working *in this package*: [AGENTS.md](AGENTS.md)
- How to propose a change, and what an AI-assisted contribution must carry: [CONTRIBUTING.md](CONTRIBUTING.md)
