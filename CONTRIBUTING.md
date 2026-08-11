# Contributing

Thanks for looking. This is a small package maintained by one person, so please read the two sections that apply to you before opening anything.

## Before you open a pull request

Open an issue first for anything that changes behavior. This package is a set of rules that other people's agents follow, so a change here propagates into their working habits. A short discussion is cheaper than a rejected pull request.

Typo fixes, broken links, and obviously wrong statements do not need an issue.

## On AI-assisted contributions

Agent-assisted work is welcome. Refusing it would contradict the point of this package, which exists to make agent output trustworthy rather than to keep agents out.

What is not welcome is a contribution whose claims you cannot answer for. Concretely:

- **You must be able to explain the change without the agent.** If a reviewer asks why a rule is worded a particular way and the answer is "that is what it generated," the pull request will be closed.
- **Evidence claims must be firsthand.** If the description says the validators pass, you must have run them yourself and be quoting real output. A predicted exit code is not an exit code. This is the same standard the package asks agents to meet.
- **Disclosure is fine and costs you nothing.** Saying an agent drafted the change is not a mark against it. Silently passing off unverified output as reviewed work is.

Volume is the failure mode here, not tooling. One well-argued change beats five plausible ones.

## Changing the skills

The Cursor tree is authoritative. The Codex tree is generated.

1. Edit files under `.cursor/skills/` only. Never hand-edit `.agents/skills/` — it is overwritten.
2. Regenerate the mirror and run the checks:

```bash
./scripts/sync-skills.sh
node .cursor/skills/agent-quality-loop/scripts/validate-skill.js
node scripts/validate-workflow.js
git diff --check
```

All of these must pass. CI runs the same validators and additionally fails if the mirror has drifted.

3. If you add or change a rule, add or update a case in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). A rule with no case is a rule nobody can tell is broken.

## House style

- **English is canonical.** Chinese appears in two places on purpose: quoted example user input, which demonstrates that routing reads meaning rather than keywords, and tables that map Chinese phrasing to concrete controls. Do not introduce Chinese as a skill's own vocabulary.
- Use ASCII punctuation in English sentences. Full-width colons, quotes, and pipes belong only inside Chinese text.
- Rules are prose, not ceremony. If a sentence does not change what an agent would do, it does not belong.
- Keep additions small. This package's usefulness depends on an agent actually reading it, and every added paragraph competes for attention with the rules already there.

## What gets rejected

- Enforcement mechanisms for the semantic gates. Deterministic hooks can check that a procedure ran; they cannot check that a judgment was right, and attaching them to a quality gate produces ritual compliance. See the reasoning recorded in `.ai/knowledge/lessons.md`.
- New required output sections. The package already fights verbosity.
- Rules that restate an existing rule in different words.

## Reporting a problem

Open an issue describing what the agent did, what you expected, and which skill was active. If you can name the rule that should have fired, that is ideal, but it is not required.

There is no response-time commitment. This is unpaid work.
