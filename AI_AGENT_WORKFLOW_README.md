# AI Agent Workflow

Human-readable guide for Cursor, Codex, and other agents using this workflow pack.

**Full procedure:** `.cursor/skills/ask-plan-code-qa/SKILL.md`  
**Entry point:** `AGENTS.md`  
**User acceptance review:** `.cursor/skills/review-gate/SKILL.md` (independent — not Plan Gate)

---

## Workflow Overview

```text
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA
```

**Ask Gate / Plan Gate are lightweight gates — not long review reports.**  
Default to concise output; expand only on **Fail**, **Revise**, **Blocked**, or material **Risk**.

| Phase | Purpose |
|-------|---------|
| **Ask** | Understand requirements; no code changes |
| **Ask Gate** | Can we proceed to inspect/plan? |
| **Read-only Inspect** | Gather facts from repo before Plan |
| **Plan** | Approach based on inspect facts |
| **Plan Gate** | Can we enter Code? |
| **Code** | Minimal, root-cause edits |
| **Implementation Self-QA** | Agent self-reports verification |

**Review Gate** (separate skill): user asks to **review / 验收 / inspect** completed work, diffs, or existing QA reports.

---

## Ask

Requirements understanding only. **Do not modify code.**

```markdown
## Ask

### Goal
### Known Facts
### Assumptions
### Ambiguities
### Recommended Path
### Blocking Questions
```

- Expose assumptions; do not silently pick among ambiguous requirements.
- Challenge flawed user approaches with evidence.
- Ask **blocking** questions only.
- Safe, reversible assumptions that Read-only Inspect can verify may be stated explicitly to proceed.

---

## Ask Gate

Immediately after Ask. **Lightweight gate — not a full review.**

```markdown
## Ask Gate

### Status
Pass | Pass with Risk | Revise | Blocked

### Key Risks
<Only risks affecting the next phase>

### Required Clarifications
<Only blocking questions>

### Decision
Proceed to Read-only Inspect | Revise Ask | Ask User
```

| Status | Action |
|--------|--------|
| **Pass** | Stay brief; proceed to Read-only Inspect |
| **Pass with Risk** | State how risk will be handled in Inspect or Plan |
| **Revise** | Fix Ask first — **no Plan** |
| **Blocked** | Ask user — **no Plan** |

---

## Read-only Inspect

After Ask Gate **Pass** or **Pass with Risk**. Required for **code tasks** before Plan.

**Allowed:** read files, callers, tests, config, docs; grep/search references; git diff; read `.ai/knowledge/project-context.md`.

**Forbidden:** modify/create/delete files; change deps; deploy; migrate data; destructive commands; write business code.

```markdown
## Read-only Inspect Summary

### Files Read
### References Searched
### Relevant Existing Patterns
### Not Verified
```

- Plan must cite **Inspect facts**; unverified items → Assumptions or Not Verified in Plan.
- Pure concept / doc / discussion tasks may skip Inspect — **state why**.

---

## Plan

After Read-only Inspect (or documented skip).

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

- Each Execution Step needs an **observable verification** method.
- Root-cause first; minimal precise change; no unrelated refactors or useless files.
- Contract/cross-file changes → list grep/search checks.

---

## Plan Gate

Immediately after Plan. **Code entry gate — not Review Gate.**

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
<Only when Revise or Blocked>

### Decision
Proceed to Code | Revise Plan | Ask User
```

| Status | Action |
|--------|--------|
| **Pass** | Stay brief; may enter Code |
| **Pass with Risk** | State how risk is handled in Code or Self-QA |
| **Revise** | Fix Plan — **no Code** |
| **Blocked** | Ask user — **no Code** |

**Plan Gate not Pass / Pass with Risk → do not enter Code.**

---

## Code

Enter only when:

- Ask Gate = **Pass** or **Pass with Risk**
- Plan Gate = **Pass** or **Pass with Risk**
- No unresolved **blocking** questions
- No unconfirmed destructive / production / secrets / payment / data-deletion ops

Rules: read before edit; fix root cause; minimal diff; update references/tests/types as needed; stop when goal met.

---

## Implementation Self-QA

After Code. **Not user acceptance** — use **review-gate** for 验收.

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

- No evidence → no success claims.
- Skipped checks → **Not Verified**.
- QA commands from `.ai/knowledge/project-context.md` when available.

---

## Review Gate Boundary

| Artifact | Role |
|----------|------|
| **Ask Gate** | After Ask; proceed to Inspect? |
| **Plan Gate** | Before Code; plan executable? |
| **Implementation Self-QA** | Implementer reports own checks |
| **Review Gate** | User-driven acceptance / review of existing artifacts |

User says 「帮我验收」, 「review this diff」, 「检查 QA 是否可信」, 「有没有幻觉」, 「检查遗漏」 → **`review-gate`**, not this workflow.

---

## Compact Mode

**Only** when **all** true: single-file, single-line, no contract change.

```markdown
## Compact Ask

### Goal
### Assumptions
### Compact Eligibility
- single-file: yes/no
- single-line: yes/no
- no contract change: yes/no

### QA
<Full Implementation Self-QA after Code>
```

If **any** eligibility = **no** → full flow:

```text
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA
```

Compact **never** skips: read-before-edit, Self-QA, Not Verified.

**Compact forbidden for:** API/type/path/component/config/schema/test changes, cross-file or user-visible behavior, multi-file/multi-line, unknown root cause.

---

## Cursor Usage

1. Read `AGENTS.md` and `.cursor/rules/00-agent-constitution.mdc`.
2. For implement/fix tasks, **explicitly read** `.cursor/rules/10-ask-plan-code-qa.mdc` + `.cursor/skills/ask-plan-code-qa/SKILL.md` (description-triggered rules may not auto-load).
3. Follow gate flow; keep gates concise on Pass.
4. For review/acceptance → `review-gate` skill + rule `20`.

---

## Codex Usage

1. Read `AGENTS.md` and this README.
2. If `.agents/skills/ask-plan-code-qa/SKILL.md` exists, use it; otherwise use `.cursor/skills/ask-plan-code-qa/SKILL.md`.
3. Same gate semantics as Cursor.

---

## Prompt Templates

**Start implement task:**

```text
Follow ask-plan-code-qa: Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA. Keep gates concise on Pass.
```

**Start acceptance review:**

```text
Use review-gate only. Do not use Plan Gate or ask-plan-code-qa for acceptance.
```

---

## Maintenance Rules

- **Rule** (`.cursor/rules/10-ask-plan-code-qa.mdc`): triggers + output contract summary only.
- **Skill** (`.cursor/skills/ask-plan-code-qa/SKILL.md`): full procedure — update skill first, then minimal rule/README/AGENTS sync.
- Keep Cursor and `.agents/skills/` copies in sync when both exist.
- Do not copy leaked or proprietary system prompts.

---

## Minimum Acceptance Criteria

- [ ] Full flow documented in skill + this README
- [ ] Ask Gate + Plan Gate with Pass / Pass with Risk / Revise / Blocked
- [ ] Read-only Inspect forbids file modification
- [ ] Plan Gate failure blocks Code
- [ ] Compact Eligibility triple-check present
- [ ] Self-QA: no success wording without Passing Evidence
- [ ] Review Gate documented as separate from Plan Gate
