# Claim evidence matrix

Honest mapping of package claims to evidence types. Host probes and longitudinal value remain `NOT_RUN` until raw evidence exists.

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
| Longitudinal user-value pilot | LONGITUDINAL | NOT_RUN (see `docs/longitudinal-pilot-2.6.1.md`) |
| Causal improvement on real projects over time | LONGITUDINAL | NOT_RUN — not claimed |

Maintainer check: `node scripts/validate-claims.js` (also invoked from `node scripts/validate-all.js`).
