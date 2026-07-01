# ask-plan-code-qa Examples

Contrast **规则体** (over-structured) vs **思路体** (target). Same tasks; internal checks (对齐 → 规划 → 执行 → 验收) still run — only **output** differs.

---

## Example 1 — Auth handler timeout（常档）

**User:** Fix the timeout in the auth handler.

### ❌ 规则体

```markdown
## Ask
### Goal
Fix timeout in auth handler.
### Known Facts
...
### Assumptions
...

## Ask Gate
### Status
Pass
...

## Read-only Inspect Summary
### Files Read
...

## Plan
### Goal
...

## Plan Gate
### Status
Pass
...

[finally code and evidence buried under six headers]
```

### ✅ 思路体

读过 `auth/handler.ts` 和 `auth/handler.test.ts`：超时来自硬编码 5s，测试期望 30s。

**做法：** 常量改为读取 `AUTH_TIMEOUT_MS`，默认 30000。

**改了：** `auth/handler.ts`  
**验证：** `npm test -- auth/handler` — 12 passed  
**未验：** staging 实际网络延迟

---

## Example 2 — README typo（快档）

**User:** Fix typo "recieve" → "receive" in README line 42.

### ❌ 规则体

```markdown
## Compact Ask
### Goal
...
### Assumptions
...
### Compact Eligibility
- single-file: yes
- single-line: yes
- no contract change: yes

## Implementation Self-QA
### Summary
...
[eight subsections for a one-character fix]
```

### ✅ 思路体

单文件单行拼写，快档。已改 `README.md` L42。

**证据：** `git diff` — 1 line changed (`recieve` → `receive`).

---

## Example 3 — 对齐 + 穷尽求解（常档）

**User:** 给导出功能加个缓存。

### ❌ 规则体 / 错误做法

- 要么直接动手写一个缓存（没对齐"为什么"就执行）；
- 要么甩出 6 个澄清问题（机械上抛，把没消化的疑问倒给用户）。

### ✅ 思路体（对齐先行 + 只抛真实疑问）

读过 `export/service.ts`：导出慢是因为每次全量重算。

**真实意图（待确认）：** 你要的是"导出更快、不卡"，缓存只是手段之一。  
**统一目标：** 同一数据集重复导出秒级返回；数据变更后不返回过期结果。  
**我自己已解决的疑问：** 缓存键用 dataset id + 版本号；随数据版本失效（已读现有 `cacheVersion`）。  
**唯一真实阻塞（需你定）：** 可接受的过期窗口——强一致（版本号失效）还是允许 5 分钟 TTL？这会改变实现，且我无法从代码推断你的业务容忍度。

→ 目标 + 这一个真实问题确认后才进规划；其余细节不机械追问。

**验收（Code 后，对照最初目标）：**  
**目标达成？** 同集合二次导出 1.2s→80ms；改版本后回源——达成。  
**改了：** `export/service.ts`　**验证：** `npm test -- export` — 9 passed　**非半成品检查：** 无 TODO、无半接线的失效路径。

---

## Example 4 — Semantic Invariant Guardrail（常档）

**User:** 统计哪些客户可见流程用了审批状态。

### ❌ 错误做法

grep 所有 `status` / `workflow_state` / `approval_status`，把命中的字段都算作"审批状态"，最后给出一个看似完整的清单。

### ✅ 思路体（只在语义风险存在时加 Must-Hold Checks）

读到 `workflow_state` 同时用于内部流转，`approval_status` 才出现在客户可见流程配置里；字段名存在语义风险。

**Must-Hold Checks（保护结论）：**
- `approval_status` 必须有证据表明对应用户说的"审批状态"，不能仅凭字段名。
- 内部 `workflow_state` 不计入"客户可见流程"。
- 如果某流程缺少可见性配置，结论里标为 Not Verified，不静默归类。

**做法：** 先以客户可见配置限定范围，再映射审批状态字段。

**验收：** 清单总数与客户可见流程数可对账；未配置可见性的 2 个流程列入 Not Verified；没有把内部流转状态混入审批状态。
