---
name: review-gate
description: >-
  当用户需要验收审查、检查需求/计划/代码/已有 QA 结果、风险、遗漏、幻觉时使用。
  Acceptance review of completed work or existing QA reports. Not for
  post-implement self-QA — use ask-plan-code-qa for that unless user asks to review.
---

# Review Gate

## Purpose

Evidence-based review thinking — catch hallucinations, missing context, false QA confidence, and **goal drift** before merge or sign-off. Acceptance is judged against the goal of record: on 常/慎, the **目标** line of the task's **开工三行** (canonical form: `00-agent-constitution.mdc` §开工三行); when an expanded written Ask exists, its **Unified Goal** section is the alternative form; on 快档, the one-line goal restatement. A real result, no half-products, no over-engineering.

**思路 skill:** run only the review types relevant to the artifact; default to readable findings, not empty review-type chapter headings.

## When to Use

- User asks to **review / 验收 / inspect / audit / validate**
- **Acceptance review** of completed work, existing plans, code, or **implementation self-QA reports**
- Hallucination check, risk check, omission check on artifacts (not on in-progress implement unless reviewing a prior report)
- **Goal-Achievement / 目标达成** check: does the result meet the goal of record (常/慎: **目标** line of 开工三行; expanded Ask's **Unified Goal** when present; 快档: one-line restatement) within its **边界**?
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

Run only the types relevant to the artifact under review.

## When Not to Use

- User wants to **implement, fix, refactor, or debug** → use **`ask-plan-code-qa`** (then self-QA via `10`)
- Agent's own **post-implement self-QA reporting** → **`ask-plan-code-qa`**, not this skill, unless user asks to **review / 验收** that report
- Trivial praise or "LGTM" without reading artifacts
- User only wants a plan written, not a review of existing work → use ask-plan-code-qa Plan phase

## Workflow (Operating Procedure)

1. Read `.cursor/rules/20-review-gate.mdc` and identify applicable review types.
2. Gather artifacts (requirements, plan, diff, QA report) from repo — not memory.
3. For each finding: 问题 · 证据 · 风险 · 修正建议.
4. End with Verdict + What Was Checked.

## Assumption Review

- List assumptions the author relied on.
- Mark each: validated / unvalidated / contradicted.
- For each issue: 问题 · 证据 · 风险 · 修正建议

## Context Review

- Tech stack, directories, conventions — match `AGENTS.md` and `.ai/knowledge/project-context.md` when filled.
- Flag invented paths, commands, or dependencies.
- Output per finding: 问题 · 证据 · 风险 · 修正建议

## Plan Review

Check against the plan template in `ask-plan-code-qa`:

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

- Does the delivered result meet the goal of record — on 常/慎, the **目标** line of the task's 开工三行 (expanded Ask's **Unified Goal** when one exists; 快档: one-line restatement) — and its Acceptance Standard?
- **边界** check: did the delivered change stay within the 改 list and leave the 不动 list untouched? Files outside 改, or any touch of 不动, is a finding.
- **最可能误解** follow-through: was the line-3 highest-variance inference later resolved, confirmed, or still open and unreported? An unresolved line 3 never revisited is a finding.
- Any deviation from the agreed goal or execution boundary — and why?
- Half-product, scope creep, or over-engineering (奥卡姆/Occam)?
- **Preference drift:** does it respect the user's collaboration profile (output density, question threshold, risk tolerance, quality bar, decision habits)?
- **Process bloat:** over-asking, over-planning, mechanical/templated output, or evidence that only proves "a command ran" without proving the goal?

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
- Do not write "goal met" / "达成" / "meets the goal" or equivalent without quoting the **目标** line of the task's 开工三行 verbatim (快档: the one-line goal restatement). Judging a goal you never wrote down is a claim, not a verdict.
- Do not force all review types when the artifact only needs one (e.g. QA-only → QA Review + Scope).

## Acceptance Criteria

- [ ] Review Scope states artifacts examined
- [ ] Each applicable review type has findings or "what was checked"
- [ ] Verdict is Proceed / Proceed with fixes / Block — not vague approval
- [ ] No invented file contents, test results, or user intent
- [ ] Context Review respects project-context Verified vs Not Verified
- [ ] Acceptance verdict quotes the **目标** line (or 快档 one-line restatement) verbatim
- [ ] Delivered change respected the 边界 改 / 不动 lists
- [ ] 最可能误解 was resolved, confirmed, or reported still open

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Blanket "looks good" | List What Was Checked with file/command evidence |
| Review from memory without reading diff | Open actual files; re-review |
| Used for implement/fix task | Redirect to ask-plan-code-qa |
| Approved QA without Passing Evidence | QA Review → Block or Proceed with fixes |
| Acceptance approved without quoting the 目标 line | Block until verdict cites 开工三行 目标 (or 快档 restatement) verbatim |
| Delivered result touched something on the 不动 list | Block or Proceed with fixes; cite the 边界 breach |

## Evaluation Cases

### Happy path

Reviewer reads plan + diff + test log; lists checks; verdict Proceed with minor suggestions.

### Ambiguous case

QA says "tests pass" but no command output — QA Review flags Failing Evidence gap; verdict Block.

### Boundary / failure

Plan omits rollback for migration — Plan Review cites missing Pause Conditions; verdict Proceed with fixes.
