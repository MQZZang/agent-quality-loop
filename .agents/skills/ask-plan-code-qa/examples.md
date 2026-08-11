# ask-plan-code-qa Examples

Contrast **template-dump style** (over-structured) vs **reasoning style** (the target). In standalone profile the internal checks (Align → Plan → Execute → Self-QA) still run; embedded profile reuses the parent alignment and returns only a `BUILT` receipt. **Reasoning style** governs prose density; for standalone Normal/Careful tiers the **three opening lines** remain mandatory, and Self-QA quotes the original goal without claiming independent acceptance.

---

## Example 1 — Auth handler timeout (Normal tier)

**User:** Fix the timeout in the auth handler.

### ❌ template-dump style

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

### ✅ reasoning style

Goal: "Fix the timeout in the auth handler." → fix the auth handler's timeout behavior  
Boundary: change `auth/handler.ts` | leave alone `auth/handler.test.ts` and unrelated auth logic  
Most likely misunderstanding: make timeout configurable (`AUTH_TIMEOUT_MS`) vs just raise the hardcoded 5s

Read `auth/handler.ts` and `auth/handler.test.ts`: timeout comes from a hardcoded 5s; tests expect 30s.

**Approach:** constant now reads `AUTH_TIMEOUT_MS`, default 30000.

**Changed:** `auth/handler.ts`  
**Verified:** `npm test -- auth/handler` — 12 passed  
**Not verified:** actual network latency in staging  
**Goal met?** Against the recorded goal line — `Goal: "Fix the timeout in the auth handler." → fix the auth handler's timeout behavior` — met.

---

## Example 2 — README typo (Fast tier)

**User:** Fix typo "recieve" → "receive" in README line 42.

### ❌ template-dump style

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

### ✅ reasoning style

Single-file, single-line typo — Fast tier — skip the three opening lines (do not add them to this example, or the Fast-tier exemption collapses). Changed `README.md` L42.

**Evidence:** `git diff` — 1 line changed (`recieve` → `receive`).

---

## Example 3 — Align before executing (Chinese input, Normal tier)

> Why this example stays in Chinese: routing reads meaning, not keywords — a Chinese request gets the same Align discipline, with labels in the user's language. Teaching point: align on the real goal before coding; resolve what you can yourself; escalate only the one genuine blocker (here: consistency vs TTL), then Pause for confirmation — do not dump a questionnaire or jump straight to a cache.

**User:** 给导出功能加个缓存。

### ❌ template-dump style / wrong approach

- 要么直接动手写一个缓存（没对齐"为什么"就执行）；
- 要么甩出 6 个澄清问题（机械上抛，把没消化的疑问倒给用户）。

### ✅ reasoning style (align first, escalate only a real doubt)

目标：「给导出功能加个缓存。」→ 你要的是"导出更快、不卡"，缓存只是手段之一  
边界：改 `export/service.ts` ｜ 不动 无关导出路径与无关缓存基础设施  
最可能误解：把"加缓存"当成已定方案直接落地，而不是先对齐更快、不卡的统一目标

读过 `export/service.ts`：导出慢是因为每次全量重算。

**统一目标：** 同一数据集重复导出秒级返回；数据变更后不返回过期结果。  
**我自己已解决的疑问：** 缓存键用 dataset id + 版本号；随数据版本失效（已读现有 `cacheVersion`）。  
**唯一真实阻塞（需你定）：** 可接受的过期窗口——强一致（版本号失效）还是允许 5 分钟 TTL？这会改变实现，且我无法从代码推断你的业务容忍度。

→ 开工三行已发出；此处因方向依赖业务容忍度而升为暂停确认 — 只抛这一个真实问题后才进规划；其余细节不机械追问。

**实现自检（Code 后，对照最初目标）：**
**目标达成？** 对照「目标：「给导出功能加个缓存。」→ 你要的是"导出更快、不卡"，缓存只是手段之一」——同集合二次导出 1.2s→80ms；改版本后回源——达成。  
**改了：** `export/service.ts`　**验证：** `npm test -- export` — 9 passed　**非半成品检查：** 无 TODO、无半接线的失效路径。

---

## Example 4 — Semantic Invariant Guardrail (Normal tier)

**User:** Document which customer-facing workflows use approval state.

### ❌ wrong approach

grep every `status` / `workflow_state` / `approval_status`, treat every hit as "approval state," and ship a list that looks complete.

### ✅ reasoning style (add Must-Hold Checks only when semantic risk exists)

Goal: "Document which customer-facing workflows use approval state." → tally approval-state usage within customer-facing workflows  
Boundary: change the conclusion/list | leave alone source data models and unrelated field classification  
Most likely misunderstanding: treat internal `workflow_state` as customer-visible "approval state"  
Delivery shape: an auditable map of customer-facing workflow → approval-state field/evidence, including Not Verified

Read that `workflow_state` is also used for internal transitions; only `approval_status` appears in customer-facing workflow config — field names carry semantic risk.

**Must-Hold Checks (protect the conclusion):**
- `approval_status` must have evidence it matches what the user meant by "approval state"; the field name alone is not enough.
- Internal `workflow_state` does not count toward "customer-facing workflows."
- If a workflow lacks a visibility config, mark it Not Verified in the conclusion — do not silently classify it.

**Approach:** first scope by customer-facing config, then map approval-state fields.

**Self-QA:** Against the recorded goal line — `Goal: "Document which customer-facing workflows use approval state." → tally approval-state usage within customer-facing workflows` — list totals reconcile with the customer-facing workflow count; 2 workflows without visibility config are listed as Not Verified; internal transition state was not mixed into approval state.
