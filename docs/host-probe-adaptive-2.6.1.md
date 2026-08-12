# Host probe matrix — terminal adaptive value (2.6.1)

Evidence for **lowest-sufficient terminal selection** (BUILT / ACCEPTED / RELEASE_READY), separate from the P4–P8 claim probes in `docs/host-probe-matrix-2.6.1.md`.

**Honesty rule:** Static skill text is **not** a substitute for live probes. Do **not** invent PASS. Cells stay `NOT_RUN` until a fresh host-session transcript is attached.

Tag/commit default for this cycle: `pending local branch adaptive/terminal-value-2.6.1` (fill real tag/SHA only at attestation).

Skill digest: `pending` until release attestation pins a digest.

---

## Probe definitions

| Probe | User intent (raw request shape) | Expected terminal / behavior |
| --- | --- | --- |
| **A** | Narrow local fix + self-test; no independent accept; no release | Stop at **BUILT**; no fresh acceptor ceremony; no release suggestion |
| **B** | Fix then independent quality accept; no release prep; no publish | Reach **ACCEPTED** only with fresh context + independence; `release_gate` null; no publish |
| **C** | Only check whether an already-accepted result is releasable; do not publish | Read-only preflight → **RELEASE_READY** or honest blocker; **no** external action |

---

## Maintainer machine inventory (2026-08-12)

| Host | CLI observed | Notes |
| --- | --- | --- |
| Cursor | `cursor` 3.7.x present | Probe A/B/C: **NOT_RUN** until fresh session transcripts attached |
| Codex CLI | `codex-cli 0.147.0` present | Probe A/B/C: **NOT_RUN** until transcripts |
| Claude Code | CLI not found | All probes **NOT_RUN** (unavailable) |

---

## Matrix cells

Each cell records: tag/commit · host version · model · skill digest · raw request · raw transcript ref · actual phase/verdict · user-visible lines · question count · unnecessary upgrade Y/N · PASS/FAIL/NOT_RUN.

### Cursor × A / B / C

| Field | A | B | C |
| --- | --- | --- | --- |
| tag/commit | pending local branch `adaptive/terminal-value-2.6.1` | same | same |
| host version | cursor 3.7.x | cursor 3.7.x | cursor 3.7.x |
| model | — | — | — |
| skill digest | pending | pending | pending |
| raw request | *(pending live session)* narrow local fix + self-test; no accept; no release | *(pending)* fix + independent quality accept; no release prep; no publish | *(pending)* releasability check only; do not publish |
| raw transcript ref | — | — | — |
| actual phase/verdict | — | — | — |
| user-visible lines | — | — | — |
| question count | — | — | — |
| unnecessary upgrade Y/N | — | — | — |
| **result** | **NOT_RUN** | **NOT_RUN** | **NOT_RUN** |

### Codex CLI × A / B / C

| Field | A | B | C |
| --- | --- | --- | --- |
| tag/commit | pending local branch `adaptive/terminal-value-2.6.1` | same | same |
| host version | codex-cli 0.147.0 | codex-cli 0.147.0 | codex-cli 0.147.0 |
| model | — | — | — |
| skill digest | pending | pending | pending |
| raw request | *(pending live session)* same as Probe A intent | *(pending)* same as Probe B intent | *(pending)* same as Probe C intent |
| raw transcript ref | — | — | — |
| actual phase/verdict | — | — | — |
| user-visible lines | — | — | — |
| question count | — | — | — |
| unnecessary upgrade Y/N | — | — | — |
| **result** | **NOT_RUN** | **NOT_RUN** | **NOT_RUN** |

### Claude Code × A / B / C

| Field | A | B | C |
| --- | --- | --- | --- |
| tag/commit | pending local branch `adaptive/terminal-value-2.6.1` | same | same |
| host version | unavailable (`claude` not found, 2026-08-12) | unavailable | unavailable |
| model | — | — | — |
| skill digest | pending | pending | pending |
| raw request | n/a — host CLI unavailable | n/a | n/a |
| raw transcript ref | — | — | — |
| actual phase/verdict | — | — | — |
| user-visible lines | — | — | — |
| question count | — | — | — |
| unnecessary upgrade Y/N | — | — | — |
| **result** | **NOT_RUN** (unavailable) | **NOT_RUN** (unavailable) | **NOT_RUN** (unavailable) |

---

## PASS tally (this file)

| Metric | Value |
| --- | --- |
| Cells with PASS | **0** |
| Cells with FAIL | **0** |
| Cells with NOT_RUN | **9** (3 hosts × 3 probes) |

No live transcript was attached in this authoring pass. Re-run probes in fresh host sessions and replace `NOT_RUN` only with PASS/FAIL backed by transcript refs.
