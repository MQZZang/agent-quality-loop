# Personalization Protocol

How this skill fits ALIGN compile and ACCEPT expectations to the specific user over time — without questionnaires, visible ceremony, or authority drift. The carrier is the collaboration profile file (`.ai/knowledge/collaboration-profile.md` in the active project). The profile is preference data: never authority, never evidence, never a substitute for the contract.

## Contents

- [Learnable Lanes](#learnable-lanes)
- [Profile Entry Contract](#profile-entry-contract)
- [Profile Projection v1](#profile-projection-v1)
- [Fresh Mode](#fresh-mode)
- [Writing Collaboration Preferences](#writing-collaboration-preferences)
- [Growth Focus](#growth-focus)
- [Never Learn (Authority Firewall)](#never-learn-authority-firewall)
- [Observation Triggers](#observation-triggers)
- [Candidate Bootstrap (Missing Profile)](#candidate-bootstrap-missing-profile)
- [Rejected Options Lane](#rejected-options-lane)
- [Route Alias Lane](#route-alias-lane)
- [Sedimentation Tiers](#sedimentation-tiers)
- [Application Order](#application-order)
- [User-Level Paths (Opt-In Only)](#user-level-paths-opt-in-only)
- [Legacy Compatibility](#legacy-compatibility)
- [Hygiene](#hygiene)

## Learnable Lanes

| Lane | Contents | Example |
|---|---|---|
| Phrase lexicon | Recurring words → operational meaning **only after** a user-confirmed personal dictionary entry (never a universal default) | *if confirmed for this user:* “验收” → independent accept, read-only — bare “验收” alone is **not** globally fixed |
| Communication | Language, output density, structure preference, badge verbosity | conclusions in Chinese; terse summaries |
| Collaboration habits | Question threshold, scope posture, acceptance-strictness preferences, decision habits | at most one question per turn; always run the counterexample |
| Writing collaboration preferences | Narrow, context-qualified defaults for working on prose | audience and medium; source strictness; feedback density; explicitly confirmed posture default |
| Growth focus | An explicitly chosen transferable capability and observable behavior to practice over time | make causal claims traceable to sources in technical briefs |
| Rejected options | Project-scoped, confirm-first stable rejections the user does not want re-proposed | do not re-propose Redis for this project's cache layer |
| Route aliases | Confirm-first phrase → one of the fixed route ids below (personal mapping only; not a universal default) | *only after explicit confirm:* “帮我过一遍” → `accept` |

Adaptation targets ALIGN (compile fidelity) and ACCEPT (expectation fit). Do not accumulate execution-side style rules; execution quality tracks the base model, not the profile.

Phrase lexicon fires **only** for `active` entries the user has confirmed (or second-hit promoted under the sedimentation rules). Until then, do not treat colloquial words such as “验收” as if they already mean a fixed route or lifecycle phase.

## Profile Entry Contract

Every entry eligible for automatic application has the same minimum fields:

```yaml
id: stable unique id inside the profile
lane: phrase_lexicon | communication | collaboration_habit | writing_preference | growth_focus | rejected_option | route_alias
value: concrete collaboration default
scope: project | domain:<name> | task_class:<name> | user
applies_when: concrete human- and agent-readable condition
source: explicit_statement | explicit_confirmation | repeated_correction | repeated_choice
status: candidate | active | archived
last_fired: YYYY-MM-DD | never
```

`id` is a stable human-maintained slug, not a line number or a hash of wording. `applies_when` is concrete, not `appropriate`, `when relevant`, `适用时`, `TBD`, or a template marker. Dates must round-trip as real UTC calendar dates.

Candidates additionally record `source_ref` and `observed_at`. Competing preferences use `conflict_key`. A writing posture uses `writing_posture: deliver | co-create | coach`; a route alias uses separate `trigger_phrase` and canonical `route_id`. When any confirmation-only entry becomes active, record `source: explicit_confirmation` plus a stable non-secret `confirmation_ref`; a caller/model confirmation boolean is not provenance. Never store a raw full prompt. Only `active` entries with the complete contract above may enter task projection.

## Profile Projection v1

Before applying profile defaults, follow [profile-projection.md](profile-projection.md). It selects at most two matching active entries into the existing Task Contract and traces only entries that actually affect the task through `injected_refs`.

The projection is task-local and ephemeral. Do not create a persistent User Lens, a `profile_projection` envelope field, a second contract, an event ledger, a score, or a ranker. Semantic `scope` and concrete `applies_when` matching remains evidence-grounded agent judgment; deterministic validators reject placeholder conditions but do not pretend to infer user meaning.

## Fresh Mode

When the current request says to ignore historical preferences or start fresh for this task, skip project and opted-in user collaboration-profile entries, including profile phrase/route aliases. Do not update `last_fired`, delete the profile, or turn Fresh Mode into a lasting preference.

Fresh Mode does not skip current-turn instructions, project facts, `AGENTS.md`/rules, project context, technical lessons, authority, evidence, acceptance, or release boundaries. It creates no persistent state. If a full envelope is otherwise required, it may record one existing `assumptions` sentence and a measured `injected_refs` list containing no profile refs.

## Writing Collaboration Preferences

Writing preferences are stable collaboration defaults, not execution recipes. Keep each entry narrow and context-qualified: record the applicable audience, medium or task class, and only constraints such as source strictness, feedback density, or collaboration posture. Do not store fixed templates, mandatory voice/structure, or instructions that would make unrelated artifacts converge on one style.

The task-local writing posture is `deliver` | `co-create` | `coach`. A stable posture is represented by the structured `writing_posture` field, not an untyped `value: coach`. It remains a source-backed contract assumption for the current task. Do not activate a profiled posture unless the user explicitly confirms it and the entry records `confirmation_ref`; `coach` is never inferred or promoted from repeated behavior. A matching active preference constrains the collaboration, but the agent should still vary structure and voice to fit the artifact, audience, and evidence.

Use the common Profile Entry Contract fields. Use `candidate` for the first write and do not apply it in that turn.

## Growth Focus

Growth Focus lives in this same collaboration profile; do not create a learner model, exposure log, event database, or second profile. Each item must name:

- a transferable `capability` and an `observable_behavior`;
- a bounded `scope`, user-selected `collaboration_posture` or `agent_support`, `source`, `status`, `last_fired`, and `review_or_expiry`;
- when reviewed longitudinally, an `outcome` of `PILOT` | `PASS` | `FAIL` | `NOT_RUN`, linked to existing envelope history, adapter receipts, or evidence.

A Growth Focus is a user-controlled practice intention, not evidence that the user or agent has improved. Do not create one from observed performance or an agent suggestion alone: the user must explicitly choose or confirm the focus. It is never second-hit inferred, and a candidate never activates in its creation turn. `NOT_RUN` means no longitudinal conclusion may be claimed. Keep current-work quality separate: judge the present artifact against its contract and evidence whether or not a growth focus fired.

Outcome associations are descriptive only. Do not score, rank, run bandit-style optimization, embed, or infer capability from them, and do not optimize for engagement. The user may inspect, override, edit, archive, or delete every entry.

When a matching active writing preference or Growth Focus actually affects a task, record its stable entry reference and the canonical hash of the opened Markdown carrier block in the existing envelope `injected_refs`. A caller-supplied copy of the entry cannot prove source binding; when the carrier is unavailable, report source binding `NOT_RUN`. Associate a later outcome only with readable evidence whose envelope/receipt contains that reference; absence of the reference is `unknown`, not proof that the profile had no effect. Never copy raw prompts into the profile to create this association.

## Never Learn (Authority Firewall)

Refuse to record, and never apply, any "preference" that would:

- raise `action_authority` or pre-authorize external writes, deploys, publication, or destructive actions ("he always lets me push" is not learnable);
- weaken the three invariants, skip acceptance evidence, or lower a required dimension's bar;
- treat the profile as authority, task evidence, acceptance evidence, or proof of longitudinal growth;
- store secrets, credentials, raw prompts, or third-party personal data;
- infer or store identity claims, psychological diagnoses, engagement goals, or hidden capability scores;
- generalize a one-off emotional reaction or a single occurrence;
- convert “don't ask push permission” / standing release language into standing authority.

Run this firewall **before** any profile write. A learned preference may tighten rigor (for example, always run the counterexample) but can never loosen the contract floor. Delete any entry on user request, immediately.

## Observation Triggers

A **qualifying first observation** may become a **candidate** (never an active preference in the same turn) when **any** of:

- an explicit long-term collaboration statement (“以后都…”, "from now on…");
- a reusable cross-task agent-behavior correction (how the agent should work with this user, not a one-off task tweak);
- a phrase whose operational meaning the user explicitly confirmed;
- an explicit stable project-level rejection (a standing “don't propose X here”).

**Not qualifying** (do not create or update a profile from these alone):

- one-off formatting or wording for the current task;
- temporary task preference (“for this PR only…”);
- emotion or venting;
- model-inferred preferences the user never stated;
- third-party claims about the user;
- authority-shaped “preferences” (firewall).
- user silence, result acceptance, or an apparently high-quality output without explicit feedback.

Harvest still comes from RETRO after ACCEPT or FAIL/BLOCKED, or from an in-turn explicit standing statement — but the first write is always a candidate under To Confirm.

## Candidate Bootstrap (Missing Profile)

When a qualifying observation arrives and no `collaboration-profile.md` exists yet:

1. May create the file from the template's section structure (disclose the create in one summary line).
2. Write **only** under **To Confirm**.
3. **Must not** apply the entry as an active preference in the same turn.
4. Record at minimum: stable `id`, `lane`, proposed `value`, `scope`, concrete `applies_when`, allowed `source`, `source_ref`, `observed_at`, `status: candidate`, and `last_fired: never`.
5. Promote to active only after a **second independent task** shows the same signal, **or** the user explicitly confirms — except **rejected options**, **route aliases**, writing posture (especially `coach`), and **Growth Focus**, which require **explicit confirmation only** (no second-hit promote) and record `confirmation_ref`. Even an explicitly stated first-write candidate does not apply in its creation turn.
6. Read-only sessions: emit the candidate in the turn output / envelope only — **no file write**.
7. Authority-shaped content hits the firewall **before** write; refuse in one line.
8. Field-level patch only; never wholesale-rewrite the profile.

This breaks the bootstrap deadlock (nothing can sediment until a file exists) without letting the first sighting become silent policy.

## Rejected Options Lane

Project-scoped, confirm-first stable rejections the user does not want re-proposed:

- A single-task rejection stays in the envelope `non_goals` for that task only — do **not** auto-promote to the profile.
- Only an **explicit** long-term or project-boundary rejection may enter the profile (as a candidate under To Confirm first).
- Promote to `active` **only** after explicit user confirmation — no second-hit auto-promote for stable rejected options.
- Never infer a standing rejection from one non-choice among options.
- Never convert “don't ask push permission” into a rejected-option or standing-authority entry.

## Route Alias Lane

Confirm-first phrase aliases may map **only** to these route ids:

`diagnose` | `accept` | `release-check` | `resume`

Hard constraints:

- No new physical skills or command packages from aliases.
- Alias may tighten routing clarity; it must **not** raise authority or lower any assurance / evidence floor.
- Title quotes and unrelated context do not fire (same mismatch rule as the phrase lexicon).
- Explicit current-turn instruction always wins over an alias.
- Promote a route alias to `active` **only** after explicit user confirmation of the phrase → route-id mapping — repeated mentions alone do **not** auto-promote (unlike communication / low-risk preference lanes).
- Store the phrase and route separately as `trigger_phrase` plus `route_id`; never parse an unrestricted route from prose in `value`.

## Sedimentation Tiers

| Tier | Lanes | Write rule |
|---|---|---|
| Candidate-first | Phrase lexicon, communication, collaboration habits, writing preferences, Growth Focus, rejected options, route aliases | First qualifying observation → To Confirm with `status: candidate`; do not apply as active the same turn |
| Confirm / second-hit promote | Phrase lexicon, communication, collaboration habits, narrow writing preferences (low-risk prefs only; excludes posture) | Promote to `active` after explicit user confirm **or** a second independent task with the same signal; disclose the promotion in one line |
| Explicit confirm only | Rejected options, route aliases, writing posture, Growth Focus | Promote to `active` **only** after explicit user confirmation — repeated mentions alone never auto-promote; never apply in the candidate-creation turn |
| Never | Firewall list above; any authority-shaped or evidence-lowering “preference” | Do not write, do not apply; when the user's words implied one, state the refusal in one line — forever refuse, no sedimentation |

Read-only sessions emit candidates in the turn summary / envelope instead of writing. Creating a missing profile file is allowed only to hold To Confirm candidates under `local_write` — never to activate defaults in the create turn.

## Application Order

1. The explicit current-turn instruction — always wins.
2. Matching **active** profile entries selected through [Profile Projection v1](profile-projection.md) — applied as Guided defaults. Lexicon / alias entries fire only in their recorded sense; a quoted title or unrelated context is a mismatch: skip and do not update `last_fired`. Candidates under To Confirm and legacy entries missing the minimum contract are not applied.
3. Generic skill defaults.

This order also governs writing preferences and Growth Focus. An active entry supplies a default or practice constraint only; it never supplies authority, evidence, or acceptance. Record `last_fired` only when the scope actually matched and the entry affected the contract.

On a conflict between the turn instruction and an active profile entry, remove the entry before projection, follow the instruction, and do not rewrite the profile from one conflict; on the second consistent conflict, propose the update under To Confirm. Among profile entries sharing one `conflict_key`, same-priority different values are skipped rather than decided by stable id. A selected entry updates `last_fired` only when it actually affected the contract and field-level profile write authority is available; the receipt includes the entry id and real new date.

### Bare「验收」and related phrase disambiguation

When the user's words could change whether a **fresh context** is required, apply this default reading — then profile — then ask if still ambiguous. Current-turn explicit wording always overrides the profile. **Never** default bare「验收」to publish/release. Do **not** create a route alias unless the user explicitly confirms a long-term mapping.

| User phrasing (examples) | Treat as | Path |
|---|---|---|
| 检查一下 / 自查 / 质量检查 | current-context check or self-QA | does **not** auto-produce `ACCEPTED` |
| 独立验收 / 正式验收 / 找另一个上下文验收 | intent accept | fresh-context `ACCEPTED` path |
| 发布验收 / 能不能发 / 上线前检查 | release preflight | `RELEASE_READY` path |
| 发布 / 上线 / 推送 | separate release act | not acceptance wording alone |

**Bare「验收」** (no independent/formal/release qualifier) when it would change whether fresh context is required **and** the profile has no confirmed meaning for that phrase:

1. Prefer the sentence object / surrounding context.
2. If still conclusively ambiguous: ask **one** choice question exactly like: 你这里指“独立质量验收”，还是“发布前就绪检查”？
3. Never default「验收」to publish/release.
4. Do not invent a lasting route alias from one clarification answer unless the user explicitly confirms a long-term mapping.

## User-Level Paths (Opt-In Only)

Documented optional paths (installer does **not** seed them):

- `~/.ai/knowledge/collaboration-profile.md`
- `~/.ai/knowledge/lessons.md`

Rules:

- Do **not** default-create, default-read, or default-write under the user home.
- Touch user-level knowledge **only** when the user explicitly enables user-level knowledge for this host/session.
- When a user profile contributes a ref, preserve the current-session opt-in as a structured `user_profile_opt_in` record in the existing Task Contract `assumptions`, and require the host/CLI opt-in flag as a second runtime gate.
- A project profile must **never** silently migrate to user-level.

## Legacy Compatibility

Existing profile text remains readable and must not be deleted or wholesale-rewritten. An old entry missing any of `id`, `lane`, `value`, `scope`, `applies_when`, `source`, `status`, or `last_fired` is not automatically projected as active. Normalize it only through explicit confirmation or the next authorized field-level edit.

Legacy source labels such as `observed` and `confirmed` may be preserved as historical text, but they do not satisfy the new source field until normalized (`confirmed` normally becomes `explicit_confirmation`; ambiguous `observed` requires a source-backed choice). Do not silently migrate project entries to user-level or expose absolute home paths in shared reports.

## Hygiene

- Every projectable entry carries the full Profile Entry Contract. `source` is one of `explicit_statement` | `explicit_confirmation` | `repeated_correction` | `repeated_choice`; `status` is `candidate` | `active` | `archived`; `last_fired` is `YYYY-MM-DD` | `never`. Candidates use `last_fired: never` until promoted and first applied.
- RETRO may harvest at most **3 total candidates across lessons plus the profile**; at most **2** may be profile candidates. Growth Focus uses this profile lane and does not add another quota.
- An active entry not fired for 90 days may be proposed for review. Do not silently archive from elapsed time or a claimed mismatch count unless readable measured injection history supports it or the user confirms the change. Candidates that sit unconfirmed may be dropped or left under To Confirm; they are never auto-applied by age.
- Prefer at most 15 active lexicon/alias entries and 10 active preference/Growth Focus entries; merge near-duplicates before adding.
- Field-level patch only; never rewrite the profile wholesale.
- Keep entries plain language, host- and model-agnostic: the profile must mean the same thing to any agent that reads it.
- Fresh Mode, skipped entries, current-turn overrides, and entries that did not affect the contract never update `last_fired`.
