# Personalization Protocol

How this skill fits ALIGN compile and ACCEPT expectations to the specific user over time — without questionnaires, visible ceremony, or authority drift. The carrier is the collaboration profile file (`.ai/knowledge/collaboration-profile.md` in the active project). The profile is preference data: never authority, never evidence, never a substitute for the contract.

## Contents

- [Learnable Lanes](#learnable-lanes)
- [Never Learn (Authority Firewall)](#never-learn-authority-firewall)
- [Observation Triggers](#observation-triggers)
- [Candidate Bootstrap (Missing Profile)](#candidate-bootstrap-missing-profile)
- [Rejected Options Lane](#rejected-options-lane)
- [Route Alias Lane](#route-alias-lane)
- [Sedimentation Tiers](#sedimentation-tiers)
- [Application Order](#application-order)
- [User-Level Paths (Opt-In Only)](#user-level-paths-opt-in-only)
- [Hygiene](#hygiene)

## Learnable Lanes

| Lane | Contents | Example |
|---|---|---|
| Phrase lexicon | Recurring words → operational meaning **only after** a user-confirmed personal dictionary entry (never a universal default) | *if confirmed for this user:* “验收” → independent accept, read-only — bare “验收” alone is **not** globally fixed |
| Communication | Language, output density, structure preference, badge verbosity | conclusions in Chinese; terse summaries |
| Collaboration habits | Question threshold, scope posture, acceptance-strictness preferences, decision habits | at most one question per turn; always run the counterexample |
| Rejected options | Project-scoped, confirm-first stable rejections the user does not want re-proposed | do not re-propose Redis for this project's cache layer |
| Route aliases | Confirm-first phrase → one of the fixed route ids below (personal mapping only; not a universal default) | *only after explicit confirm:* “帮我过一遍” → `accept` |

Adaptation targets ALIGN (compile fidelity) and ACCEPT (expectation fit). Do not accumulate execution-side style rules; execution quality tracks the base model, not the profile.

Phrase lexicon fires **only** for `active` entries the user has confirmed (or second-hit promoted under the sedimentation rules). Until then, do not treat colloquial words such as “验收” as if they already mean a fixed route or lifecycle phase.

## Never Learn (Authority Firewall)

Refuse to record, and never apply, any "preference" that would:

- raise `action_authority` or pre-authorize external writes, deploys, publication, or destructive actions ("he always lets me push" is not learnable);
- weaken the three invariants, skip acceptance evidence, or lower a required dimension's bar;
- store secrets, credentials, or personal data beyond collaboration behavior;
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

Harvest still comes from RETRO after ACCEPT or FAIL/BLOCKED, or from an in-turn explicit standing statement — but the first write is always a candidate under To Confirm.

## Candidate Bootstrap (Missing Profile)

When a qualifying observation arrives and no `collaboration-profile.md` exists yet:

1. May create the file from the template's section structure (disclose the create in one summary line).
2. Write **only** under **To Confirm**.
3. **Must not** apply the entry as an active preference in the same turn.
4. Record at minimum: lane, proposed value, scope, source/task ref, observed date, `status: candidate`.
5. Promote to active only after a **second independent task** shows the same signal, **or** the user explicitly confirms — except **rejected options** and **route aliases**, which require **explicit confirmation only** (no second-hit promote).
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

## Sedimentation Tiers

| Tier | Lanes | Write rule |
|---|---|---|
| Candidate-first | Phrase lexicon, communication, collaboration habits, rejected options, route aliases | First qualifying observation → To Confirm with `status: candidate`; do not apply as active the same turn |
| Confirm / second-hit promote | Phrase lexicon, communication, collaboration habits (low-risk prefs only) | Promote to `active` after explicit user confirm **or** a second independent task with the same signal; disclose the promotion in one line |
| Explicit confirm only | Rejected options, route aliases | Promote to `active` **only** after explicit user confirmation of the mapping — repeated mentions alone never auto-promote |
| Never | Firewall list above; any authority-shaped or evidence-lowering “preference” | Do not write, do not apply; when the user's words implied one, state the refusal in one line — forever refuse, no sedimentation |

Read-only sessions emit candidates in the turn summary / envelope instead of writing. Creating a missing profile file is allowed only to hold To Confirm candidates under `local_write` — never to activate defaults in the create turn.

## Application Order

1. The explicit current-turn instruction — always wins.
2. Matching **active** profile entries — applied as defaults. Lexicon / alias entries fire only in their recorded sense; a quoted title or unrelated context is a mismatch: skip and do not update `last_fired`. Candidates under To Confirm are not applied.
3. Generic skill defaults.

On a conflict between the turn instruction and an active profile entry, follow the instruction and do not rewrite the profile from one conflict; on the second consistent conflict, propose the update under To Confirm.

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
- A project profile must **never** silently migrate to user-level.

## Hygiene

- Every entry carries `source` (`observed` | `confirmed`), `status` (`candidate` | `active` | `archived`), and `last_fired` (`YYYY-MM-DD` | `never`). Candidates use `last_fired: never` until promoted and first applied.
- Same decay rule as lessons: an `active` entry not fired for 90 days, or mismatched across the 10 most recent injection windows, moves to `archived` (kept for manual revival, no longer applied). Candidates that sit unconfirmed may be dropped or left under To Confirm; they are never auto-applied by age.
- Prefer at most 15 active lexicon/alias entries and 10 active preference entries; merge near-duplicates before adding.
- Field-level patch only; never rewrite the profile wholesale.
- Keep entries plain language, host- and model-agnostic: the profile must mean the same thing to any agent that reads it.
