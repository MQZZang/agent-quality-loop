# ask-plan-code-qa Examples

Contrast **规则体** (over-structured) vs **思路体** (target). Same tasks; internal checks still run — only **output** differs.

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
