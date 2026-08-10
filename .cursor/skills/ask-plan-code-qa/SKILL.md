---
name: ask-plan-code-qa
description: >-
  Code implementation adapter for implementing, fixing, refactoring, debugging, or
  multi-file changes through alignment, planning, execution, and implementation self-QA.
  Use standalone only when explicitly invoked; when called by agent-quality-loop, consume
  its aligned/evidenced contract in embedded profile and return at most BUILT. Formal
  acceptance belongs to agent-quality-loop, which may use review-gate as an independent adapter; never this skill.
---

# 对齐 → 规划 → 执行 → 实现自检 (Align · Plan · Execute · Self-QA)

## Purpose

**Amplify, don't merely execute.** This skill exists to **accelerate and magnify** the user's output: first reach **one shared goal** with the user — like distributing a combat intent so every unit acts toward the same outcome — then plan within explicit boundaries and standards, then execute and review. Reliability discipline (read-before-edit, root cause, minimal change, evidence) is the **guardrail**, not the goal. Faithfully executing a *misaligned* goal is still waste.

This is a **思路 skill**, not a paperwork skill. The phases below are **mental checkpoints**, not headers to paste every turn.

### Operating Model — four stages (every task and sub-task runs this loop)

| Stage | Intent | Maps to |
|-------|--------|---------|
| **对齐 Align** | Standalone reconstructs one Unified Goal; embedded verifies and consumes the parent goal | Ask · Ask Gate or parent contract |
| **规划 Plan** | Turn the goal into a formal plan: path + **execution boundary** + acceptance & QA standards | Read-only Inspect · Semantic Scan (if risk) · Plan · Plan Gate |
| **执行 Execute** | Build with goal-awareness; result-oriented — no half-products, no over-engineering | Code |
| **实现自检 Self-QA** | Check the implementation against the original goal without claiming independent acceptance | Implementation Self-QA |

- **Goal-first:** before building, require a durable goal anchor. Standalone creates it in one/three lines; embedded consumes it from the parent contract. Scale alignment effort with risk and ambiguity.
- **Each stage subdivides** into sub-tasks with their own goal — iterate; do not dump one fixed step list and call it done.
- **Model-agnostic:** stages may run on different models (e.g. a strong model plans, a cheaper model executes — *example only, never hardcoded*); whoever executes still understands the goal and may find a better path or catch gaps missed earlier.

### Invocation Profiles

- `standalone`: only for explicit `$ask-plan-code-qa` use. Run Align → Inspect → Plan Gate → Code → Self-QA.
- `embedded`: default when invoked by `agent-quality-loop`. Consume its `ALIGNED`/`EVIDENCED` contract, assurance, authority, baseline, scope, and must-hold checks. Skip Ask, Ask Gate, and duplicate opening lines unless the supplied contract is incomplete or has drifted. Run Inspect → Plan Gate → Code → Self-QA and return the implementation receipt defined by `agent-quality-loop`; never emit a second lifecycle summary.

In either profile, the maximum lifecycle result is `BUILT`. Self-QA is not independent acceptance, release readiness, deployment, or production verification.

Use one goal anchor throughout implementation: the standalone opening `目标` line, or `first_principles_goal` from the embedded parent contract. Self-QA quotes that anchor; embedded mode never invents a replacement opening line.

### Doubt Resolution（穷尽求解）

Resolve your **own** doubts before escalating. Exhaust reasonable analysis (read, search, reason) to settle a question; escalate to the user **only** a genuine, self-verified blocker — **not** a reflexive "the process says ask." A question must rest on **full context and a real conclusion**, never a model hallucination or a perfunctory ask; and do not over-analyze beyond what the decision needs.

### Semantic Invariant Guardrail（语义不变量护栏）

For complex analysis, extraction, classification, documentation, or code tasks whose conclusion depends on concept mapping, protect the user's intended meaning before optimizing for completeness.

After Align and before finalizing Plan (often informed by Read-only Inspect), decide whether there is **semantic risk**: source fields, table names, UI labels, category names, or default technical concepts may not equal the user's business/product concepts.

If semantic risk exists, define **3–7 Must-Hold Checks**. Each check must be:

- **Semantic:** protects meaning, scope, hierarchy, or classification
- **Conclusion-changing:** violating it would materially change the answer
- **Minimal:** not a broad audit matrix
- **Verifiable:** checkable by simple inspection, grep, script assertion, reconciliation, or explicit Not Verified / Cannot Infer
- **Portable:** generic reasoning, not hardcoded one-off trivia unless the user provided it

Use these categories as prompts, not a template to fill every time: concept mapping, scope boundary, exclusivity, count integrity, missing data, evidence binding.

Carry Must-Hold Checks through Plan, Code, and Self-QA. In final QA, report only checks that materially protect the conclusion, with compact pass/fail evidence. If no real semantic risk exists, skip silently or state briefly: "No additional semantic invariants needed." Do not turn this into audit engineering.

**Assurance dial** (standalone aliases: Compact = 快, Standard = 常, High-Risk = 慎):

| Dial | When | User-facing feel |
|------|------|------------------|
| **快** Fast | single-file + single-line + no contract change, reversible | Pair-programmer pace; evidence still required |
| **常** Normal | default implement / fix / refactor / debug | Read code → align briefly → change → show evidence |
| **慎** Careful | production, contracts, security, data, deploy | 常 + independent acceptance through **agent-quality-loop** when asked |

In embedded profile, inherit `fast | standard | formal` from `agent-quality-loop`; do not reclassify or raise authority. `formal` increases evidence rigor but this adapter still ends at `BUILT`.

**Hard invariants** (non-negotiable): align goal before building · read before edit · root cause · minimal change · result-oriented (no half-product) · preserve semantic boundaries when risk exists · no success claims without Passing Evidence · pause on destructive/production/secrets.

**Gates** (Ask Gate, Plan Gate) are internal readiness checks — mandatory for 常/慎, concise by default. On **Pass**, merge into natural prose or one-line readiness; expand only on **Revise**, **Blocked**, or material **Risk**.

See `examples.md` for 规则体 vs 思路体 contrast.

## Output Discipline

**Default:** talk like a trusted colleague — prose first, structure only when it helps the user decide. In standalone 常/慎, **开工三行** is a required artifact; embedded mode reuses its parent contract and emits no duplicate opening.

**Use structured phase headers** only when:

- Requirements are **ambiguous** (assumptions / blocking questions)
- Readiness is **Revise** or **Blocked**
- **Material risk** (production, contracts, security, cross-file)
- User explicitly asks for Plan / review / 验收

**On Pass (normal path):**

- **开工三行 first (standalone 常/慎 only):** open with 目标 / 边界 / 最可能误解 as defined below. This is a required **artifact**, not "structure" — the bullets below never suppress it. 快档, embedded profile, and pure read-only Q&A are exempt.
- Do **not** emit empty `## Ask Gate` / `## Plan Gate` sections
- Weave align → read → change → review into readable flow
- Leave a **minimal reasoning trace** so internal gates are auditable without templates: 「读到 X → 判断 Y → 下一步 Z」 in one line
- Self-QA: state what was checked and whether the goal was met; use evidence bullets — not a template with empty sections

**Internal work still happens:** Agent still runs the checks required by its invocation profile; output discipline controls **what the user sees**. Doubt Resolution *reduces* noise — do not dump unresolved doubts on the user.

## User Handshake

User drives at four natural points:

| Point | When | Agent behavior |
|-------|------|----------------|
| **目标** | Start of a standalone non-trivial task | Emit the **开工三行** and proceed; embedded mode reuses the parent goal anchor |
| **歧义** | Multiple valid interpretations | Ask a genuine blocking question; do not silently choose |
| **方案** | Non-trivial change or user said wait | One-sentence approach; proceed unless user objects |
| **验收** | User says review / 验收 / 把关 | Switch to **agent-quality-loop accept** — not Plan Gate; it may invoke `review-gate` |

### Goal Handshake — three states（目标握手三态）

Pick the state, then act — this is how you avoid both over-asking and over-proceeding:

| State | When | Action |
|-------|------|--------|
| **直接执行** | Goal obvious / trivial / reversible, or answered by the profile | Standalone 快档: one-line restatement; standalone 常/慎: emit the **开工三行**. Embedded: use the supplied goal anchor |
| **带假设继续** (Pass with Risk) | Goal clear enough; remaining gaps are safe, reversible, Inspect-verifiable | State the assumptions, proceed; revisit if wrong |
| **暂停确认** (Blocked) | A genuine, self-verified blocker that changes direction and cannot be derived from code/context/profile | Ask 1–2 real questions max |

Escalate (暂停确认) only after Doubt Resolution — never reflexively.

## When to Use

- Implement, fix, refactor, debug, multi-file or automation work
- After Code: **implementation self-QA** (agent reports own verification against the goal)

## When Not to Use

- User wants **acceptance review / 验收 / review / inspect** of completed work or existing QA → **`agent-quality-loop` accept path**; it may invoke `review-gate`
- Pure Q&A with no code (answer directly; optional brief Ask only)

## Workflow (Operating Procedure)

```text
Standalone: 对齐 Ask → Ask Gate → 规划 Inspect → Semantic Scan (if risk) → Plan → Plan Gate → 执行 Code → 实现自检 Self-QA
Embedded:  consume ALIGNED/EVIDENCED contract → Inspect → Plan Gate → Code → Self-QA → BUILT receipt
              ↑               ↑                                ↑
       未对齐 → 抛回      skip w/ reason                 Revise/Blocked → no Code
```

---

## 对齐 · Ask Phase (Intent & Goal Alignment)

Requirements only. **No code changes.** Act like a product manager: reconstruct the **real intent** (including what the user could not phrase precisely), cover more angles, and propose **one Unified Goal** for the user to confirm.

**Two tiers — do not confuse them.** In standalone profile, the default mandatory output for a 常/慎 task is three lines—目标 / 边界 / 最可能误解—emitted in the first reply, then work continues without waiting. Embedded profile reuses the parent contract and emits none of them again. The full template below is the expanded standalone form; use it only for genuine ambiguity, an explicit written-spec request, or 慎档 risk.

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

- Consult `.ai/knowledge/collaboration-profile.md` (if present); apply the user's known preferences (output density, question threshold, risk tolerance, quality bar, decision habits) **by default** — don't re-ask what it already answers.
- Expose assumptions; no silent choice on ambiguous requirements.
- Flag flawed user proposals with evidence.
- Blocking questions only; safe reversible assumptions may proceed to Inspect if stated.
- **No Plan until the Unified Goal is aligned** (standalone uses its one-line/three-line anchor; embedded requires a valid parent `ALIGNED`/`EVIDENCED` contract).

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

**Allowed:** read target/related files, callers, tests, config, docs; grep/search; git diff; `.ai/knowledge/project-context.md`; `.ai/knowledge/lessons.md`.

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
- For semantic-risk tasks, inspect source labels/schema/UI/category evidence enough to decide whether Must-Hold Checks are needed.
- Retrieve **active** entries in `.ai/knowledge/lessons.md` whose Applies when match the task; inject into Plan Assumptions / Pause Conditions.

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
### Must-Hold Checks (semantic risk only)
### Files to Modify
### Cross-file Reference Checks
### Impact Scope
### Acceptance Standard (how we confirm the goal is met; ties to Definition of Done)
### QA Standard (verification methods + quality bar)
### Pause Conditions
```

- Each step: an **observable verification** method.
- If semantic risk exists, include 3–7 Must-Hold Checks and a simple verification path; if none exists, do not invent them.
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
### Semantic Boundary Check (if risk)
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

**Semantic Boundary Check:** if semantic risk exists, Must-Hold Checks must protect the user-confirmed meaning; if no semantic risk exists, do not force extra checks.

**Only Pass or Pass with Risk → Code.** On **Pass**, answer checks in one line each; no essay. May merge with Ask Gate into a single Readiness line.

---

## 执行 · Code Phase

**Prerequisites:** Ask Gate ∈ {Pass, Pass with Risk}; Plan Gate ∈ {Pass, Pass with Risk}; no open blocking questions; no unconfirmed destructive/production/secrets/payment/delete ops.

1. Re-read targets immediately before edit.
2. **Understand the goal first, then execute the plan** — if you find a better, more practical path or a gap missed earlier, surface it rather than running blind.
3. Root cause; minimal diff; match conventions.
4. Preserve Must-Hold Checks when semantic risk exists; do not substitute source labels for user meaning.
5. Grep/update references, tests, types, docs as needed.
6. **Result-oriented:** deliver a root-cause, real result — never a half-product, never over-engineering or show-off code. Stop when the goal is met; no drive-by changes.

---

## 实现自检 · Implementation Self-QA Phase

After Code. **Not user acceptance** (→ `agent-quality-loop` accept path). Judge the work **against the original Unified Goal**; keep it simple, low-noise, judgment-driven.

```markdown
## Implementation Self-QA
### Summary
<No fixed/done/passing/verified/已完成/已修复 without Passing Evidence>
<No goal met/达成/meets the goal without quoting the profile's goal anchor verbatim>

### Goal Met? (quote the standalone goal line or embedded first_principles_goal; then compare with Acceptance Standard)
### Changed Files
### Verification Performed
### Must-Hold Checks (semantic risk only)
### Passing Evidence
### Failing Evidence
### Not Verified
### Remaining Risks
### Next Step
```

- Commands from `.ai/knowledge/project-context.md` when available.
- Must-Hold Checks appear only when they materially protect the conclusion; otherwise omit or mark no additional semantic invariants needed.
- Judging a goal without a durable anchor is a claim, not a verdict; use the standalone goal line or embedded parent `first_principles_goal`.
- Unclear impact → smallest check first; broader checks → Not Verified. **Do not over-test for ceremony** — match verification to risk.
- Reusable verified lesson → project-level + local_write: write `.ai/knowledge/lessons.md` and disclose the diff in the summary (revocable); global or read-only: output a candidate for confirmation.

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

**Any eligibility = no** → full flow (Ask Gate → Inspect → Semantic Scan (if risk) → Plan → Plan Gate).

Compact **never** skips: read-before-edit, Implementation Self-QA, Not Verified.

**Forbidden:** API/type/path/component/config/schema/test changes; cross-file or user-visible behavior; multi-file/multi-line; unknown root cause.

---

## Review Gate Boundary

| | Plan Gate | Review Gate |
|---|-----------|-------------|
| When | Before Code (internal) | User asks to review/验收 existing work |
| Skill | (this skill) | `agent-quality-loop` accept path (`review-gate` may serve as its adapter) |

---

## Output Contract

**Default:** conversational flow with evidence; phase headers on-demand per **Output Discipline**.

**Standalone when structured:** Ask · Readiness (merged gates on Pass) · Read-only Inspect Summary · Plan · optional Must-Hold Checks (semantic risk only) · Implementation Self-QA · Compact Ask (快档)

**Embedded:** return only an implementation receipt containing adapter/source identity, input contract/baseline, changed artifacts, verification performed, passing/failing/not-run evidence, scope deviations, remaining risks, and `result_phase: BUILT`. Do not repeat goal/scope/lifecycle output already owned by `agent-quality-loop`.

**Always after code:** what changed · verification performed · Passing Evidence or Not Verified · quoted 目标 line + whether the original goal is met

## Acceptance Criteria

- [ ] Unified Goal aligned before building: standalone uses its opening anchor; embedded verifies the parent contract
- [ ] Embedded profile consumes the parent contract, skips duplicate alignment output, and preserves its assurance and authority.
- [ ] Standalone 常/慎: 开工三行 present in the first reply; embedded profile reuses the parent alignment without duplicating it
- [ ] Gates executed in order; Plan Gate Pass/Pass with Risk before Code
- [ ] Inspect completed or skip justified; Plan grounded in facts, with Execution Boundary + Acceptance & QA Standards
- [ ] Semantic-risk tasks preserve user-confirmed meaning; source labels are not substituted for business/product concepts
- [ ] Review judged against the original goal; no success claims without Passing Evidence; no half-product delivered
- [ ] Goal-met verdict quotes the applicable standalone or embedded goal anchor verbatim
- [ ] Cross-file contracts grep-checked when applicable
- [ ] Review requests routed to `agent-quality-loop` accept path, not Plan Gate
- [ ] Implementation Self-QA reports at most `BUILT`; it never grants independent acceptance or release state.

## Failure Modes

| Failure | Recovery |
|---------|----------|
| Built before aligning the goal | Stop; confirm the Unified Goal with the user first |
| Mechanical escalation (asked because "process says so") | Exhaust self-analysis first; escalate only genuine, self-verified blockers |
| Skipped Ask Gate / Plan Gate | Stop; run gate before next phase |
| Plan without Read-only Inspect | Run Inspect; revise Plan |
| Code with Plan Gate Revise/Blocked | Stop; revise Plan or ask user |
| Gate output essay / empty headers on Pass | Shorten; use 思路体 per examples.md |
| Source traversal correct but user concepts collapsed into source labels | Add or revise Must-Hold Checks; verify concept mapping, scope, exclusivity, counts, missing data, and evidence binding as needed |
| Half-product / over-engineering / show-off code | Return to result-oriented; Occam; finish to a real root-cause result |
| Confused Plan Gate with acceptance | User 验收 → `agent-quality-loop` accept path |
| Embedded adapter repeats the parent alignment/summary | Reuse the parent contract and return only the implementation receipt |
| Self-QA claims `ACCEPTED` or release state | Downgrade to `BUILT`; route formal acceptance through the parent lifecycle |
| Missing optional standalone reference | Use the self-contained rules in this file; do not claim an unread dependency |
| Compact used when eligibility fails | Upgrade to full flow |
| Self-QA success without evidence | Rewrite Summary; Not Verified |
| Standalone 常/慎 first reply missing 开工三行 | Emit the three lines now before further standalone work; embedded mode must not add them |
| Standalone 开工三行 emitted then waited for confirmation | The lines are an artifact, not a question; continue unless a genuine blocker remains |
| Goal-met verdict lacks the profile's goal anchor | Quote the standalone goal line or embedded `first_principles_goal`; without either, the claim is void |
| Standalone opening or embedded parent goal is missing, then Self-QA claims 达成 | The claim is void — same class as a success claim without Passing Evidence |

## Evaluation Cases

### Happy path

User: "Fix timeout in auth handler."  
Standalone 常档: emit 开工三行 (目标 quoting user → 边界 → 最可能误解) → read handler + tests → Code → Self-QA with test output and goal-met check. See `examples.md`.
**Pass:** standalone opening present, evidence shown, and no empty phase headers. **Fail:** missing standalone anchor, "已修复" with no test output, or six empty gate headers.

### Ambiguous case

User: "Make it faster."  
Ask reconstructs intent and proposes a Unified Goal; Doubt Resolution first, then Ask Gate Blocked on the one genuine blocker (no agreed metric) → user picks the metric → continues.  
**Pass:** profile consulted, a proposed goal offered, ≤2 real questions. **Fail:** question dump, or silently picks a metric.

### Boundary / failure

Agent tries Code with Plan Gate Revise → **stop**, revise Plan. User says 「帮我验收」 → switch to **agent-quality-loop accept**, not Plan Gate.

### Diagnostic — flawed user approach

User: "Add a global mutable cache keyed by raw request." (correctness risk)  
**Pass:** flags the flaw with evidence before implementing; proposes a safer goal-serving approach. **Fail:** implements as-asked without challenge.

### Diagnostic — missing-evidence QA

After Code, no tests were actually run.  
**Pass:** Summary avoids "fixed/done"; the unrun checks are listed under Not Verified. **Fail:** claims success without Passing Evidence.

### Diagnostic — semantic invariant guardrail

User: "Document which customer-facing workflows use approval state." Source has fields named `status`, `approval_status`, and `workflow_state`.

**Pass:** before Plan, agent identifies semantic risk and defines compact Must-Hold Checks such as: `approval_status` must be proven to mean customer-facing approval state; internal workflow states must not be counted as customer-facing approval; missing mappings are marked Not Verified. **Fail:** grep all `status` fields and conclude from labels alone.

### Diagnostic — 开工三行

User: "Refactor the billing retry queue across worker and API."  
**Pass:** line 1 quotes the user's actual words (not a paraphrase); line 3 names the highest-variance inference (not a safe platitude); agent continues working in the same turn after emitting the three lines; later goal-met verdict quotes that 目标 line verbatim.  
**Fail:** paraphrases the goal instead of quoting; line 3 is a vague filler; skips the three lines; emits the three lines then ended the turn asking whether to proceed; writes "达成"/"goal met" with no quoted 目标 line; or paraphrases the 目标 line instead of quoting it when rendering the verdict.

### Integration — embedded adapter

Parent input: an `ALIGNED`/`EVIDENCED` contract with `intent: implement`, declared assurance/authority, scope, baseline, and must-hold checks.

**Pass:** skip Ask/Ask Gate/opening lines; inspect, plan, code, self-QA; return one implementation receipt with `result_phase: BUILT`. **Fail:** emit a second lifecycle summary, alter authority, wait for an acceptor, or claim `ACCEPTED`/release state.
