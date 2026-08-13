# Collaboration Profile Template

Copy this file to `collaboration-profile.md` in each project (or user setup) that uses this workflow pack, then fill it in — or let the agent populate it incrementally.

**What this is:** the user's **stable collaboration preferences** — how they like an AI to think and communicate with them — so that different AIs/models start from the **same cognitive baseline** across tasks and sessions. This is the persistence layer for *how we work together*, distinct from:

- `project-context.md` — project **facts** (stack, commands, architecture)
- `lessons.md` — **verified technical lessons** from past work

**How the agent uses it:**

- Read it during **Align** (before proposing the Unified Goal). Apply known **active** preferences **by default**; do **not** re-ask what the profile already answers.
- Populate per the tiers in the skill's `references/personalization.md`: first qualifying observations land under **To Confirm** as candidates. **Communication** and **low-risk collaboration/writing** preferences may become active after a second independent task or explicit confirm; **rejected options**, **route aliases**, writing posture, and **Growth Focus** require **explicit confirm only** (repeated mentions do not auto-promote). It is **never** a big upfront questionnaire.
- Preferences are **defaults, not overrides** — the user's explicit instruction this turn always wins.
- Anything under **To Confirm** is a **candidate, not an active preference** — do not apply it until promoted.
- Triggers, write tiers, rejected-options / route-alias lanes, and the authority firewall (what may sediment, what needs confirmation, and what must never be learned) are defined in the skill package's `references/personalization.md`; this file is the data carrier. Learned preferences never raise authority.
- This profile is not authority, task evidence, acceptance evidence, or proof of growth. The order is: explicit current-turn instruction, then matching active profile entries, then generic defaults.

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

## Writing Collaboration Preferences

Narrow, context-qualified defaults only. These may guide constraints but must not freeze structure or voice. The current task still declares its source-backed posture as `deliver` | `co-create` | `coach`; only an explicitly confirmed stable posture default belongs here, and `coach` is never inferred from repetition.

| Preference | Value | Scope / context | Source | Status | Last fired |
|---|---|---|---|---|---|
| <audience / medium / source strictness / feedback density / posture default> | <narrow default> | <where it applies> | observed \| confirmed | candidate \| active \| archived | never |

## Growth Focus

An explicitly chosen transferable practice focus. It is descriptive and user-controlled, lives in this profile, and is not proof that growth occurred. Keep current-artifact quality separate. `NOT_RUN` blocks any claim that longitudinal growth is proven.

| Capability | Observable behavior | Scope | Agent support / posture | Source / status | Last fired / review | Evidence refs / outcome |
|---|---|---|---|---|---|---|
| <transferable capability> | <behavior visible in an artifact or collaboration> | <where it applies> | <bounded support; deliver/co-create/coach only if explicitly chosen> | confirmed; candidate \| active \| archived | never; <review or expiry> | <envelope/receipt refs>; PILOT \| PASS \| FAIL \| NOT_RUN |

When an active item affects a task, its stable version-bound reference goes into that task's existing `injected_refs`. Only readable outcomes carrying that reference may be associated here; never copy raw prompts into this profile.

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

<!-- Observed candidates awaiting promotion. Rejected options, route aliases, writing posture, and Growth Focus require explicit confirmation; other low-risk preferences may use a second independent task hit. Never apply a candidate in its creation turn. -->

- *(none yet)*
