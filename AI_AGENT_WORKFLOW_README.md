# AI Agent Workflow

Human-readable guide for Cursor, Codex, and other agents using this workflow.

**Full procedure (Cursor):** `.cursor/skills/ask-plan-code-qa/SKILL.md`  
**Full procedure (Codex):** `.agents/skills/ask-plan-code-qa/SKILL.md`  
**Entry point:** `AGENTS.md`  
**User acceptance review:** `review-gate` skill (`.cursor/skills/` or `.agents/skills/` — same semantics; not Plan Gate)

---

## Workflow Overview

```text
Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA [→ Review Gate when high-risk]
```

**Core principle:** Gates must exist, but stay **concise by default**. Expand only on risk, ambiguity, failure, or high impact. Independent **Review Gate** is not required every time — use it for important / high-risk tasks.

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

**Review Gate** (separate skill): user asks to **review / 验收 / inspect** completed work, diffs, or existing QA reports — or **High-Risk Full Mode** after Self-QA.

---

## Risk-Based Usage Modes

This workflow supports three execution modes. Not every task needs the full long form.

| Mode | Use When | Required Flow |
|------|----------|---------------|
| **Compact Mode** | single-file + single-line + no contract change | Compact Ask → QA |
| **Standard Mode** | normal implement / fix / refactor / debug | Ask → Ask Gate → Read-only Inspect → Plan → Plan Gate → Code → Implementation Self-QA |
| **High-Risk Full Mode** | multi-file, unclear root cause, contract change, production / data / security / deploy risk | Standard Mode + independent **Review Gate** |

**Gate conduct (all non-trivial modes):**

> Ask Gate and Plan Gate are mandatory for non-trivial tasks, but concise by default. Expand them only when there is risk, ambiguity, failure, or high impact.

> Ask Gate 和 Plan Gate 必须存在，但默认应简洁；只有出现风险、歧义、失败或高影响变更时才展开。

| Mode | Ask Gate | Read-only Inspect | Plan Gate | Review Gate |
|------|----------|-------------------|-----------|-------------|
| Compact | Optional (brief) | Skip if eligibility confirmed | Skip | No |
| Standard | Yes (concise) | Yes | Yes (concise) | Only if user asks or residual risk |
| High-Risk Full | Yes | Yes | Yes | **Yes** (independent review-gate) |

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
2. Use skills from **`.agents/skills/<name>/SKILL.md`** — do not default to `.cursor/skills/`.
3. Optional: read matching `.cursor/rules/*.mdc` for trigger contract summary (rules are not mirrored).
4. Same gate semantics as Cursor; skill content must stay in sync with `.cursor/skills/`.

---

## Phase Prompt Templates

Copy-paste prompts for each phase. See **Risk-Based Usage Modes** to pick Compact / Standard / High-Risk Full before using.

### T0 — 任务分级

```text
请先不要修改代码。

请根据 AGENTS.md 和 ask-plan-code-qa 判断这个任务应该使用哪种执行模式：

1. Compact Mode
2. Standard Mode
3. High-Risk Full Mode

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

1. Ask 阶段：
   - 重述目标
   - 列出 Known Facts
   - 暴露 Assumptions
   - 列出 Ambiguities
   - 给出 Recommended Path
   - 只提出 blocking questions

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
   - 包含 Goal、Context、Assumptions、Non-goals、Proposed Approach、Execution Steps、Files to Modify、Cross-file Reference Checks、Impact Scope、QA Plan、Pause Conditions
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

重点检查：

1. Assumption Review
   - 是否有未暴露假设
   - 是否把 Not Verified 当成事实
   - 是否静默选择了多解路径

2. Context Review
   - 是否读够目标文件、调用方、测试、配置、文档
   - 是否遗漏项目上下文
   - 是否存在未验证上下文

3. Plan Review
   - 是否解决根因
   - 是否过度工程
   - 是否范围清晰
   - 是否有执行边界
   - 是否每步有可观测验证

4. Code Review
   - 是否最小精准变更
   - 是否同步更新引用方
   - 是否遗漏跨文件契约
   - 是否引入无关重构
   - 是否有潜在 bug

5. QA Review
   - 是否有 Verification Performed
   - 是否有 Passing Evidence
   - 是否有 Failing Evidence
   - 是否明确 Not Verified
   - 是否存在无证据成功声明

请输出：
- Assumption Review
- Context Review
- Plan Review
- Code Review
- QA Review
- Verdict: Pass / Pass with Risk / Proceed with Fixes / Fail
- Suggested Fix

不要泛泛而谈。
每个问题必须给出证据。
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
- Goal 是否明确
- Assumptions 是否完整
- Non-goals 是否清晰
- 是否解决根因
- 是否最小精准变更
- Files to Inspect 是否足够
- Cross-file Reference Checks 是否完整
- Impact Scope 是否合理
- QA Plan 是否可观测
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
- Changed Files 是否完整
- Verification Performed 是否真实可追溯
- Passing Evidence 是否支撑结论
- Failing Evidence 是否被隐藏
- Not Verified 是否明确
- Remaining Risks 是否充分
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
- **Skill (Codex):** `.agents/skills/<name>/SKILL.md` — mirror of Cursor skill; **update both when changing workflow**.
- **Rule** (`.cursor/rules/*.mdc`): triggers + output contract summary only.
- Keep `.cursor/skills/` and `.agents/skills/` **semantically identical** (copy or sync on every skill change).
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
- [ ] Risk-Based Usage Modes and Overengineering Guard documented
- [ ] Phase Prompt Templates T0–T8 available in this README
