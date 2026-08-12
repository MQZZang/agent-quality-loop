# Personalization Protocol

How this skill fits ALIGN compile and ACCEPT expectations to the specific user over time — without questionnaires, visible ceremony, or authority drift. The carrier is the collaboration profile file (`.ai/knowledge/collaboration-profile.md` in the active project, or a user-level file with the same format when the host provides one). The profile is preference data: never authority, never evidence, never a substitute for the contract.

## Contents

- [Learnable Lanes](#learnable-lanes)
- [Never Learn (Authority Firewall)](#never-learn-authority-firewall)
- [Observation Triggers](#observation-triggers)
- [Sedimentation Tiers](#sedimentation-tiers)
- [Application Order](#application-order)
- [Hygiene](#hygiene)

## Learnable Lanes

| Lane | Contents | Example |
|---|---|---|
| Phrase lexicon | The user's recurring words mapped to the operational meaning both sides settled on | user's “验收” = independent accept mode, read-only |
| Communication | Language, output density, structure preference, badge verbosity | conclusions in Chinese; terse summaries |
| Collaboration habits | Question threshold, scope posture, acceptance-strictness preferences, decision habits | at most one question per turn; always run the counterexample |

Adaptation targets ALIGN (compile fidelity) and ACCEPT (expectation fit). Do not accumulate execution-side style rules; execution quality tracks the base model, not the profile.

## Never Learn (Authority Firewall)

Refuse to record, and never apply, any "preference" that would:

- raise `action_authority` or pre-authorize external writes, deploys, publication, or destructive actions ("he always lets me push" is not learnable);
- weaken the three invariants, skip acceptance evidence, or lower a required dimension's bar;
- store secrets, credentials, or personal data beyond collaboration behavior;
- generalize a one-off emotional reaction or a single occurrence.

A learned preference may tighten rigor (for example, always run the counterexample) but can never loosen the contract floor. Delete any entry on user request, immediately.

## Observation Triggers

Observe a candidate only from:

- RETRO after an ACCEPT or FAIL/BLOCKED stop — the same harvest pass as lessons, yielding 0–2 profile candidates;
- the same correction of agent behavior in at least two distinct tasks (for example, output shortened on request twice);
- an explicit standing statement by the user (“以后都…”, "from now on…"); a single-turn style request is not a standing preference;
- a phrase whose compiled meaning had to be confirmed once and then recurred — record the settled mapping in the lexicon.

## Sedimentation Tiers

| Tier | Lanes | Write rule |
|---|---|---|
| Auto (observed defaults) | Phrase lexicon, communication | With `local_write` and a permitted target file: write directly, mark `source: observed`, disclose the diff in one summary line, apply immediately |
| Confirm-first | Collaboration habits that change decision behavior (question threshold, scope posture, acceptance strictness) | Propose under the profile's To Confirm section; apply only after user confirmation |
| Never | Firewall list above | Do not write, do not apply; when the user's words implied one, state the refusal in one line |

Read-only sessions emit candidates in the turn summary instead of writing. When no profile file exists and the auto tier has something to write under `local_write`, create the file from the template's section structure and disclose it.

## Application Order

1. The explicit current-turn instruction — always wins.
2. Matching profile entries — applied as defaults. A lexicon entry fires only when the phrase is used in its recorded sense; a quoted title or unrelated context is a mismatch: skip it and do not update `last_fired`.
3. Generic skill defaults.

On a conflict between the turn instruction and the profile, follow the instruction and do not rewrite the profile from one conflict; on the second consistent conflict, propose the update under To Confirm.

## Hygiene

- Every entry carries `source` (`observed` | `confirmed`), `status` (`active` | `archived`), and `last_fired` (`YYYY-MM-DD` | `never`).
- Same decay rule as lessons: not fired for 90 days, or mismatched across the 10 most recent injection windows, moves the entry to `archived` (kept for manual revival, no longer applied).
- Prefer at most 15 active lexicon entries and 10 active preference entries; merge near-duplicates before adding.
- Field-level patch only; never rewrite the profile wholesale.
- Keep entries plain language, host- and model-agnostic: the profile must mean the same thing to any agent that reads it.
