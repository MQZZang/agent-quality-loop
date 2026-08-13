# Changelog

Versions are the `manifest.json` / frontmatter `metadata.version` value shared by all four packaged skills. Release integrity rule: acceptance evidence binds the exact shipped bytes — verify against the tagged commit, not a report hash.

## Unreleased

- Parent-owned adaptive user results replace the mandatory pipe-delimited status line: routine success compresses, formal/failure/handoff/release expands, dirty artifacts bind exact identity, and adapters remain receipt-only. Writing now uses nine distinct jobs plus four canonical truth modes; source handling is a separate axis. Probe validation separates structure, identity, and independent semantic grade, retains P-W6 as FAIL, and checks local claim anchors.
- Terminal adaptive value (post-2.6.1 baseline): four legal terminals (EVIDENCED / BUILT / ACCEPTED / RELEASE_READY) may stop with `next_allowed_phase: null`; ALIGN Boundary states the turn terminal; user-visible Chinese status language tightened; bare「验收」disambiguation (not default publish); evaluation cases 66–73; adaptive host-probe / pilot docs remain screening or NOT_RUN until live transcripts exist. Package version still 2.6.1 until a later release.
- Cognitive collaboration + writing vertical: observable material cognitive layers, fixed/guided/open traceability, one writing adapter with truth modes and task-local deliver/co-create/explicit-coach posture, same-profile Writing Preferences + Growth Focus, and evaluation cases 74–82. Corpus research remains bounded to a read-only inventory and 14 traceable claims; no new lifecycle, route, authority source, ranker, embedding profile, or event store. Longitudinal writing growth remains NOT_RUN.
- Public README rewritten around user-visible collaboration results (shared checkable goal, evidence, stop reason, and separate release authority). Writing remains the first vertical, not the product boundary. Current bytes stay Unreleased; package manifests still declare 2.6.1.

## 2.6.1 — 2026-08-12

- Exact-tag CI closure: route-shim `--check` normalizes CRLF; `.gitattributes` forces `dist/route-shims/**` LF; `aql-stats` reports redact absolute paths (fixes Ubuntu self-test leak).
- Manifest cross-platform blind spot: corrupted UTF-8 punctuation in `aql-envelope.js` / `validate-envelope.js` forced raw-byte hashing (EOL-sensitive). Restored valid UTF-8; manifest/`validate-skill`/`gen-manifest` now **fail** invalid UTF-8 text files; skill-tree `.gitattributes` forces LF.
- Release workflow: `.github/workflows/release.yml` requires Ubuntu + Windows `validate-all` on the exact tag SHA before attestation + GitHub Release; `scripts/gen-release-attestation.js` derives counts from source.
- Stop gate: removed `.stop-gate-fired` workspace marker; anti-loop uses host `loop_count` / `loop_limit` only.
- Hooks modes: `compatibility` (heuristic external-write patterns) vs `strict` (unknown shell ask/deny); expanded patterns (docker/helm/firebase/curl mutating methods/scp/rsync); optional MCP policy in `gates.config.json`. Claims: matched external-write and configured MCP never auto-`allow` — not a full shell sandbox.
- Claim consistency: `scripts/validate-claims.js` enforces evaluation-case continuity and README number sync; `docs/claim-evidence-matrix.md`.
- Read-only `scripts/aql-doctor.js` (+ `--json` / `--self-test`).
- Host probe matrix + longitudinal pilot scaffolds remain `NOT_RUN` / under evaluation — not causal proof.
- Note: `v2.6.0` remains published historically; its exact release commit failed validation on both CI platforms and is superseded by `v2.6.1`.

## 2.6.0 — 2026-08-12

- Unified validation entry: `node scripts/validate-all.js` runs the full maintainer/CI suite sequentially; GitHub Actions now invokes only this script on Ubuntu and Windows.
- Acceptance independence: `ACCEPTED` requires `fresh_context` plus `separation_evidence_ref`; `different_role` is audit-only and does not qualify.
- User-facing copy aligned: README, AGENTS.md, review-gate, and `20-review-gate.mdc` no longer imply that a different role alone can grant formal acceptance.
- Authority gate rework: external write-class commands never auto-`allow` from the AQL hook. A bound `release_authorization.execution_plan` (exact command + `cwd_realpath` + mechanical ISO TTL ≤15m) may yield host-native **`ask` only**. Envelope fields such as `authorized_this_turn` are not current tool authorization. The hook does not perform full shell semantic analysis. See `integrations/cursor-hooks/README.md`.
- Validity chain: `validate-envelope.js` rejects `ACCEPTED`/`RELEASE_READY` with non-success verdicts or failed required dimensions; `injected_refs` require fixed kind→class mapping and `content_sha256` (absence of the field remains measurement unknown).
- Writer-owned snapshot ordering: `aql-envelope.js` injects `snapshot.{id,recorded_at,sequence,previous_digest,writer}`; callers cannot forge sequence. Legacy unordered snapshots are not qualified outcomes. Canonical ordered-chain validation refuses append on forged/gap/fork history (`EORDER`).
- Stats rework: workspace-scoped identity (`workspace_key` + `contract_id`); qualified associations use only valid, ordered snapshots; exposures are the contract timeline union; current phase follows max **sequence** (not highest historical phase). Descriptive association only — **observable and falsifiable, not causally proven**.
- Envelope writer: packaged `scripts/aql-envelope.js` (canonical under the skill package; repo-root wrapper). Under `local_write` or higher it may write optional `.agent-quality-loop/`; invoke via `SKILL_ROOT`.
- Alignment-compiler reference (`references/alignment-compiler.md`): compile discipline for existing Task Contract fields — not a second workflow. External `goal-prompt` is design/eval inspiration only; not vendored; not a runtime dependency. Goal Compiler / profile runtime host sessions remain separately evidenced (evaluation cases 46–65 exist; cross-host live sessions may be `NOT_RUN`).
- Collaboration-profile candidate bootstrap: first qualifying observation → To Confirm only; route aliases and stable rejected options require **explicit confirm** (no second-hit auto-promote); authority-shaped prefs forever refused.
- Optional `--suite routes` (`aql-diagnose`, `aql-accept`, `aql-release-check`, `aql-resume`) generated under `dist/route-shims/` (not default discovery); installer also places compatible `agent-quality-loop` parent. **Uninstall is manual** folder deletion. `aql-accept` does not by itself create independence on every host. Codex `$…` vs Cursor/Claude `/…`. See `integrations/route-shims/README.md`. Ships `dist/route-shims/` and `integrations/route-shims/` as release bytes so clones can install routes without a prior generate step.
- Distribution facts verified after the v2.5.0 release: the skills.sh CLI (`npx skills add MQZZang/agent-quality-loop`) discovers all four skills and installs from the cross-client `.agents/skills/` tree; the top-level `skills/` tree remains the Agent Plugins component root. Install docs now lead with the one-command path and state which tree each standard reads.
- Maintainer-instruction lesson recorded: commands handed to another executor need verified flags — the skills CLI has no `--dry-run`; `-l` is the list-only form.

## 2.5.0 — 2026-08-12

- Standards surface: root `plugin.json` (Agent Plugins 1.0.0, closed schema) plus a generated top-level `skills/` mirror — Agent Plugins clients consume the top-level `skills/` tree, and registries such as skills.sh read the cross-client `.agents/skills/` tree.
- Frontmatter carries the optional Agent Skills spec fields: `license: MIT` and `metadata` (author, version); the packaged validator now parses the spec's optional field set and fails on any version drift against the manifest.
- Blind behavioral probes packaged as a reproducible protocol: `probes/make-fixtures.js` (deterministic fixtures, blindness lint, integrity `--verify`) and `probes/PROBES.md` (decidable grading tied to evaluation cases 43/44/45).
- `MATRIX.md`: model-tier compliance results seeded with the first tri-model run, including the composer budget-tier double FAIL.
- README: real unedited probe transcript, testing narrative upgraded from "maintainer practice" to "reproducible protocol", Agent Plugins install path; one-page Chinese quickstart at `docs/quickstart.zh-CN.md`.

## 2.4.0 — 2026-08-12 ([#8](https://github.com/MQZZang/agent-quality-loop/pull/8))

- ALIGN grounding ladder: load-bearing referents verified read-only before the contract freezes; authoritative sources over model memory for external facts; premises contradicted by observation disclosed before any edit — never a fabricated referent; requested mechanisms compile as outcome + hypothesis. Depth decidable per tier; evaluation case 45.
- `scripts/aql-stats.js`: read-only envelope statistics aggregator (phase/verdict/dimension/version distributions) as the capability re-baseline measurement input.
- Tier-dependence lesson from the first blind probe matrix (budget-tier fabrication is a routing decision, not a wording problem).

## 2.3.0 — 2026-08-12 ([#7](https://github.com/MQZZang/agent-quality-loop/pull/7))

- Multi-host installer: `--to claude` (`~/.claude/skills`) and `--to all`; `--help`; install/verification docs split by user-level versus project-level paths.
- Personalization protocol (`references/personalization.md`): phrase lexicon, communication and collaboration-habit lanes, authority firewall, observation triggers, sedimentation tiers, decay hygiene; evaluation cases 43–44.
- Capability re-baseline policy in CONTRIBUTING: every mechanism names its countered failure mode; blind re-probes decide demotion; shrinking is a success.

## 2.2.0 — 2026-08-12

- Node-based cross-platform distribution chain (`sync-skills.js`, `gen-manifest.js`, `install.js`) with manifest-driven version/integrity self-identification.
- Contract hardening: consumer probe, counterexample execution, firsthand evidence, repair delta, contradiction disclosure, same-shape thrash unlock.
- Optional Cursor hooks add-on (`integrations/cursor-hooks/`): decidable mechanics only, never semantic acceptance.

Earlier history: see `git log`.
