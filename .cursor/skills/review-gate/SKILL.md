---
name: review-gate
description: >-
  当用户需要验收审查、检查需求/计划/代码/已有 QA 结果、风险、遗漏、幻觉时使用。
  Acceptance review of completed work or existing QA reports. Not for
  post-implement self-QA — use ask-plan-code-qa for that unless user asks to review.
---

# Review Gate

## Purpose

Structured, evidence-based review to catch hallucinations, missing context, plan gaps, code issues, and false QA confidence before merge or sign-off.

## When to Use

- User asks to **review / 验收 / inspect / audit / validate**
- **Acceptance review** of completed work, existing plans, code, or **implementation self-QA reports**
- Hallucination check, risk check, omission check on artifacts (not on in-progress implement unless reviewing a prior report)
- User asks to verify "done" claims or review before merge

## Review Types

| Type | Focus |
|------|--------|
| Assumption Review | Hidden or risky assumptions |
| Context Review | Repo reality vs agent understanding |
| Plan Review | Completeness, scope, verifiability |
| Code Review | Correctness, references, minimalism |
| QA Review | Evidence vs claims |

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

## Output Contract

See **Required Output Format** below. Every finding needs 问题 / 证据 / 风险 / 修正建议. Verdict required.

## Required Output Format

```markdown
## Review Scope
<What was reviewed>

## Assumption Review
### Findings
- **问题:** ...
  **证据:** ...
  **风险:** ...
  **修正建议:** ...

## Context Review
...

## Plan Review
...

## Code Review
...

## QA Review
...

## Verdict
Proceed | Proceed with fixes | Block

## What Was Checked (even if clean)
<Bullet list of artifacts and commands reviewed>
```

If a section has zero issues, still state what was examined.

## Must Not Behavior

- Do not say "looks good" without listing checked evidence.
- Do not invent file contents, test passes, or user intent.
- Do not approve QA that lacks Passing Evidence for critical claims.
- Do not skip Assumption Review on ambiguous requirements.

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
| Used for implement/fix task | Redirect to ask-plan-code-qa |
| Approved QA without Passing Evidence | QA Review → Block or Proceed with fixes |

## Evaluation Cases

### Happy path

Reviewer reads plan + diff + test log; lists checks; verdict Proceed with minor suggestions.

### Ambiguous case

QA says "tests pass" but no command output — QA Review flags Failing Evidence gap; verdict Block.

### Boundary / failure

Plan omits rollback for migration — Plan Review cites missing Pause Conditions; verdict Proceed with fixes.
