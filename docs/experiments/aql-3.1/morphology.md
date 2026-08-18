# Morphology choice

B0 verdict: `INCONCLUSIVE_EXECUTION_BLOCKED`.

Evidence:

1. Mechanism 1 — `codex exec` hung with no completion after 85s; maintainer stated Codex has no quota (`deviations.md` D-001).
2. Mechanism 2 — Cursor Task B0 sentinel listed `agent-quality-loop` among VISIBLE_SKILLS. Isolation hard conditions 2 and 5 failed.

Decision table #5: inconclusive (including isolation failure) → conservative default #2: keep full Core and implement WP1–WP7. Contraction requires positive evidence; the incumbent 3.0 Core stays.

This is not `AQL_SIGNAL`. Phase D remains the publish gate and is separately blocked until an isolated runner exists.
