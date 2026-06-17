---
name: ask-plan-code-qa
description: >-
  当用户需要实现、修复、重构、调试、多文件修改时使用。流程：
  Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code →
  Implementation Self-QA。用户验收审查请用 review-gate。
---

# Ask → Gates → Inspect → Plan → Code → Self-QA

## Purpose

Implementation workflow with **internal gates** so assumptions are exposed, plans are fact-based, and Code starts only after Plan Gate passes — reducing guesswork and false "done" claims.

**Gates are lightweight checkpoints, not long review reports.** On **Pass**, stay concise; expand only for **Revise**, **Blocked**, or material **Risk**.

## When to Use

- Implement, fix, refactor, debug, multi-file or automation work
- After Code: **implementation self-QA** (agent reports own verification)

## When Not to Use

- User wants **acceptance review / 验收 / review / inspect** of completed work or existing QA → **`review-gate`**
- Pure Q&A with no code (answer directly; optional brief Ask only)

## Workflow (Operating Procedure)

```text
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA
              ↑              ↑                    ↑
         Revise/Blocked  skip w/ reason    Revise/Blocked → no Code
```

Read `.cursor/rules/10-ask-plan-code-qa.mdc` for triggers and contract summary.  
Human guide: `AI_AGENT_WORKFLOW_README.md`.

---

## Ask Phase

Requirements only. **No code changes.**

```markdown
## Ask

### Goal
### Known Facts
### Assumptions
### Ambiguities
### Recommended Path
### Blocking Questions
```

- Expose assumptions; no silent choice on ambiguous requirements.
- Flag flawed user proposals with evidence.
- Blocking questions only; safe reversible assumptions may proceed to Inspect if stated.

---

## Ask Gate

**Immediately after Ask.** Not a full review.

```markdown
## Ask Gate

### Status
Pass | Pass with Risk | Revise | Blocked

### Key Risks
<Only next-phase risks>

### Required Clarifications
<Blocking only>

### Decision
Proceed to Read-only Inspect | Revise Ask | Ask User
```

| Status | Next step |
|--------|-----------|
| Pass | Read-only Inspect (brief output) |
| Pass with Risk | Inspect; note risk mitigation in Plan |
| Revise | Fix Ask — **no Inspect/Plan** |
| Blocked | Ask user — **no Inspect/Plan** |

---

## Read-only Inspect

After Ask Gate **Pass** or **Pass with Risk**. Required before Plan for **code tasks**.

**Allowed:** read target/related files, callers, tests, config, docs; grep/search; git diff; `.ai/knowledge/project-context.md`.

**Forbidden:** modify/create/delete files; deps; deploy; data migration; destructive commands; business code.

```markdown
## Read-only Inspect Summary

### Files Read
### References Searched
### Relevant Existing Patterns
### Not Verified
```

- **Plan must use Inspect facts**; unread areas → Assumptions or Not Verified in Plan.
- Concept/doc/discussion-only tasks: skip Inspect with stated reason.

---

## Plan Phase

After Inspect (or documented skip).

```markdown
## Plan

### Goal
### Context
### Assumptions
### Non-goals
### Proposed Approach
### Execution Steps
### Files to Modify
### Cross-file Reference Checks
### Impact Scope
### QA Plan
### Pause Conditions
```

- Each Execution Step: observable verification method.
- Root-cause first; minimal change; no unrelated refactors or useless files.
- Contract/cross-file scope → grep/search listed in Cross-file Reference Checks.

**Shortened full Plan** (same-file multi-line, no contract change): all sections above, brief — **not** Compact Mode.

---

## Plan Gate

**Immediately after Plan.** **Must pass before Code.** Not Review Gate.

```markdown
## Plan Gate

### Status
Pass | Pass with Risk | Revise | Blocked

### Root-Cause Check
### Scope Check
### Context Check
### Cross-file Check
### QA Check

### Required Revisions
<Only if Revise or Blocked>

### Decision
Proceed to Code | Revise Plan | Ask User
```

| Status | Next step |
|--------|-----------|
| Pass | Code (brief gate) |
| Pass with Risk | Code; handle risk in Code/Self-QA |
| Revise | Fix Plan — **no Code** |
| Blocked | Ask user — **no Code** |

**Only Pass or Pass with Risk → Code.** Revise/Blocked → do not enter Code.

On **Pass**, answer checks in one line each; no essay.

---

## Code Phase

**Prerequisites:** Ask Gate ∈ {Pass, Pass with Risk}; Plan Gate ∈ {Pass, Pass with Risk}; no open blocking questions; no unconfirmed destructive/production/secrets/payment/delete ops.

1. Re-read targets immediately before edit.
2. Root cause; minimal diff; match conventions.
3. Grep/update references, tests, types, docs as needed.
4. Stop when goal met — no drive-by changes.

---

## Implementation Self-QA Phase

After Code. **Not user acceptance** (→ `review-gate`).

```markdown
## Implementation Self-QA

### Summary
<No fixed/done/passing/verified/已完成/已修复 without Passing Evidence>

### Changed Files
### Verification Performed
### Passing Evidence
### Failing Evidence
### Not Verified
### Remaining Risks
### Next Step
```

- Commands from `.ai/knowledge/project-context.md` when available.
- Unclear impact → smallest check first; broader checks → Not Verified.
- Reusable verified lesson → **propose** in Next Step for `.ai/knowledge/lessons.md`; write only if user confirms.

---

## Compact Mode

**Only** when **all** true: **single-file + single-line + no contract change**.

```markdown
## Compact Ask

### Goal
### Assumptions
### Compact Eligibility
- single-file: yes/no
- single-line: yes/no
- no contract change: yes/no

### QA
<Full Implementation Self-QA template after Code>
```

**Any eligibility = no** → full flow (Ask Gate → Inspect → Plan → Plan Gate).

Compact **never** skips: read-before-edit, Implementation Self-QA, Not Verified.

**Forbidden:** API/type/path/component/config/schema/test changes; cross-file or user-visible behavior; multi-file/multi-line; unknown root cause.

---

## Review Gate Boundary

| | Plan Gate | Review Gate |
|---|-----------|-------------|
| When | Before Code (internal) | User asks to review/验收 existing work |
| Skill | (this skill) | `review-gate` |

---

## Output Contract

Ask · Ask Gate · Read-only Inspect Summary · Plan · Plan Gate · Implementation Self-QA · Compact Ask (when eligible)

## Acceptance Criteria

- [ ] Gates executed in order; Plan Gate Pass/Pass with Risk before Code
- [ ] Inspect completed or skip justified; Plan grounded in facts
- [ ] Self-QA complete; no success claims without Passing Evidence
- [ ] Cross-file contracts grep-checked when applicable
- [ ] Review requests routed to `review-gate`, not Plan Gate

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Skipped Ask Gate / Plan Gate | Stop; run gate before next phase |
| Plan without Read-only Inspect | Run Inspect; revise Plan |
| Code with Plan Gate Revise/Blocked | Stop; revise Plan or ask user |
| Gate output essay on Pass | Shorten; gates are checkpoints |
| Confused Plan Gate with review-gate | User 验收 → review-gate |
| Compact used when eligibility fails | Upgrade to full flow |
| Self-QA success without evidence | Rewrite Summary; Not Verified |

## Evaluation Cases

### Happy path

User: "Fix timeout in auth handler."  
Ask → Ask Gate Pass → Inspect reads handler + tests → Plan → Plan Gate Pass → Code → Self-QA with test output.

### Ambiguous case

User: "Make it faster."  
Ask lists ambiguities → Ask Gate Blocked → user picks metric → continues.

### Boundary / failure

Agent tries Code with Plan Gate Revise → **stop**, revise Plan. User says 「帮我验收」 → switch to **review-gate**, not Plan Gate.
