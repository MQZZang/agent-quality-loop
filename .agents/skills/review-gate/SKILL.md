---
name: review-gate
description: >-
  Independent acceptance adapter for reviewing requirements, plans, code, artifacts,
  or existing QA evidence for risks, omissions, hallucinations, and goal drift.
  Use standalone only when explicitly invoked; when called by agent-quality-loop,
  return evidence-based review findings and a conservative verdict without repairing
  the artifact or duplicating lifecycle output. Never use for implementation self-QA.
---

# Review Gate

## Purpose

Evidence-based review thinking — catch hallucinations, missing context, false QA confidence, and **goal drift** before merge or sign-off. Acceptance is judged against the **original Unified Goal**: a real result, no half-products, no over-engineering.

**思路 skill:** run only the review types relevant to the artifact; default to readable findings, not empty review-type chapter headings.

Invocation profiles:

- `standalone`: only for explicit `$review-gate` use. Reconstruct the original goal and scope from raw artifacts before reviewing.
- `embedded`: when invoked by `agent-quality-loop`. Consume its contract, frozen artifact/baseline, required dimensions, and raw evidence. Return only this skill's review report; the parent owns lifecycle mapping and the user-facing combined summary.

In either profile, review is read-only. Do not edit, repair, deploy, publish, or grant authority.

## When to Use

- User asks to **review / 验收 / inspect / audit / validate**
- **Acceptance review** of completed work, existing plans, code, or **implementation self-QA reports**
- Hallucination check, risk check, omission check on artifacts (not on in-progress implement unless reviewing a prior report)
- **Goal-Achievement / 目标达成** check: does the result meet the original Unified Goal within its boundary?
- User asks to verify "done" claims or review before merge

## Review Types

| Type | Focus |
|------|--------|
| Assumption Review | Hidden or risky assumptions |
| Context Review | Repo reality vs agent understanding |
| Plan Review | Completeness, scope, verifiability |
| Code Review | Correctness, references, minimalism |
| QA Review | Evidence vs claims |
| Goal-Achievement Review | Result vs original goal; deviation, half-product, over-engineering; preference & process drift |
| Experience Review | Cold-consume from the contract's declared perspective; experience breaks, confusion, polish gap — experience-type artifacts only |

Run only the types relevant to the artifact under review.

## When Not to Use

- User wants to **implement, fix, refactor, or debug** → use **`agent-quality-loop`**; it may select `ask-plan-code-qa` as its implementation adapter
- Agent's own **post-implement self-QA reporting** → implementation adapter, not this skill, unless a distinct context is asked to **review / 验收** that report
- Trivial praise or "LGTM" without reading artifacts
- User only wants a plan written, not a review of existing work → use `agent-quality-loop` or explicit `$ask-plan-code-qa`

## Workflow (Operating Procedure)

1. Identify the original goal, scope, acceptance standard, frozen baseline, and applicable review types from the supplied contract and raw artifacts. If any decision-changing input is absent, report it; do not invent it.
2. Gather requirements, plan, diff, artifacts, commands, and raw QA evidence from source — not memory or the implementer's narrative alone.
3. When formal acceptance is requested, require a distinct fresh context or role and read raw evidence before the implementer's summary. Otherwise label the result non-independent.
4. For experience-type artifacts, run Experience Review; at acceptance, check `.ai/knowledge/lessons.md` **active** lessons for recidivism (重犯检测).
5. For each finding: 问题 · 证据 · 风险 · 修正建议.
6. End with Verdict + What Was Checked. In embedded profile, let `agent-quality-loop` map the verdict into lifecycle dimensions without repeating this report.

## Assumption Review

- List assumptions the author relied on.
- Mark each: validated / unvalidated / contradicted.
- For each issue: 问题 · 证据 · 风险 · 修正建议

## Context Review

- Tech stack, directories, conventions — match `AGENTS.md` and `.ai/knowledge/project-context.md` when filled.
- Flag invented paths, commands, or dependencies.
- Output per finding: 问题 · 证据 · 风险 · 修正建议

## Plan Review

Check the plan against the supplied goal/contract:

- Missing non-goals, files, risks, acceptance criteria, or QA plan?
- Steps ordered and testable?
- Pause conditions for destructive work?

Output per finding: 问题 · 证据 · 风险 · 修正建议

## Code Review

- Read actual diffs and related files — do not review from memory.
- Cross-file contract changes: grep evidence required.
- Root cause vs symptom patch; scope creep; over-engineering.

Output per finding: 问题 · 证据 · 风险 · 修正建议

## QA Review

- Does Passing Evidence support the Summary?
- Is Not Verified complete and honest?
- Failures hidden or minimized?

Output per finding: 问题 · 证据 · 风险 · 修正建议

## Goal-Achievement Review（目标 + 协作达成复核）

- Does the delivered result meet the **original Unified Goal** and its Acceptance Standard?
- Any deviation from the agreed goal or execution boundary — and why?
- Half-product, scope creep, or over-engineering (奥卡姆/Occam)?
- **Preference drift:** does it respect the user's collaboration profile (output density, question threshold, risk tolerance, quality bar, decision habits)?
- **Process bloat:** over-asking, over-planning, mechanical/templated output, or evidence that only proves "a command ran" without proving the goal?
- **Lesson recidivism (重犯检测):** does the work violate any **active** lesson in `.ai/knowledge/lessons.md`?

Output per finding: 问题 · 证据 · 风险 · 修正建议

## Experience Review

Cold-consume the artifact from the **declared perspective** in the contract (not the author's). Report experience breaks, confusion points, and polish/finished-feel gaps. Run only for experience-type artifacts.

Output per finding: 问题 · 证据 · 风险 · 修正建议

## Output Contract

**Default:** prose findings with evidence. **Structured sections** only for review types you actually ran.

Every finding needs 问题 / 证据 / 风险 / 修正建议. Verdict required.

## Required Output Format

```markdown
## Review Scope
<What was reviewed; which review types apply>

<!-- Include ONLY sections for types you ran. Omit irrelevant types entirely. -->

## <Relevant Review Type(s)>
### Findings
- **问题:** ...
  **证据:** ...
  **风险:** ...
  **修正建议:** ...

## Verdict
Proceed | Proceed with fixes | Block

## What Was Checked (even if clean)
<Bullet list of artifacts and commands reviewed>
```

If a section has zero issues, state what was examined — do not paste unused review-type headings.

## Must Not Behavior

- Do not say "looks good" without listing checked evidence.
- Do not invent file contents, test passes, or user intent.
- Do not approve QA that lacks Passing Evidence for critical claims.
- Do not force all review types when the artifact only needs one (e.g. QA-only → QA Review + Scope).

## Acceptance Criteria

- [ ] Review Scope states artifacts examined
- [ ] Each applicable review type has findings or "what was checked"
- [ ] Verdict is Proceed / Proceed with fixes / Block — not vague approval
- [ ] No invented file contents, test results, or user intent
- [ ] Context Review respects project-context Verified vs Not Verified

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Blanket "looks good" | List What Was Checked with file/command evidence |
| Review from memory without reading diff | Open actual files; re-review |
| Used for implement/fix task | Redirect to `agent-quality-loop`; it selects an implementation adapter |
| Approved QA without Passing Evidence | QA Review → Block or Proceed with fixes |
| Embedded review duplicates lifecycle summary | Return this review report only; parent maps the result |
| Same-context review claims independence | Mark non-independent and do not grant formal acceptance |

## Evaluation Cases

### Happy path

Reviewer reads plan + diff + test log; lists checks; verdict `Proceed` when no decision-changing finding remains.

### Ambiguous case

QA says "tests pass" but no command output — QA Review flags Failing Evidence gap; verdict Block.

### Boundary / failure

Plan omits rollback for migration — Plan Review cites missing Pause Conditions; verdict Proceed with fixes.

### Experience / lesson recidivism

Experience artifact → Experience Review finds a cold-consume break; or work re-breaks an **active** lesson → Block / Proceed with fixes.
