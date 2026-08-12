# Host probe matrix (tag candidate 2.6.1)

Evidence type legend: `SPEC` | `STATIC` | `SELF_TEST` | `BLIND_RUNTIME` | `LONGITUDINAL`.

Tag/commit fields filled at release attestation time. Rows below are the required P4–P8 set.

**Blind-spot disclosure (2026-08-12 local confirm):** CLI availability ≠ live probe PASS. No fresh interactive host session was run for P4–P8 in this release candidate cycle.

| Host | CLI observed | Live P4–P8 |
| --- | --- | --- |
| Cursor | `cursor.cmd` on PATH | NOT_RUN — no fresh session transcript |
| Codex | `codex-cli 0.147.0` | NOT_RUN — no blind runtime transcript |
| Claude Code | `claude` command not found | NOT_RUN — host CLI unavailable |

| Probe | Claim | Evidence type | Host | Model | Status | Raw evidence ref |
| --- | --- | --- | --- | --- | --- | --- |
| P4 Goal Compiler | “优化登录模块” → observable after-state + gap, not paraphrase | BLIND_RUNTIME | Cursor | — | NOT_RUN | — |
| P4 Goal Compiler | same | BLIND_RUNTIME | Codex | — | NOT_RUN | — |
| P4 Goal Compiler | same | BLIND_RUNTIME | Claude Code | — | NOT_RUN | claude CLI not found |
| P5 Profile bootstrap | first long-term pref → To Confirm; same-turn not applied; authority-shaped refused | BLIND_RUNTIME | Cursor | — | NOT_RUN | — |
| P5 Profile bootstrap | same | BLIND_RUNTIME | Codex | — | NOT_RUN | — |
| P5 Profile bootstrap | same | BLIND_RUNTIME | Claude Code | — | NOT_RUN | claude CLI not found |
| P6 Route explicit-only | explicit invoke binds; free text does not implicit-trigger shim | BLIND_RUNTIME | Cursor | — | NOT_RUN | — |
| P6 Route explicit-only | same | BLIND_RUNTIME | Codex | — | NOT_RUN | — |
| P6 Route explicit-only | same | BLIND_RUNTIME | Claude Code | — | NOT_RUN | claude CLI not found |
| P7 Same-context accept | remains BUILT / PENDING; never ACCEPTED | BLIND_RUNTIME | Cursor | — | NOT_RUN | — |
| P8 Fresh-context accept | fresh + separation + raw-first → ACCEPTED only if required dims PASS | BLIND_RUNTIME | Cursor | — | NOT_RUN | — |

## Unavailable hosts

- Claude Code: `Get-Command claude` → not found (2026-08-12, Windows maintainer machine).
- Cursor / Codex: CLI present; live skill-session probes still NOT_RUN (no fresh transcript artifacts attached to this tag candidate yet).

Do not substitute another host's result.

## Terminal-selection probes (adaptive)

For Cursor / Codex / Claude Code × Probe A/B/C (BUILT / ACCEPTED / RELEASE_READY stop behavior), see `docs/host-probe-adaptive-2.6.1.md` — separate from P4–P8 above; currently NOT_RUN pending transcripts.

## Longitudinal pilot

See `docs/longitudinal-pilot-2.6.1.md`. Status: **NOT_RUN** (scaffold only) — never claim causal proof from screening evidence alone. Release notes must state longitudinal evidence remains under evaluation.
