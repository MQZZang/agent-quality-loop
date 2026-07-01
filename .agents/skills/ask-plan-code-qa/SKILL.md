---
name: ask-plan-code-qa
description: >-
  当用户需要实现、修复、重构、调试、多文件修改时使用。每个任务按
  对齐 → 规划 → 执行 → 验收 (Align → Plan → Execute → Review) 闭环，
  先与用户对齐统一目标再动手。用户主动验收审查请用 review-gate。
---

# 对齐 → 规划 → 执行 → 验收 (Align · Plan · Execute · Review)

## Purpose

**Amplify, don't merely execute.** This skill exists to **accelerate and magnify** the user's output: first reach **one shared goal** with the user — like distributing a combat intent so every unit acts toward the same outcome — then plan within explicit boundaries and standards, then execute and review. Reliability discipline (read-before-edit, root cause, minimal change, evidence) is the **guardrail**, not the goal. Faithfully executing a *misaligned* goal is still waste.

This is a **思路 skill**, not a paperwork skill. The phases below are **mental checkpoints**, not headers to paste every turn.

### Operating Model — four stages (every task and sub-task runs this loop)

| Stage | Intent | Maps to |
|-------|--------|---------|
| **对齐 Align** | Reconstruct the real intent; co-build and **confirm** one Unified Goal; do not build until aligned | Ask · Ask Gate |
| **规划 Plan** | Turn the goal into a formal plan: path + **execution boundary** + acceptance & QA standards | Read-only Inspect · Plan · Plan Gate |
| **执行 Execute** | Build with goal-awareness; result-oriented — no half-products, no over-engineering | Code |
| **验收 Review** | Judge the result **against the original goal**; keep it simple and low-noise | Implementation Self-QA |

- **Goal-first:** before building, agent and user must share the same read of intent and goal. A wrong goal costs more than any bug. Trivial/reversible tasks: the goal is obvious — restate it in one line and proceed. Scale alignment effort with risk and ambiguity.
- **Each stage subdivides** into sub-tasks with their own goal — iterate; do not dump one fixed step list and call it done.
- **Model-agnostic:** stages may run on different models (e.g. a strong model plans, a cheaper model executes — *example only, never hardcoded*); whoever executes still understands the goal and may find a better path or catch gaps missed earlier.

### Doubt Resolution（穷尽求解）

Resolve your **own** doubts before escalating. Exhaust reasonable analysis (read, search, reason) to settle a question; escalate to the user **only** a genuine, self-verified blocker — **not** a reflexive "the process says ask." A question must rest on **full context and a real conclusion**, never a model hallucination or a perfunctory ask; and do not over-analyze beyond what the decision needs.

**Risk dial** (see `docs/guide.md`; aliases: Compact = 快, Standard = 常, High-Risk = 慎):

| Dial | When | User-facing feel |
|------|------|------------------|
| **快** Fast | single-file + single-line + no contract change, reversible | Pair-programmer pace; evidence still required |
| **常** Normal | default implement / fix / refactor / debug | Read code → align briefly → change → show evidence |
| **慎** Careful | production, contracts, security, data, deploy | 常 + user-driven **review-gate** when asked |

**Hard invariants** (non-negotiable): align goal before building · read before edit · root cause · minimal change · result-oriented (no half-product) · no success claims without Passing Evidence · pause on destructive/production/secrets.

**Gates** (Ask Gate, Plan Gate) are internal readiness checks — mandatory for 常/慎, concise by default. On **Pass**, merge into natural prose or one-line readiness; expand only on **Revise**, **Blocked**, or material **Risk**.

See `examples.md` for 规则体 vs 思路体 contrast.

## Output Discipline

**Default:** talk like a trusted colleague — prose first, structure only when it helps the user decide.

**Use structured phase headers** only when:

- Requirements are **ambiguous** (assumptions / blocking questions)
- Readiness is **Revise** or **Blocked**
- **Material risk** (production, contracts, security, cross-file)
- User explicitly asks for Plan / review / 验收

**On Pass (normal path):**

- Do **not** emit empty `## Ask Gate` / `## Plan Gate` sections
- Weave align → read → change → review into readable flow
- Leave a **minimal reasoning trace** so internal gates are auditable without templates: 「读到 X → 判断 Y → 下一步 Z」 in one line
- Self-QA: state what was checked and whether the goal was met; use evidence bullets — not a template with empty sections

**Internal work still happens:** Agent still runs Align → Plan → Execute → Review checks; output discipline controls **what the user sees**. Doubt Resolution *reduces* noise — do not dump unresolved doubts on the user.

## User Handshake

User drives at four natural points:

| Point | When | Agent behavior |
|-------|------|----------------|
| **目标** | Start of a non-trivial task | Propose the Unified Goal for confirmation; **no Plan until aligned** |
| **歧义** | Multiple valid interpretations | Ask a genuine blocking question; do not silently choose |
| **方案** | Non-trivial change or user said wait | One-sentence approach; proceed unless user objects |
| **验收** | User says review / 验收 / 把关 | Switch to **review-gate** — not Plan Gate |

### Goal Handshake — three states（目标握手三态）

Pick the state, then act — this is how you avoid both over-asking and over-proceeding:

| State | When | Action |
|-------|------|--------|
| **直接执行** | Goal obvious / trivial / reversible, or answered by the profile | One-line restatement, then proceed |
| **带假设继续** (Pass with Risk) | Goal clear enough; remaining gaps are safe, reversible, Inspect-verifiable | State the assumptions, proceed; revisit if wrong |
| **暂停确认** (Blocked) | A genuine, self-verified blocker that changes direction and cannot be derived from code/context/profile | Ask 1–2 real questions max |

Escalate (暂停确认) only after Doubt Resolution — never reflexively.

## When to Use

- Implement, fix, refactor, debug, multi-file or automation work
- After Code: **implementation self-QA** (agent reports own verification against the goal)

## When Not to Use

- User wants **acceptance review / 验收 / review / inspect** of completed work or existing QA → **`review-gate`**
- Pure Q&A with no code (answer directly; optional brief Ask only)

## Workflow (Operating Procedure)

```text
对齐 Ask → Ask Gate → 规划 Inspect → Plan → Plan Gate → 执行 Code → 验收 Self-QA
              ↑               ↑                    ↑
       未对齐 → 抛回      skip w/ reason   Revise/Blocked → no Code
```

Read `.cursor/rules/10-ask-plan-code-qa.mdc` for triggers and contract summary.  
Human guide: `docs/guide.md`.

---

## 对齐 · Ask Phase (Intent & Goal Alignment)

Requirements only. **No code changes.** Act like a product manager: reconstruct the **real intent** (including what the user could not phrase precisely), cover more angles, and propose **one Unified Goal** for the user to confirm.

```markdown
## Ask
### Real Need (intent / why)
### Unified Goal (proposed for confirmation)
### Known Facts
### Assumptions
### Open Doubts (self-resolved vs remaining genuine blockers)
### Definition of Done (high-level acceptance)
### Blocking Questions (genuine only)
```

- Consult `.ai/knowledge/collaboration-profile.md` (if present); apply the user's known preferences (density, risk tolerance, quality bar, decision habits) **by default** — don't re-ask what it already answers.
- Expose assumptions; no silent choice on ambiguous requirements.
- Flag flawed user proposals with evidence.
- Blocking questions only; safe reversible assumptions may proceed to Inspect if stated.
- **No Plan until the Unified Goal is aligned with the user** (a trivial task's one-line restatement counts as alignment).

---

## Ask Gate (Goal Alignment)

**Immediately after Ask.** Not a full review.

```markdown
## Ask Gate
### Status
Pass | Pass with Risk | Revise | Blocked

### Goal Alignment
<The Unified Goal — confirmed, or stated for confirmation>

### Key Risks
<Only next-phase risks>

### Genuine Blockers
<Self-verified items that truly need the user — none if resolved>

### Decision
Proceed to 规划 (Inspect) | Revise Ask | Ask User
```

| Status | Next step |
|--------|-----------|
| Pass | Goal aligned → Read-only Inspect (brief output) |
| Pass with Risk | Inspect; note risk mitigation in Plan |
| Revise | Goal/requirements not yet formed — fix Ask, **no Inspect/Plan** |
| Blocked | A genuine blocker remains — ask user, **no Inspect/Plan** |

**On Pass:** fold into one **Readiness** line (e.g. 「目标已确认：X；读过 Y，可继续」) instead of a full `## Ask Gate` block. **Blocked must be a real, self-verified blocker** — not a reflexive "ask to be safe."

---

## 规划 · Read-only Inspect

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

## 规划 · Plan Phase

After Inspect (or documented skip). First **shed any existing perspective bias** and stand in a real engineer / professional viewpoint, then give the best plan.

```markdown
## Plan
### Goal (restate the confirmed Unified Goal)
### Context (from Inspect facts)
### Assumptions
### Approach & Path (approach + ordered iteration steps)
### Execution Boundary (in-scope · out-of-scope/non-goals · do-not-touch · hard limits)
### Files to Modify
### Cross-file Reference Checks
### Impact Scope
### Acceptance Standard (how we confirm the goal is met; ties to Definition of Done)
### QA Standard (verification methods + quality bar)
### Pause Conditions
```

- Each step: an **observable verification** method.
- Root-cause first; minimal change; no unrelated refactors, no useless files, no over-engineering (奥卡姆/Occam).
- Contract/cross-file scope → grep/search listed in Cross-file Reference Checks.
- **The plan itself carries no unresolved doubt** (穷尽求解).

**Shortened full Plan** (same-file multi-line, no contract change): all sections above, brief — **not** Compact Mode.

---

## 规划 · Plan Gate

**Immediately after Plan.** **Must pass before Code.** Not Review Gate.

```markdown
## Plan Gate
### Status
Pass | Pass with Risk | Revise | Blocked

### Goal-Alignment Check (plan serves the confirmed goal)
### Root-Cause Check
### Boundary / Scope Check
### Cross-file Check
### Acceptance & QA Check
### Doubt Check (no self-resolvable doubts left; only genuine blockers escalated)

### Required Revisions
<Only if Revise or Blocked>

### Decision
Proceed to 执行 (Code) | Revise Plan | Ask User
```

| Status | Next step |
|--------|-----------|
| Pass | Code (brief gate) |
| Pass with Risk | Code; handle risk in Code/Self-QA |
| Revise | Fix Plan — **no Code** |
| Blocked | Ask user — **no Code** |

**Only Pass or Pass with Risk → Code.** On **Pass**, answer checks in one line each; no essay. May merge with Ask Gate into a single Readiness line.

---

## 执行 · Code Phase

**Prerequisites:** Ask Gate ∈ {Pass, Pass with Risk}; Plan Gate ∈ {Pass, Pass with Risk}; no open blocking questions; no unconfirmed destructive/production/secrets/payment/delete ops.

1. Re-read targets immediately before edit.
2. **Understand the goal first, then execute the plan** — if you find a better, more practical path or a gap missed earlier, surface it rather than running blind.
3. Root cause; minimal diff; match conventions.
4. Grep/update references, tests, types, docs as needed.
5. **Result-oriented:** deliver a root-cause, real result — never a half-product, never over-engineering or show-off code. Stop when the goal is met; no drive-by changes.

---

## 验收 · Implementation Self-QA Phase

After Code. **Not user acceptance** (→ `review-gate`). Judge the work **against the original Unified Goal**; keep it simple, low-noise, judgment-driven.

```markdown
## Implementation Self-QA
### Summary
<No fixed/done/passing/verified/已完成/已修复 without Passing Evidence>

### Goal Met? (vs Unified Goal + Acceptance Standard: met / deviation & why)
### Changed Files
### Verification Performed
### Passing Evidence
### Failing Evidence
### Not Verified
### Remaining Risks
### Next Step
```

- Commands from `.ai/knowledge/project-context.md` when available.
- Unclear impact → smallest check first; broader checks → Not Verified. **Do not over-test for ceremony** — match verification to risk.
- Reusable verified lesson → **propose** in Next Step for `.ai/knowledge/lessons.md`; write only if user confirms.

---

## Compact Mode (快档)

**Only** when **all** true: **single-file + single-line + no contract change**. Same as **快** on the risk dial.

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

**Default:** conversational flow with evidence; phase headers on-demand per **Output Discipline**.

**When structured:** Ask · Readiness (merged gates on Pass) · Read-only Inspect Summary · Plan · Implementation Self-QA · Compact Ask (快档)

**Always after code:** what changed · verification performed · Passing Evidence or Not Verified · whether the original goal is met

## Acceptance Criteria

- [ ] Unified Goal aligned with user before building (trivial: one-line restatement)
- [ ] Gates executed in order; Plan Gate Pass/Pass with Risk before Code
- [ ] Inspect completed or skip justified; Plan grounded in facts, with Execution Boundary + Acceptance & QA Standards
- [ ] Review judged against the original goal; no success claims without Passing Evidence; no half-product delivered
- [ ] Cross-file contracts grep-checked when applicable
- [ ] Review requests routed to `review-gate`, not Plan Gate

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Built before aligning the goal | Stop; confirm the Unified Goal with the user first |
| Mechanical escalation (asked because "process says so") | Exhaust self-analysis first; escalate only genuine, self-verified blockers |
| Skipped Ask Gate / Plan Gate | Stop; run gate before next phase |
| Plan without Read-only Inspect | Run Inspect; revise Plan |
| Code with Plan Gate Revise/Blocked | Stop; revise Plan or ask user |
| Gate output essay / empty headers on Pass | Shorten; use 思路体 per examples.md |
| Half-product / over-engineering / show-off code | Return to result-oriented; Occam; finish to a real root-cause result |
| Confused Plan Gate with review-gate | User 验收 → review-gate |
| Compact used when eligibility fails | Upgrade to full flow |
| Self-QA success without evidence | Rewrite Summary; Not Verified |

## Evaluation Cases

### Happy path

User: "Fix timeout in auth handler."  
常档: reads handler + tests → one-line goal confirmation → Code → Self-QA with test output and goal-met check (思路体, no empty phase headers). See `examples.md`.  
**Pass:** goal restated, evidence shown, no empty phase headers. **Fail (hollow):** "已修复" with no test output, or six empty gate headers.

### Ambiguous case

User: "Make it faster."  
Ask reconstructs intent and proposes a Unified Goal; Doubt Resolution first, then Ask Gate Blocked on the one genuine blocker (no agreed metric) → user picks the metric → continues.  
**Pass:** profile consulted, a proposed goal offered, ≤2 real questions. **Fail:** question dump, or silently picks a metric.

### Boundary / failure

Agent tries Code with Plan Gate Revise → **stop**, revise Plan. User says 「帮我验收」 → switch to **review-gate**, not Plan Gate.

### Diagnostic — flawed user approach

User: "Add a global mutable cache keyed by raw request." (correctness risk)  
**Pass:** flags the flaw with evidence before implementing; proposes a safer goal-serving approach. **Fail:** implements as-asked without challenge.

### Diagnostic — missing-evidence QA

After Code, no tests were actually run.  
**Pass:** Summary avoids "fixed/done"; the unrun checks are listed under Not Verified. **Fail:** claims success without Passing Evidence.
