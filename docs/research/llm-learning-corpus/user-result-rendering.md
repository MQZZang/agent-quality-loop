# User Result Rendering Evidence

Date: 2026-08-13. These are content fixtures for the parent-owned adaptive User Result Summary, not screenshots and not a claim of native UI acceptance.

## Routine success fixture

本地修复与聚焦测试已完成，当前请求已达到实现与自检通过；没有执行发布。

证据：目标回归用例通过。你无需操作；如需独立验收，可另行发起。

## Failure fixture

## 结果：独立验收未通过，窄屏布局仍需修复

本地修复和聚焦测试已完成，桌面宽度下未发现问题；但独立审阅确认约 320px 宽度下结果卡片会横向滚动，因此当前结论为 **FAIL**。

**尚未完成**

- 窄屏布局修复与独立复验。
- 未获得发布授权，因此没有发布。

**用户影响**

窄屏用户可能需要横向滚动才能查看完整结果。

只有在希望继续修复时才需要回复。完成标准：窄屏与桌面均无横向滚动，并通过独立复验。

## Pending-evidence fixture

## 结果：实现完成，独立证据仍待补齐

本地实现与自检已通过，但当前没有可用的独立审阅上下文，因此结果保持 **PENDING**；没有发布，也没有获得发布授权。

**仍待完成**

- 由全新上下文先读原始请求与实际产物，再完成独立复验。

这不会影响已完成的本地文件，但在独立证据补齐前不能声称验收通过。你无需操作；具备独立审阅上下文后即可继续。完成标准：所有必需验收维度都有可读证据且均为 PASS。

## Cross-model blind result probe

The same failure-state raw request was run in fresh Codex contexts on `gpt-5.6-luna`, `gpt-5.6-terra`, and `gpt-5.6-sol`. Exact requests, outputs, identities, receipts, and independent grades are recorded as P-R1/P-R2/P-R3 in [behavior-probes.md](behavior-probes.md). The first sol response is retained as FAIL for an unsupported no-impact extrapolation; P-R3F is the fresh post-repair PASS.

## Native rendering status

- Codex desktop at approximately 320px: `NOT_RUN`.
- Codex desktop at desktop width: `NOT_RUN`.
- Reason: the available Windows automation skill explicitly forbids automating the Codex desktop UI. No custom HTML, browser page, screenshot mock, or source-text inspection was substituted for native-medium evidence.
- Structural preflight only: all fixtures use headings, paragraphs, bold text, and short lists; they contain no Markdown table, pipe-delimited status strip, raw long command, HTML/CSS, or color-only meaning. Structural preflight is not native rendering acceptance.

Minimum manual native check:

1. Render the three fixtures in a normal Codex answer and inspect them at desktop width.
2. Narrow the content area to approximately 320px and confirm that no result block creates horizontal scrolling or clipping.
3. Cold-read in this order: conclusion → completed → incomplete/reason → impact → required user action → completion standard; record PASS/FAIL for both widths.
