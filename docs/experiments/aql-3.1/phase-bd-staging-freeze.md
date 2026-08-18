# Phase B0 / Phase D staging freeze (maintainer-side resumption)

Date: 2026-08-18 evening. Runner: Cursor Task, model pinned `cursor-grok-4.5-high-fast`.

## Isolation findings (third mechanism attempt)

1. Codex quota re-probed: exhausted until 2026-08-20 11:38 (`aql31-lab/evidence` lineage, D-001).
2. Both user-level installs moved out of discovery roots (`C:\Users\MSI\.agents\skills\` and `C:\Users\MSI\.cursor\skills\`, toggle script in lab).
3. Two fresh sentinels still listed `agent-quality-loop`: the host process-caches the session skill catalog; disk moves do not refresh it mid-session.

Consequences, per frozen `aql-3.1-ablation-v0/1`:

- **B0 arm: `CONTAMINATED_SKIP`** (catalog line is AQL bytes in context). Rerunnable with a clean `CODEX_HOME` after quota reset.
- **B1 vs B2 sub-ablation: valid now** — the cached catalog line is a cross-arm constant; with disk installs hidden, the only readable AQL bytes are each run's staged tree.
- **Phase D (B2 vs B3): valid now** — same constant-surface argument.
- **Phase C rev2 rerun: `EXECUTION_BLOCKED` this session** — trigger measurement depends on the catalog description, which is cached at the old bytes; a rev2 rerun needs a host rescan (window reload) or the codex path.

## Sealed artifacts

| Artifact | SHA256 |
|---|---|
| `aql31-lab/inventory/b0-mapping.json` | `a44ba625df54084bd51a19a30ad8d1b7e3453e294cbefffc3a3887974d38091b` |
| `aql31-lab/inventory/b0-runs-manifest.json` | `970dc164d1e58cf7baaa4de4b7d9ac06a2bd6bdcf39c0767fb0e00c2f1f88c06` |
| B1 staged SKILL.md (kernel-v0) | `182213c1baa0a4756d5faf48b96b4b50ed332e2f30653c7420f7c090d98ddd93` |
| B2 staged SKILL.md (f0fdb08) | `0c5f5741179b41ded911eb5e5d81533a637eb1013cf6a54b1965b1efa4e7253c` |
| `aql31-lab/inventory/d-mapping.json` | `a92d8f3319030860473605c3c02067ee9236a44eb6af1e24aae3a443744c6e42` |
| `aql31-lab/inventory/d-runs-manifest.json` | `9248b8ffd12433c9bd59db47da73802ab3a9b135fcd0e06497f3dedeeb7b4c7a` |

B3 ref: `9307a6079427d162d02ad66a76ec6d79a0a6ac25` (includes the single Phase C description revision).

## Phase C rev1 official numbers (all 48 valid runs, old description)

`should_trigger 6/8` (C-T2 1/3, C-T8 0/3), `should_not_trigger 8/8`, suite `BORDERLINE`. One description-only revision committed at `9307a60`; rev2 rerun blocked as above.
