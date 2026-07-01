# AI Agent Workflow

Human-readable guide for Cursor, Codex, and other agents using this workflow.

**Model:** every task runs four stages — **对齐 Align → 规划 Plan → 执行 Execute → 验收 Review**. The point is to **amplify** the user's outcome through a shared goal; reliability is the guardrail, not the goal.

**Full procedure (Cursor):** `.cursor/skills/ask-plan-code-qa/SKILL.md`  
**Full procedure (Codex):** `.agents/skills/ask-plan-code-qa/SKILL.md`  
**Entry point:** `AGENTS.md`  
**User acceptance review:** `review-gate` skill (`.cursor/skills/` or `.agents/skills/` — same semantics; not Plan Gate)

---

## Quick Route（一行选档）

| 你的意图 | 说法 |
|----------|------|
| 改一个小地方 | `Follow ask-plan-code-qa 快档` |
| 正常开发 | `Follow ask-plan-code-qa 常档，Pass 时保持对话体` |
| 上生产 / 高风险 | 常档 + 完成后 `review-gate 验收` |
| 只验收不改代码 | `review-gate only` |

日常用上一行即可。下文为完整说明；**T0–T8 模板仅用于培训 / onboarding**。

---

## Workflow Overview

```text
对齐 Ask → Ask Gate → 规划 Inspect → Plan → Plan Gate → 执行 Code → 验收 Self-QA [→ Review Gate when high-risk]
```

Four stages: **对齐 Align → 规划 Plan → 执行 Execute → 验收 Review**.

**Core principle:** Align one **Unified Goal** with the user before building — a wrong goal costs more than any bug. Gates must exist, but stay **concise by default**; expand only on risk, ambiguity, failure, or high impact. Resolve your own doubts (穷尽求解) and escalate only genuine, self-verified blockers. Independent **Review Gate** is not required every time — use it for important / high-risk tasks.

**Ask Gate / Plan Gate are lightweight gates — not long review reports.**  
Default to concise output; expand only on **Fail**, **Revise**, **Blocked**, or material **Risk**.

| Phase | Stage | Purpose |
|-------|-------|---------|
| **Ask** | 对齐 | Reconstruct intent; co-build & confirm one Unified Goal; no code changes |
| **Ask Gate** | 对齐 | Goal aligned? Can we proceed to inspect/plan? |
| **Read-only Inspect** | 规划 | Gather facts from repo before Plan |
| **Plan** | 规划 | Approach + path + execution boundary + acceptance & QA standards |
| **Plan Gate** | 规划 | Can we enter Code? |
| **Code** | 执行 | Goal-aware, minimal, root-cause edits; no half-product |
| **Implementation Self-QA** | 验收 | Self-report verification against the original goal |

**Review Gate** (separate skill): user asks to **review / 验收 / inspect** completed work, diffs, or existing QA reports — or **High-Risk Full Mode** after Self-QA.

---

## Risk-Based Usage Modes（快 / 常 / 慎）

Three dials aligned with how developers actually work. Not every task needs the full long form.

| Mode | 档 | Use When | Required Flow |
|------|-----|----------|---------------|
| **Compact / 快档** | 快 | single-file + single-line + no contract change | Compact Ask → Code → Self-QA (对话体) |
| **Standard / 常档** | 常 | normal implement / fix / refactor / debug | Internal Ask → Inspect → Plan → gates; **user sees 思路体 on Pass** |
| **High-Risk / 慎档** | 慎 | multi-file, unclear root cause, contract change, production / data / security / deploy | 常档 + independent **review-gate** when user asks |

**Gate conduct (all non-trivial modes):**

> Ask Gate and Plan Gate are mandatory for non-trivial tasks, but concise by default. Expand them only when there is risk, ambiguity, failure, or high impact.

> Ask Gate 和 Plan Gate 必须存在，但默认应简洁；只有出现风险、歧义、失败或高影响变更时才展开。

| Mode | Ask Gate | Read-only Inspect | Plan Gate | Review Gate |
|------|----------|-------------------|-----------|-------------|
| 快 | Optional (brief) | Skip if eligibility confirmed | Skip | No |
| 常 | Yes (internal; prose on Pass) | Yes | Yes (internal; prose on Pass) | Only if user asks or residual risk |
| 慎 | Yes | Yes | Yes | **Yes** when user asks to 验收 |

---

## Overengineering Guard

The workflow is a **reliability mechanism**, not a paperwork generator.

1. Do not expand every gate into a long review report.
2. If Gate status is **Pass**, keep it short.
3. If the task qualifies for **Compact Mode**, do not force the full workflow.
4. Do not run independent **Review Gate** for every tiny task.
5. Use independent **Review Gate** for high-risk, multi-file, unclear, or user-facing changes.
6. Do not add CI/hooks/scripts for workflow enforcement until repeated real failures justify them.
7. Prefer real task feedback and `lessons.md` updates over speculative rule expansion.

---

## Ask（对齐 · Intent & Goal Alignment）

Requirements understanding only. **Do not modify code.** Act like a product manager: reconstruct the real intent and propose **one Unified Goal** for confirmation.

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

- Reconstruct intent; propose the Unified Goal; **no Plan until the goal is aligned** (trivial → one-line restatement).
- Expose assumptions; do not silently pick among ambiguous requirements.
- Challenge flawed user approaches with evidence.
- Resolve your own doubts first; ask **genuine blocking** questions only — not reflexive ones.

---

## Ask Gate

Immediately after Ask. **Lightweight gate — not a full review.**

```markdown
## Ask Gate

### Status
Pass | Pass with Risk | Revise | Blocked

### Goal Alignment
<The Unified Goal — confirmed, or stated for confirmation>

### Key Risks
<Only risks affecting the next phase>

### Genuine Blockers
<Self-verified items that truly need the user — none if resolved>

### Decision
Proceed to Read-only Inspect | Revise Ask | Ask User
```

| Status | Action |
|--------|--------|
| **Pass** | Goal aligned; stay brief; proceed to Read-only Inspect |
| **Pass with Risk** | State how risk will be handled in Inspect or Plan |
| **Revise** | Goal not yet formed — fix Ask first, **no Plan** |
| **Blocked** | Genuine blocker — ask user, **no Plan** (not a reflexive ask) |

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

## Plan（规划）

After Read-only Inspect (or documented skip). First **shed any existing perspective bias** and stand in a real engineer / professional viewpoint.

```markdown
## Plan
### Goal (restate the confirmed Unified Goal)
### Context
### Assumptions
### Approach & Path (approach + ordered iteration steps)
### Execution Boundary (in-scope · out-of-scope/non-goals · do-not-touch · hard limits)
### Files to Modify
### Cross-file Reference Checks
### Impact Scope
### Acceptance Standard (how we confirm the goal is met)
### QA Standard (verification methods + quality bar)
### Pause Conditions
```

- Each step needs an **observable verification** method.
- Root-cause first; minimal precise change; no unrelated refactors, useless files, or over-engineering (奥卡姆/Occam).
- Contract/cross-file changes → list grep/search checks.
- The plan itself carries **no unresolved doubt** (穷尽求解).

---

## Plan Gate

Immediately after Plan. **Code entry gate — not Review Gate.**

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

### Goal Met? (vs Unified Goal + Acceptance Standard: met / deviation & why)
### Changed Files
### Verification Performed
### Passing Evidence
### Failing Evidence
### Not Verified
### Remaining Risks
### Next Step
```

- Judge **against the original goal** — keep it simple, low-noise; do not over-test for ceremony.
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
2. Use skills from **`.agents/skills/<name>/SKILL.md`** — do not default to `.cursor/skills/`.
3. Optional: read matching `.cursor/rules/*.mdc` for trigger contract summary (rules are not mirrored).
4. Same gate semantics as Cursor; skill content must stay in sync with `.cursor/skills/`.

---

## Phase Prompt Templates（培训 / onboarding）

Copy-paste prompts for learning the full workflow. **Daily use: see Quick Route above.** Pick 快 / 常 / 慎 before using.

### T0 — 任务分级

```text
请先不要修改代码。

请根据 AGENTS.md 和 ask-plan-code-qa 判断这个任务应该使用哪种执行模式：

1. 快档 (Compact)
2. 常档 (Standard)
3. 慎档 (High-Risk)

判断标准：
- 是否 single-file
- 是否 single-line
- 是否 no contract change
- 是否涉及 API / 类型 / 路径 / 配置 / schema / 测试 / 跨文件行为
- 是否需要读多个文件
- 是否根因不明确
- 是否有生产 / 数据 / 密钥 / 部署风险

请输出：
- 推荐模式
- 理由
- 是否需要 Ask Gate
- 是否需要 Read-only Inspect
- 是否需要 Plan Gate
- 是否需要独立 review-gate
```

### T1 — 启动任务：Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate

```text
使用 ask-plan-code-qa。

请先读取 AGENTS.md、对应 rule 和 skill。
先不要修改代码。

请按以下流程执行：

Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate

任务是：
【在这里写任务】

要求：

1. Ask 阶段（对齐）：
   - 还原真实意图，提出待确认的统一目标（Unified Goal）
   - 列出 Known Facts
   - 暴露 Assumptions
   - 列出 Open Doubts（已自解 / 仅剩真实阻塞）
   - 给出 Definition of Done
   - 先自行穷尽求解，只提出真实的 blocking questions

2. Ask Gate：
   - Status 使用 Pass / Pass with Risk / Revise / Blocked
   - 如果 Pass，保持简洁
   - 如果有风险，说明风险会在 Inspect 或 Plan 中如何处理
   - 如果 Blocked，不得进入 Plan

3. Read-only Inspect：
   - 只读文件，不修改文件
   - 读取目标文件、关联文件、调用方、测试、配置、文档
   - 必要时 grep / search 引用
   - 输出 Files Read、References Searched、Relevant Existing Patterns、Not Verified

4. Plan：
   - 必须基于 Read-only Inspect 的事实
   - 包含 Goal、Context、Assumptions、Approach & Path、Execution Boundary、Files to Modify、Cross-file Reference Checks、Impact Scope、Acceptance Standard、QA Standard、Pause Conditions
   - 每个 Execution Step 必须有可观测验证方法
   - 优先根因修复
   - 最小精准变更
   - 不做无关重构

5. Plan Gate：
   - Status 使用 Pass / Pass with Risk / Revise / Blocked
   - 检查 Root-Cause、Scope、Context、Cross-file、QA
   - 如果 Plan Gate 未通过，不得进入 Code

不要修改代码。
不要声称已修复。
```

### T2 — 执行已通过 Plan

```text
使用 ask-plan-code-qa。

按刚才已经通过 Plan Gate 的 Plan 执行。

执行要求：

1. 进入 Code 前，再确认：
   - Ask Gate = Pass 或 Pass with Risk
   - Plan Gate = Pass 或 Pass with Risk
   - 没有 unresolved blocking questions
   - 没有未确认的破坏性 / 生产 / 密钥 / 支付 / 删除数据操作

2. 修改前：
   - 先读目标文件
   - 读关联文件、调用方、测试、配置
   - 涉及 API、类型、路径、组件、配置、schema、测试、跨文件行为时，必须 grep / search 引用方

3. 修改时：
   - 修根因，不做下游补丁
   - 做最小精准变更
   - 不做无关重构
   - 不创建无用文件
   - 更新必要引用、测试、文档、类型
   - 目标达成即停

4. 完成后输出 Implementation Self-QA：
   - Summary
   - Goal Met?（对照统一目标 + 验收标准）
   - Changed Files
   - Verification Performed
   - Passing Evidence
   - Failing Evidence
   - Not Verified
   - Remaining Risks
   - Next Step

硬约束：
如果没有 Passing Evidence，不得使用 fixed / done / passing / verified / 已完成 / 已修复 等成功措辞。
```

### T3 — 独立 Review Gate

```text
使用 review-gate。

请先读取 AGENTS.md、对应 rule 和 skill。
不要修改代码。

请审查：
【粘贴 Plan / diff 摘要 / Implementation Self-QA / 任务描述】

只运行与审查对象相关的 review types（不必五段全出）。重点检查：

- 假设是否暴露；是否把 Not Verified 当事实
- 是否读够目标文件、调用方、测试、配置
- 根因、范围、跨文件引用（若审查代码/plan）
- Passing Evidence 是否支撑结论；Not Verified 是否诚实

请输出：
- Review Scope（含启用的 review types）
- 仅相关 review 段的 Findings（问题/证据/风险/修正建议）
- Verdict: Proceed | Proceed with fixes | Block
- What Was Checked

不要泛泛而谈。每个问题必须给出证据。
```

### T4 — Compact Mode

```text
使用 ask-plan-code-qa。

请先判断是否可以使用 Compact Mode。
不要直接修改。

Compact Mode 只有同时满足以下条件才允许：

- single-file
- single-line
- no contract change

请输出：

## Compact Ask

### Goal

### Assumptions

### Compact Eligibility
- single-file: yes/no
- single-line: yes/no
- no contract change: yes/no

### QA

如果任一条件为 no，请升级为完整流程：
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate

任务是：
【在这里写任务】
```

### T5 — 仅 Plan 审查

```text
使用 review-gate。

不要修改代码。

请只审查下面这份 Plan 是否可以进入 Code。

Plan：
【粘贴 Plan】

检查重点：
- Goal 是否明确、是否与已确认的统一目标一致
- Assumptions 是否完整
- Execution Boundary 是否清晰（in/out-of-scope、不可触碰、硬限制）
- 是否解决根因
- 是否最小精准变更、无过度设计
- Files to Modify 是否足够
- Cross-file Reference Checks 是否完整
- Impact Scope 是否合理
- Acceptance Standard 与 QA Standard 是否可观测
- Pause Conditions 是否完整

请输出：
- Pass / Fail / Pass with Risk / Proceed with Fixes
- Evidence
- Required Revisions
- Not Verified
```

### T6 — 仅 QA 审查

```text
使用 review-gate。

不要修改代码。

请只审查下面这份 Implementation Self-QA 是否可信。

Implementation Self-QA：
【粘贴 QA 结果】

检查重点：
- Summary 是否有无证据成功声明
- Goal Met? 是否对照最初统一目标 + 验收标准（达成 / 偏差及原因）
- Changed Files 是否完整
- Verification Performed 是否真实可追溯
- Passing Evidence 是否支撑结论
- Failing Evidence 是否被隐藏
- Not Verified 是否明确
- Remaining Risks 是否充分（含半成品 / 过度设计）
- 是否需要补充测试、lint、typecheck、手工验证

请输出：
- QA Verdict: Pass / Pass with Risk / Fail
- Unsupported Claims
- Missing Evidence
- Required Verification
- Not Verified
```

### T7 — 经验沉淀建议

```text
请不要直接写入 lessons.md。

请根据本次任务结果判断是否有值得沉淀的经验。

只允许建议写入满足以下条件的 lesson：
- 已被验证
- 后续会复用
- 不是聊天废话
- 不重复项目已有文档
- 不包含敏感信息
- 不包含泄露或专有 system prompt 原文

请输出：
- 是否建议写入 lessons.md
- 建议条目
- 证据来源
- 为什么可复用
- 是否需要用户确认

未经我确认，不要修改 lessons.md。
```

### T8 — Codex 用法

```text
$ask-plan-code-qa

请读取 AGENTS.md 和 .agents/skills/ask-plan-code-qa/SKILL.md。
先不要修改代码。

请按以下流程输出：
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate

任务是：
【在这里写任务】

要求：
- Plan 前必须做 Read-only Inspect
- Plan Gate 未通过不得进入 Code
- 不要声称已修复
```

Codex review:

```text
$review-gate

请读取 AGENTS.md 和 .agents/skills/review-gate/SKILL.md。
不要修改文件。

请审查当前 diff / Plan / QA 结果。
重点检查假设、上下文、根因、跨文件引用、QA 证据和 Not Verified。
```

---

## Maintenance Rules

- **Skill (Cursor):** `.cursor/skills/<name>/SKILL.md` — full procedure for Cursor.
- **Skill (Codex):** `.agents/skills/<name>/SKILL.md` — mirror of Cursor skill; run **`./scripts/sync-skills.sh`** after every skill change.
- **Rule** (`.cursor/rules/*.mdc`): triggers + output contract summary only.
- Keep `.cursor/skills/` and `.agents/skills/` **semantically identical**.
- Do not copy leaked or proprietary system prompts.

---

## Minimum Acceptance Criteria

- [ ] Four-stage model (对齐 / 规划 / 执行 / 验收) documented in skill + this guide
- [ ] Goal-first: Unified Goal aligned before building; Ask Gate carries Goal Alignment
- [ ] Plan carries Execution Boundary + Acceptance Standard + QA Standard
- [ ] Doubt Resolution (穷尽求解): escalate only genuine, self-verified blockers
- [ ] Result-oriented: no half-product, no over-engineering (Occam); Self-QA judges against the original goal
- [ ] Ask Gate + Plan Gate with Pass / Pass with Risk / Revise / Blocked
- [ ] Read-only Inspect forbids file modification
- [ ] Plan Gate failure blocks Code
- [ ] Compact Eligibility triple-check present
- [ ] Self-QA: no success wording without Passing Evidence
- [ ] Review Gate documented as separate from Plan Gate
- [ ] Risk-Based Usage Modes and Overengineering Guard documented
- [ ] Phase Prompt Templates T0–T8 available in this guide
