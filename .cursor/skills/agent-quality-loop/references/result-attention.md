# Result Attention Rendering

This reference controls the order and density of the existing parent-owned User Result Summary. It does not control hidden reasoning, create a second contract, add a lifecycle phase, or persist new state.

## Information Order

Use the first 5–8 lines for the first applicable items in this order:

1. decision or conclusion;
2. practical user impact or boundary;
3. decisive evidence and its strength;
4. material risk or uncertainty;
5. the one action the user must take, when any.

Put build identity, hashes, commands, machine receipts, and long transcripts later unless one changes the user's immediate decision.

## Attention Budget

Render at most one primary conclusion, one key caution, and one required user action. Omit empty sections. Routine success is normally 1–3 lines; formal analysis may expand, but the first screen still carries the conclusion, boundary, and evidence strength.

Machine receipts appear only when the user asks for them, or when a handoff, formal audit, or blocking diagnosis requires them. Ordinary Chinese results use precise natural-language status instead of internal lifecycle enums. Do not add cards, badges, emoji, dashboards, or decorative UI chrome to manufacture hierarchy.

## Decision Questions

Before rendering, answer internally from the existing Task Contract and evidence:

- What changed for the user?
- What remains incomplete or uncertain?
- Which evidence actually changes the verdict?
- Must the user decide or act now?

These questions select presentation order only. They do not authorize work or alter evidence.

## Examples

Routine local success:

```text
已修复画像冲突选择漏洞；同层不同偏好现在全部跳过，不再由 specificity 或 ID 代替用户决定。
针对性负例与完整验证均通过；无需用户操作。
```

Formal result with a boundary:

```text
本地实现与 Windows 自检已通过，但尚不能宣称双平台或产品价值通过。
决定性证据：完整验证通过；Ubuntu CI、有效 A/B/C 运行和长期价值仍为 NOT_RUN。
下一步：推送审查分支后由双平台 CI 和网页审查验证当前提交。
```

## Integration Boundary

The canonical ownership and failure semantics remain in [contracts.md](contracts.md#user-result-summary) and its Result Detail Budget. Adapters return receipts only; the parent AQL renders one summary. Profile Projection may influence an allowed presentation default, but it must not expose internal mechanism names in an ordinary result or weaken a required warning.
