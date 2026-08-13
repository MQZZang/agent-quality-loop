# Claim evidence matrix

Honest mapping of package claims to evidence types. Evidence is scoped to the named mechanism, host, model tier, and transcript; longitudinal value remains separate.

Evidence types: `SPEC` | `STATIC` | `SELF_TEST` | `BLIND_RUNTIME` | `LONGITUDINAL`.

| Claim | Evidence type | Status |
| --- | --- | --- |
| Evaluation cases contiguous and README count matches | STATIC | PASS (via `scripts/validate-claims.js`) |
| Envelope regression self-test registry runs | SELF_TEST | PASS (via `validate-envelope.js --self-test`) |
| Four route packages in `routes.json` | STATIC | PASS (via `validate-claims.js`) |
| Four core skills under `.cursor/skills/` | STATIC | PASS (via `validate-claims.js`) |
| Manifest file hashes consistent across mirrors | STATIC | PASS (via `sync-skills.js --check`) |
| Envelope schema / phase invariants | SPEC + SELF_TEST | PASS |
| Blind probe protocol packaged (`probes/`) | SPEC | PASS |
| Blind probe rows on current host/model tiers | BLIND_RUNTIME | NOT_RUN (see `docs/host-probe-matrix-2.6.1.md`) |
| Host Goal Compiler / profile / route live sessions | BLIND_RUNTIME | NOT_RUN |
| Terminal-selection host probes A/B/C (Cursor/Codex/Claude) | BLIND_RUNTIME | NOT_RUN (see `docs/host-probe-adaptive-2.6.1.md`; static skill text ≠ live PASS) |
| Adaptive terminal screening pilot (6 tasks) | LONGITUDINAL | SCREENING only — descriptive, not causal (see `docs/pilot-adaptive-2.6.1.md`) |
| Longitudinal user-value pilot | LONGITUDINAL | NOT_RUN (see `docs/longitudinal-pilot-2.6.1.md`) |
| Writing adapter structural and behavior cases | STATIC + SELF_TEST | PASS only when validators and cases 74–88 pass; structural checks are not a semantic oracle |
| Writing vertical fresh-context host probes | BLIND_RUNTIME | Per-probe only: P-W6 remains **FAIL** under the frozen story ruler; any probe without accessible executor model/version identity is **NOT_RUN**, even when its transcript is structurally complete. Exact raw evidence and independent grades live in `docs/research/llm-learning-corpus/behavior-probes.md`; no universal cross-model claim. |
| Six-task writing-growth pilot | LONGITUDINAL | NOT_RUN — blocks claims that user growth is proven (see `docs/writing-growth-pilot.md`) |
| Causal improvement on real projects over time | LONGITUDINAL | NOT_RUN — not claimed |

Maintainer check: `node scripts/validate-claims.js` (also invoked from `node scripts/validate-all.js`).
