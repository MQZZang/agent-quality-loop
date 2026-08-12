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

The Cursor tree is authoritative for **core** packages. The Codex tree (`.agents/skills/`) and the Agent Plugins tree (top-level `skills/`) are generated mirrors for core packages via `scripts/sync-skills.js`.

**Route packages** (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) are generated from `integrations/route-shims/routes.json` by `scripts/gen-route-shims.js` into `dist/route-shims/{cursor,agents,plugins}/`. They must never be hand-edited and must not appear under default discovery trees (`.cursor/skills`, `.agents/skills`, or `skills/`). The installer exposes them via `--suite routes` (not part of `core`/`full`); that suite also installs the compatible `agent-quality-loop` parent. **Uninstall is manual** — delete the installed folders from each user skill tree. See [integrations/route-shims/README.md](integrations/route-shims/README.md) for invocation syntax (Codex `$…` vs Cursor/Claude `/…`).

Each skill's adjacent `manifest.json` is the version and distribution source of truth. The public Node installer produces portable real-file snapshots and refuses to replace an existing junction; it does not create live links. Maintainers may manually keep Cursor live through a junction to `.cursor/skills/<name>`, while Codex maintenance consumes snapshots from generated `.agents/skills/<name>`. Optional Cursor hooks are mechanical predicates, never semantic acceptance.

1. Edit core files under `.cursor/skills/` only. Never hand-edit `.agents/skills/` or `skills/` for core packages — both are overwritten by sync.
2. Edit route bindings in `integrations/route-shims/routes.json` only. Regenerate into `dist/route-shims/`; never hand-edit generated route packages or leave legacy copies under skill discovery trees.
3. Regenerate mirrors (and package manifests) and run the checks:

```bash
node scripts/sync-skills.js
node scripts/gen-route-shims.js
node scripts/validate-all.js
git diff --check
```

All of these must pass. CI runs `node scripts/validate-all.js`, which includes mirror drift (`node scripts/sync-skills.js --check`) and route-shim drift (`node scripts/gen-route-shims.js --check`).

3. If you add or change a rule, add or update a case in [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). A rule with no case is a rule nobody can tell is broken.

## Capability re-baseline

Models improve, and a mechanism that earns its keep today can be pure ceremony a year from now — that is how mature skill packages age into obstacles. To keep this one prunable:

- Every behavioral mechanism must name the failure mode it counters. A mechanism nobody can tie to a failure mode is already a removal candidate.
- When the host model landscape changes materially, re-run a sample of evaluation cases blind — without naming the mechanism under test — across the executor tiers recorded in `.ai/knowledge/lessons.md` (flagship / mid / budget). The packaged procedure is [probes/PROBES.md](probes/PROBES.md) and results accumulate in [MATRIX.md](MATRIX.md). If the failure mode no longer reproduces on any tier, demote the mechanism: fold it into a shorter invariant or delete it, and cite the probe evidence in the change.
- Deletions get the same review bar as additions, but shrinking is a success, not a regression. The ceremony budget and the proactive assurance downgrade are the runtime half of this policy; this section is the maintenance half.
- `node scripts/aql-stats.js` aggregates envelope snapshots (`.agent-quality-loop/` in a consumer project). Only **valid, ordered** writer snapshots enter qualified outcomes; exposures are the per-contract timeline union of `injected_refs` (`kind+ref+content_sha256`); current phase follows max `snapshot.sequence` (not highest historical phase); legacy unordered files are reported but not qualified. Absence of `injected_refs` means measurement unknown, not “nothing injected.” Associations are descriptive — **observable and falsifiable, not causally proven**. Read-only tasks may leave no local envelope; report coverage anyway. Use the aggregator as measurement input when deciding what to demote, instead of anecdote. The optional Cursor authority hook never auto-allows external writes; exact `execution_plan` match yields native `ask` only.

## First contributions

Three entry points that need no prior context, in rising order of effort:

1. **Run the probes on your model and PR a matrix row.** Follow [probes/PROBES.md](probes/PROBES.md); attach the transcript and the `--verify` output. FAIL rows are as valuable as PASS rows — they are what the re-baseline policy runs on.
2. **Report a failure sample.** A real transcript where an agent following this package mis-routed, over-ceremonied, or claimed without evidence — with the raw request and what you expected. These become evaluation cases.
3. **Propose an evaluation case.** A written scenario with decidable expected behavior and fail lines, matching the style of [evaluation-cases.md](.cursor/skills/agent-quality-loop/references/evaluation-cases.md). A rule with no case is a rule nobody can tell is broken.

## House style

- **English is canonical.** Chinese appears in two places on purpose: quoted example user input, which demonstrates that routing reads meaning rather than keywords, and tables that map Chinese phrasing to concrete controls. Do not introduce Chinese as a skill's own vocabulary.
- Use ASCII punctuation in English sentences. Full-width colons, quotes, and pipes belong only inside Chinese text.
- **Do not let your editor strip trailing whitespace in `.md` and `.mdc` files.** Two trailing spaces are a Markdown hard line break and several rules depend on them. `.gitattributes` turns off the trailing-space check for these files, so a stripping editor will silently reflow them and `git diff --check` will not warn you.
- Rules are prose, not ceremony. If a sentence does not change what an agent would do, it does not belong.
- Keep additions small. This package's usefulness depends on an agent actually reading it, and every added paragraph competes for attention with the rules already there.

## What gets rejected

- Enforcement mechanisms for the semantic gates. Deterministic hooks can check that a procedure ran; they cannot check that a judgment was right, and attaching them to a quality gate produces ritual compliance. See the reasoning recorded in `.ai/knowledge/lessons.md`.
- New required output sections. The package already fights verbosity.
- Rules that restate an existing rule in different words.

## Reporting a problem

Open an issue describing what the agent did, what you expected, and which skill was active. If you can name the rule that should have fired, that is ideal, but it is not required.

There is no response-time commitment. This is unpaid work.
