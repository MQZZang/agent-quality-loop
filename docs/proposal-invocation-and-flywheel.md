# Proposal: Invocation Surface and Growth Flywheel

**Status:** open proposal. Nothing here is adopted, and no packaged behavior changes until a stage below is separately implemented, probed, and accepted.

**Question it answers.** A user of this package asked three things: how to make each lifecycle step (align / evidence / execute / accept / release / resume) faster and more consistent to invoke across Cursor, Codex, and Claude Code; whether the collaboration growth flywheel's trigger mechanism is sound; and how a user profile could dynamically shape which parts of the package fire, in the spirit of a recommendation system's core paradigm rather than a fixed configuration.

**Baseline.** Repository at `65c2b1b`, clean tree, Node v22.14.0, measured 2026-08-12. Reproduce every observation with the commands in the [appendix](#appendix-verification-commands).

## 1. The three questions compile to one goal

The user-observable outcome behind all three questions is the same: **over months of use, the package should cost less per task and be more right per task than it was the month before, without the user having to remember how it works.**

That decomposes into three failure modes, one per question:

| Question | Failure mode if unaddressed |
|---|---|
| Invocation | Each turn re-negotiates routing in prose; cheap models bind the wrong mode; the user retypes the same boundary clauses |
| Flywheel | Memory grows by accumulation rather than by selection, so retrieval quality decays as the corpus grows |
| Personalization | Adaptation is either absent or unauditable, and an unauditable adaptation contradicts the package's own evidence standard |

## 2. One shared root cause

The package specifies a complete nervous system and never grows the organ that produces the signal.

The canonical envelope is fully defined ([contracts.md](../.cursor/skills/agent-quality-loop/references/contracts.md) `Phase Summary and Full Envelope`), structurally validated by `scripts/validate-envelope.js` across 35 regression cases, aggregated by `scripts/aql-stats.js`, and named by [CONTRIBUTING.md](../CONTRIBUTING.md) as the measurement input for the capability re-baseline policy. But nothing writes it. Persistence is prose addressed to the agent: "Persist or hand off at every stopping point," with the local cache described as optional. Exactly three things in the repository write under `.agent-quality-loop/`, and none of them is a runtime envelope: the stop-gate's anti-loop marker file, the hook test harness's fixtures, and `validate-envelope.js`'s self-test temporaries.

The consequence is measurable in this repository, which authored the mechanism:

```text
$ node scripts/aql-stats.js
Envelopes scanned: 0 (parsed 0, invalid 0)
MISSING input (skipped): /workspace/.agent-quality-loop
```

Zero. The same absence explains the second observation: `.ai/knowledge/` contains `lessons.md` with ten entries but no `collaboration-profile.md` at all, only the template. Across 50 commits since 2026-06-17, one flywheel lane produced artifacts and the other produced nothing.

This single gap starves all three questions:

- **Invocation.** The user asked for multi-step macros. The expensive part of a multi-step workflow is not typing the second step, it is that the second step re-derives the contract the first step already compiled. Chaining requires a carrier. There is none.
- **Flywheel.** Deciding whether a lesson earns its slot requires knowing when it fired and what followed. `last_fired` records exposure; nothing records what followed.
- **Personalization.** Any ranking policy, learned or fixed, needs an exposure log joined to an outcome. The envelope is exactly that log, unwritten.

Fixing the carrier is a prerequisite, not a feature. The rest of this proposal assumes it.

## 3. Question 1 — invocation

### 3.1 The premise does not survive grounding

The question proposed command macros. Verified 2026-08-12, all three target hosts have removed or absorbed the command surface, and all three converged on skills as the single invocation primitive:

| Host | Status of the command surface | Source (read 2026-08-12) |
|---|---|---|
| Cursor | `.cursor/commands/` still loads but is legacy; the built-in `/migrate-to-skills` skill (2.4+) converts user- and workspace-level commands into skills with `disable-model-invocation: true`; the commands page is gone from the docs | [cursor.com/docs/skills.md](https://cursor.com/docs/skills.md) |
| Claude Code | "Custom commands have been merged into skills. A file at `.claude/commands/deploy.md` and a skill at `.claude/skills/deploy/SKILL.md` both create `/deploy` and work the same way." | [code.claude.com/docs/en/slash-commands](https://code.claude.com/docs/en/slash-commands) |
| Codex CLI | Custom prompts removed entirely: "They have been removed completely starting in 0.117.0. You should convert your custom prompts to skills." | OpenAI maintainer reply on [openai/codex#15941](https://github.com/openai/codex/issues/15941), 2026-03-27 |

Building a `commands/` or `prompts/` directory would target a surface two of three hosts have deleted. The macro layer must be skills. That is convenient rather than limiting: `sync-skills.js` already mirrors any directory containing a `SKILL.md` into both distribution trees, `gen-manifest.js` already hashes it, and `install.js` already ships to all three hosts.

### 3.2 The friction is not typing

Natural language already works, and the README documents `/agent-quality-loop accept: ...` as an explicit form. So a macro that only saves keystrokes buys little, and a macro that expands into a long prompt costs context, which is the genuinely scarce resource.

The friction that a macro can actually remove is **mode-binding inference**. Today the executor must read free text and derive `intent`, `assurance`, and `action_authority`. [MATRIX.md](../MATRIX.md) records that this inference is tier-dependent: the align-versus-evidence mode-label variance surfaced only once probes ran across tiers. The tier-routing lesson in `.ai/knowledge/lessons.md` draws the conclusion directly — after two same-shape failures, "stop stacking ALIGN prose; the residual is a routing decision, not a wording decision."

A user-fired route shim *is* that routing decision. It replaces an inference with a declaration.

### 3.3 Which routes deserve a shim

Not one per mode. The selection rule follows from what a shim actually buys:

> Shim the routes whose misrouting is expensive and whose invocation is rare enough to be forgotten. Leave the everyday route on the natural-language router.

Every added skill competes for the model's attention when it decides what is relevant, so a shim for the common case makes routing harder, not easier. That yields four:

| Shim | Binds | Why it qualifies |
|---|---|---|
| `aql-diagnose` | `intent: diagnose`, `mode: evidence`, `action_authority: read` | Misrouting writes files the user asked not to touch |
| `aql-accept` | `intent: accept`, `mode: accept`, `action_authority: read` | Misrouting lets the implementer approve its own work |
| `aql-release-check` | `intent: release`, `mode: release`, `release_intent: preflight`, `action_authority: read` | Misrouting is the one route with external consequences |
| `aql-resume` | `intent: resume`, reconstruction-first | Rarely used, and the route most dependent on the carrier from stage 2 |

`implement` and `full` get no shim. They are the daily path, the router handles them well, and adding them would inflate the catalog for no reduction in risk.

Two hard constraints on the shim body, both mechanically checkable:

1. **Thirty lines maximum.** A shim declares the three axes, points at `agent-quality-loop` for the lifecycle contract, and stops. Inlining contract text would duplicate the source of truth and burn context.
2. **No second lifecycle output.** A shim is an entry point, not an adapter. It reuses the language already applied to embedded adapters: it consumes the contract and does not emit a second alignment summary.

### 3.4 The portability cost, and how to contain it

`disable-model-invocation` is what makes a shim behave like a command instead of a fifth competing skill description. It is a Cursor and Claude Code extension, not part of the Agent Skills spec. The Claude Code documentation is explicit that this is a hard failure rather than an ignored field:

> If you include any field the spec doesn't allow, packaging or upload fails with a hard error instead of ignoring the field:
> `Unexpected key(s) in SKILL.md frontmatter: argument-hint. Allowed properties are: allowed-tools, compatibility, description, license, metadata, name`

Those six fields are exactly the allowlist this package already enforces in `.cursor/skills/agent-quality-loop/scripts/validate-skill.js`. Strict-spec portability is therefore a deliberate existing policy, not an accident, and the shims cannot quietly break it.

Three options, with the tradeoff stated rather than resolved:

| Option | Effect |
|---|---|
| A. Ship shims without the field | Spec-clean everywhere, but the model may auto-fire them; four new descriptions compete with the router and the shim becomes a liability |
| B. Add the field to the core suite | Shims behave correctly on Cursor and Claude Code; claude.ai uploads, the Skills API, and `package_skill.py` hard-fail for the whole package |
| C. Ship shims as a separate opt-in suite that carries the field, keep `core` and `full` six-field clean | Correct behavior where installed, portability cost confined to a surface the user chooses |

Recommendation: **C**, with the field policy expressed per package in the validator rather than relaxed globally. The repository already isolates optional host-specific behavior this way in `integrations/cursor-hooks/`, so the precedent exists. Option A is worse than doing nothing, because a shim the model can fire on its own is a routing hazard rather than a routing decision.

### 3.5 Exact code-change points

Adding skill packages is not free. Distribution is automatic, but three files need edits and two of those hold hardcoded literals. Verified by reading each one:

| File | Change | Automatic? |
|---|---|---|
| `scripts/gen-manifest.js` | none | Yes — `listPackageSkillDirs` picks up any directory with a `SKILL.md` |
| `scripts/sync-skills.js` | none | Yes — mirrors whatever the Cursor tree contains |
| `plugin.json` | none | Yes — it names the component root, not individual skills |
| `scripts/install.js` | add a `routes` entry to `SUITES` and a `--suite routes` path | No — `SUITES` is a hardcoded literal |
| `scripts/validate-workflow.js` | extend the hardcoded skill list, or derive it from the tree | No — the list is a literal in the loop |
| `.cursor/skills/agent-quality-loop/scripts/validate-skill.js` | generalize beyond the single hardcoded `name` check and add the per-package frontmatter policy from 3.4, plus the thirty-line shim cap | No |
| `references/evaluation-cases.md` | one case per shim | No — [CONTRIBUTING.md](../CONTRIBUTING.md) requires a case per rule |

## 4. Question 2 — is the flywheel's trigger mechanism sound

### 4.1 What is already right, and should not be rebuilt

Four properties are unusual and worth protecting. Conditional retrieval by `Applies when` rather than always-on injection keeps the corpus from becoming context noise. Decay plus an active cap bounds memory. Promotion requires an observable absorbing diff, which blocks phantom promotion. And the authority firewall in `references/personalization.md` refuses to learn permission-shaped preferences, which most memory systems leak.

The defects below are gaps in an otherwise sound design, not a case for replacing it.

### 4.2 Six defects

**D1 — The trigger is terminal-biased, so abandoned tasks harvest nothing.** RETRO fires when ACCEPT ends, when the task stops FAIL/BLOCKED, or on explicit request. Its listed sources are review-gate findings, mid-task user corrections, `scope_deviations`, and failing patterns — all of which are *mid-task* events routed through a *terminal* gate. A task the user redirects or abandons never reaches the gate, and the mid-task correction is precisely the highest-information event in the session. The trigger is bound to lifecycle completion when it should be bound to the information event.

**D2 — Exposure is measured; effect is not.** `last_fired` records that a lesson matched. Decay retires entries that stop matching. Nothing distinguishes a lesson that matched fifty times and changed nothing from one that prevented a defect every time. In recommendation-system terms: impressions are logged, conversions are not, and pruning runs on impression count.

**D3 — The reward signal is self-reported, which the package forbids elsewhere.** The Firsthand-evidence rule says an implementer's account of evidence is a claim about evidence, not evidence. Lesson harvest does not meet that bar: the agent that proposes the lesson also certifies it as verified. The package applies a stricter standard to acceptance than to its own memory.

**D4 — The profile lane has a bootstrap deadlock.** The observation triggers require the same correction "in at least two distinct tasks," or a phrase confirmed once and then recurring. A stateless session cannot count across tasks except by reading a durable file, and for the profile that file is the artifact that does not exist yet. Lessons escape the deadlock because `lessons.md` ships populated; the profile ships only as a template. The predicted asymmetry is exactly the observed one: ten lessons, zero profile entries, in the repository that authored both protocols.

**D5 — The promotion criterion selects for prose that already failed, and contradicts an active lesson.** Rule 8 of `lessons.md` promotes a lesson into a rule or skill when the same trigger recurs at least twice. Recurrence means the lesson did not prevent the failure, so promotion systematically escalates the mechanisms with a demonstrated non-response, while a lesson that works stays a lesson until decay retires it for not matching. The tier-routing lesson already reached the opposite conclusion from live probe data: after two same-shape failures, stop stacking prose, because the residual is a routing decision. Rule 8 still says promote to a rule or skill. That contradiction is unabsorbed.

**D6 — Two facts are named as essential and given no home.** `SKILL.md` states that the only facts that cannot be rebuilt from artifacts are the first-principles goal, non-goals, options the user explicitly rejected, and disclosed contradiction resolutions. Rejected options have no durable carrier: the envelope is per-task and expires, so the same rejected idea can be re-proposed indefinitely. Separately, `scope: global` is a valid value on every lesson while `lessons.md` states that this repository file does not migrate them and names no destination, so the most transferable lessons have nowhere to live and every new project starts cold.

### 4.3 Minimal fixes

Each fix reuses an existing carrier. None adds a state store, which the package prohibits.

| Defect | Fix | Cost |
|---|---|---|
| D1 | On a named mid-task event — path change, thrash unlock, scope deviation, contradiction disclosure, user correction — append a one-line candidate to the envelope immediately, so an abandoned task still leaves harvest material | One clause; no new file |
| D2 | Add `injected_refs` to the envelope, listing which lessons, profile entries, and presets were injected; extend `aql-stats.js` to cross-tabulate them against acceptance-dimension outcomes | One field, one report section |
| D3 | Bind attribution to acceptor-written fields (`acceptance_gate.status_by_dimension`) rather than implementer-written narrative, and forbid any automatic update from the efficacy report | Wording, not mechanism |
| D4 | Let the *first* observation write a candidate under the template's existing `To Confirm` section; the second observation or a user confirmation promotes it to active | One sentence in `personalization.md`; unblocks a dead lane |
| D5 | Make promotion route-typed: on recurrence, choose among prose rule, mechanism or script, routing change such as executor tier or adapter, or accepting it as disclosed residual risk — each requiring an observable diff | Rewrites rule 8; lets the tier-routing lesson finally be marked `promoted` |
| D6 | Give rejected options a lane in the collaboration profile under the existing firewall; name the user-level path for global lessons and seed it at install time | One profile section; one installer step |

D4 is the highest ratio in the table: one sentence, no new mechanism, and it converts a lane that has produced nothing since the protocol shipped into one that can produce something on the first observation.

## 5. Question 3 — porting the recommendation-system paradigm

### 5.1 Which preconditions hold

A recommendation system works because four conditions hold simultaneously. Checking them here is the whole analysis:

| Precondition | Ad ranking | Skill orchestration |
|---|---|---|
| Event volume | Billions | Tens to hundreds per user per year |
| Reward signal | Immediate, cheap, unambiguous | Delayed, expensive, often never observed |
| Cost of a wrong recommendation | One wasted impression | A wrong-scope edit or a false acceptance |
| Counterfactual availability | Randomized holdout is routine | Absent; you never see the other route |

None of the four holds. A learned ranker at this volume would overfit on its first dozen samples, and — the disqualifying objection — it would be **unauditable**, which contradicts the package's central claim that every conclusion is bound to readable evidence. A recommender that cannot show why it recommended is exactly the artifact this package exists to prevent.

### 5.2 What transfers is the architecture, not the model

The paradigm is worth porting; the machine learning is not. Replace each learned component with a deterministic, inspectable one:

| Recsys component | Naive port | Correct port here | Already exists? |
|---|---|---|---|
| Item catalog | Ad inventory | The finite versioned set of injectables: presets, lessons, profile entries, domain profiles, probes, route shims | Yes, uncatalogued |
| Recall | Embedding search | The `Applies when` predicate | Yes |
| Ranking | Learned click model | Fixed priority plus an injection budget, ordered by severity of the failure prevented times match specificity | No |
| Impression log | Event pipeline | The envelope's `injected_refs` | No (D2) |
| Conversion | Click | Acceptor-written dimension outcomes and scope deviations | Partly |
| Online learning | Gradient updates | Human-confirmed promotion and retirement, each with an observable diff | Yes |
| Exploration | Epsilon-greedy | Deliberate ablation, already specified as evaluation case 35 | Yes |
| Guardrails | Brand safety | The authority firewall | Yes, and it is the strongest part |

Six of the eight rows already exist in some form. The genuinely missing pieces are the impression log, which is one envelope field, and an explicit injection budget. The paradigm's value here is that it names those two precisely and rules out everything else it might have suggested.

### 5.3 The one thing worth copying

Not the ranker: **the impression-to-outcome join.** You cannot select what you never measured, and selection — not accumulation — is what keeps a growing corpus useful. Adding `injected_refs` to the envelope and one cross-tabulation to `aql-stats.js` produces, for the first time, a report of the form "this lesson fired eleven times; the tasks it fired in failed `goal_fidelity` twice."

Three honesty constraints, without which this becomes the thing it is meant to prevent:

1. **It is descriptive, never inferential.** At this volume the join is a review prompt for a human, not evidence of causation. It ranks what to *examine*, not what to *believe*.
2. **Causation requires ablation.** The only honest counterfactual is suppressing a lesson and seeing whether the failure returns. That is expensive, so reserve it for promotion candidates. Evaluation case 35 already specifies the control.
3. **Goodhart applies immediately.** Once efficacy is visible, an agent that writes both the injection list and the outcome is grading its own homework. Attribution must read acceptor-written fields only, and the report must never auto-update anything.

### 5.4 Where personalization meets the macro layer

This is where the three questions close into one loop, and most of it is already built.

The profile's phrase lexicon already maps a user's recurring words to a compiled meaning — the documented example is "验收" mapping to independent accept mode, read-only. Extending a lexicon entry to name a **route** rather than only a meaning turns the user's own vocabulary into their personal macro. The user never learns a command; the command learns the user. Under the existing firewall a lexicon entry can tighten a route but can never raise authority, so a standing "he always lets me push" stays unlearnable no matter how often it is said.

The route shims then become ordinary catalog items governed by the same flywheel: each carries `last_fired`, appears in `injected_refs` when fired, decays when unused, and — the part that answers "not rigid" — a natural-language invocation pattern observed twice becomes a shim candidate under `To Confirm`. The macro set grows from observed use and shrinks by the same decay rule as everything else.

## 6. Staged plan

Each stage is independently shippable and independently killable. Ordered by ratio and dependency, not by size.

### Stage 1 — Break the profile bootstrap deadlock

Change: allow the first observation to write a candidate under `To Confirm` in `references/personalization.md`; promotion to active still needs a second observation or user confirmation.

Success observable: after one session containing a repeated user correction, `.ai/knowledge/collaboration-profile.md` exists and contains at least one `To Confirm` entry, disclosed in the turn summary.

Counterexample that fails the stage: a candidate is applied as a preference before confirmation, or an authority-shaped preference reaches the file.

Kill criterion: if ten sessions produce candidates the user never promotes, the observation triggers are wrong; shrink them rather than lowering the confirmation bar.

### Stage 2 — Materialize the carrier

Change: a mechanical `scripts/aql-envelope.js` that validates an envelope on stdin and writes `.agent-quality-loop/envelope.json` plus a uniquely suffixed history snapshot, and a mechanically decidable extension to the existing stop-gate that notices a completion-class phase with no envelope written.

Why the hook matters: the skill-factory Mechanism Survival Test predicts that a process-constraining, on-demand mechanism dies unexecuted, and the same document's measured corpus shows exactly that pattern for two process-bound mechanisms. Writing the envelope is process-bound, so prose alone will not produce it. Binding it to a completion-class phase makes it deliverable-bound. This stays inside the closed-branch boundary in `lessons.md`, which permits hooks for mechanically decidable envelope predicates and forbids them for semantic gates: "was an envelope written" is decidable, "is the envelope true" is not, and the hook must not imply the second.

Success observable: after one ordinary task in a consumer project, `node scripts/aql-stats.js` reports at least one parsed envelope with a phase and a verdict.

Counterexample that fails the stage: envelopes appear whose contents contradict the workspace, which would mean the cache is being trusted over reality and would violate the reality-first resume order.

Kill criterion: if written envelopes are never read by a resume or a report, the carrier is ceremony; delete it rather than defend it.

### Stage 3 — Route shims

Change: the four shims from 3.3, as an opt-in `routes` suite, with the per-package frontmatter policy and thirty-line cap from 3.4 enforced in the validator, plus one evaluation case each.

Success observable: on a budget-tier executor, a blind probe invoking the shim binds the declared authority and does not write files, where the same request in free text previously varied by tier. This is the measurement that justifies the stage; `probes/PROBES.md` and `MATRIX.md` already define how to run and record it.

Counterexample that fails the stage: any shim emits a second lifecycle summary, or exceeds the line cap, or fires without the user invoking it.

Kill criterion: if the tier-variance the shims target stops reproducing across tiers, the capability re-baseline policy applies and the shims are deletion candidates, not fixtures.

### Stage 4 — Close the loop

Change: `injected_refs` in the envelope; mid-task candidate capture (D1); the `aql-stats.js` cross-tabulation; the route-typed promotion rule (D5); the rejected-options lane and the global lessons path (D6).

Success observable: `node scripts/aql-stats.js` prints, for at least one lesson, the number of tasks it was injected into and the acceptance-dimension outcomes of those tasks.

Counterexample that fails the stage: the report changes a lesson's status without a human decision, or attribution reads implementer-written narrative.

Kill criterion: the Mechanism Survival Test's stop-loss applies to the report itself. If it runs roughly ten times and the user never acts on it, it has become false confidence that a risk is covered; shorten or remove it.

## 7. Blind spots

Stated as things that would make this proposal wrong, not as caveats.

- **The shim catalog could make routing worse.** Four more skills is four more descriptions competing at selection time. The proposal assumes the deterministic binding outweighs the added ambiguity. That assumption is untested and stage 3's probe is what tests it.
- **The efficacy report could become the ceremony it is meant to replace.** It is a process mechanism, which is the class the survival test predicts will die. Its stop-loss is written into stage 4 for that reason.
- **The corpus is ten lessons from one author, dated inside a three-day window, all about maintaining this repository.** Any conclusion about retrieval quality at scale is extrapolation. `Applies when` is prose matched by a model, and prose matching degrades with corpus size in ways ten entries cannot show.
- **`SKILL.md` has roughly 175 lines of headroom under its 500-line cap and `contracts.md` sits at 499.** Every fix above is deliberately a field, a script, or a sentence, because the prose budget for this package is nearly spent. A fix that needs a new section is the wrong fix.
- **Host facts expire.** All three invocation findings were read on 2026-08-12 and two of the three surfaces changed within the preceding six months. Re-verify before implementing stage 3.
- **Writing the envelope creates a new failure mode.** A stale cache that disagrees with the workspace is worse than no cache. `contracts.md` already resolves this in favor of observable reality; stage 2's counterexample exists to check that the resolution actually holds once files are on disk.

## 8. Deliberately not proposed

- No learned ranker, scoring model, or embedding index. Section 5.1 gives the reason.
- No telemetry that leaves the machine. Every artifact is local and inspectable.
- No new lifecycle phase, mode, or state store. Each fix reuses the envelope, `lessons.md`, or the profile.
- No hook that touches a semantic gate. That branch is closed in `.ai/knowledge/lessons.md` and nothing here reopens it.
- No `commands/` or `prompts/` directory. Two of three hosts deleted that surface.

## Appendix: verification commands

```bash
node scripts/aql-stats.js                                            # 0 envelopes at 65c2b1b
ls .ai/knowledge/                                                    # template, no collaboration-profile.md
node scripts/sync-skills.js --check                                  # mirrors consistent
node scripts/validate-workflow.js                                    # routing, policies, portability
node .cursor/skills/agent-quality-loop/scripts/validate-skill.js     # package structure + 35 envelope cases
wc -l .cursor/skills/agent-quality-loop/SKILL.md                     # prose budget against the 500-line cap
```
