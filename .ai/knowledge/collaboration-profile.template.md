# Collaboration Profile Template

Copy this file to `collaboration-profile.md` in each project (or user setup) that uses this workflow pack, then fill it in — or let the agent populate it incrementally.

**What this is:** the user's **stable collaboration preferences** — how they like an AI to think and communicate with them — so that different AIs/models start from the **same cognitive baseline** across tasks and sessions. This is the persistence layer for *how we work together*, distinct from:

- `project-context.md` — project **facts** (stack, commands, architecture)
- `lessons.md` — **verified technical lessons** from past work

**How the agent uses it:**

- Read it during **Align** (before proposing the Unified Goal). Apply known **active** preferences **by default**; do **not** re-ask what the profile already answers.
- Populate per the tiers in the skill's `references/personalization.md`: first qualifying observations land under **To Confirm** as candidates. **Communication** and **low-risk collaboration** preferences may become active after a second independent task or explicit confirm; **rejected options** and **route aliases** require **explicit confirm only** (repeated mentions do not auto-promote). It is **never** a big upfront questionnaire.
- Preferences are **defaults, not overrides** — the user's explicit instruction this turn always wins.
- Anything under **To Confirm** is a **candidate, not an active preference** — do not apply it until promoted.
- Triggers, write tiers, rejected-options / route-alias lanes, and the authority firewall (what may sediment, what needs confirmation, and what must never be learned) are defined in the skill package's `references/personalization.md`; this file is the data carrier. Learned preferences never raise authority.

---

## Communication

| Preference | Value |
|------------|-------|
| Language for conclusions | <e.g. write conclusions in Chinese> |
| Output density | <terse one-liners / balanced / detailed> |
| Structure vs prose | <prose by default / tables when deciding> |

## Question Threshold

- When to **decide and proceed** vs **ask first**: <e.g. resolve your own doubts first; only ask a genuine blocker that changes direction>
- Max questions per turn on ambiguous tasks: <e.g. 1–2>

## Risk Tolerance

| Area | Preference |
|------|------------|
| Reversible / low-stakes | <e.g. move fast, no ceremony> |
| Production / data / security | <e.g. extra caution; pause and confirm> |
| Refactors / scope | <e.g. minimal change; ask before broadening> |

## Quality Bar

- Definition of "good" for this user: <e.g. root-cause fix, no half-products, evidence-backed, Occam>
- Non-negotiables: <e.g. no success claims without Passing Evidence>

## Decision Habits

- How this user weighs trade-offs: <e.g. correctness > speed; strong consistency over cache staleness>
- Recurring criteria: <e.g. prefers fewer dependencies; prefers standard-library solutions>

## Good vs Bad Responses

- 👍 Liked: <an answer/behavior the user valued, and why>
- 👎 Disliked: <an answer/behavior the user rejected, and why>

## Phrase Lexicon

Recurring user phrases mapped to the operational meaning both sides settled on. An entry fires only when the phrase is used in its recorded sense (a quoted title or unrelated context is a mismatch).

| Phrase (user's words) | Compiled meaning | Source | Status | Last fired |
|---|---|---|---|---|
| <e.g. “验收”> | <independent accept mode, read-only> | observed \| confirmed | active | never |

## Rejected Options (project-scoped, confirm-first)

Stable rejections the user does not want re-proposed in this project. Single-task non-goals stay in the task envelope — only explicit long-term / project-boundary rejections belong here. **Explicit confirm only** to promote; never infer from one non-choice; never store standing release/push authority.

| Rejected option | Scope | Source | Status | Notes |
|---|---|---|---|---|
| <e.g. Redis for local cache> | project | observed \| confirmed | candidate \| active | <why / when stated> |

## Route Aliases (diagnose \| accept \| release-check \| resume only)

Confirm-first phrase → fixed route id. No new physical skills. Must not raise authority or lower assurance floors. Title quotes / unrelated context do not fire; current-turn explicit instruction wins. **Explicit confirm only** to promote — repeated mentions without confirm do not auto-promote.

| Phrase (user's words) | Route id | Source | Status | Last fired |
|---|---|---|---|---|
| <e.g. “帮我过一遍”> | accept | observed \| confirmed | candidate \| active | never |

---

## To Confirm (candidates — not active preferences)

<!-- Observed candidates awaiting a second independent task hit or explicit user confirmation. Do not apply these as defaults until promoted to an active section above. -->

- *(none yet)*
