# Changelog

Versions are the `manifest.json` / frontmatter `metadata.version` value for the packaged product Skill. Release integrity rule: acceptance evidence binds the exact shipped bytes — verify against the tagged commit, not a report hash.

## 3.1.0 — Unreleased

- Slimmed the ordinary-task hot path: SKILL.md now carries never-fabricate, claim labels, semantic-risk words, the internal six-field card, and a mini phrase map. Routine turns no longer force-load the full contracts machine protocol.
- De-ritualized questions and material decisions: ask only when two credible after-states remain; combined current-turn authorization is not re-split; material records stay internal.
- Added an observer axis (`implementer_self` / `agent_review` / `mechanical_runtime` / `human`+`human_role`). `agent_review` cannot PASS `user_observable_result`.
- Merged re-anchor onto the ALIGN-frozen allowlist; same-shape failure is decidable.
- Scheme A mechanical gates G1/G2/G3: formal/envelope only, shipped as `scripts/gates-g1-g3.js` with bidirectional false-block / missed-block fixtures. Routine tasks stay prose-constrained. Shell-indirect writes are not mechanically covered.
- Standard acceptance is result-anchored free review; four-dimension conjunction is formal/release-bound only.
- Profile reference files load only on an explicit projection handle, a receipt-declared profile, or a user memory request.
- Capability matrix rows bind exact model × host × task class × assurance; new versions default to `unverified`.
- Evaluation cases 18–21 cover negative trigger, standard accept, formal conjunction, and the observer cap.
- Phase C/B0/D execution evidence is recorded under `docs/experiments/aql-3.1/`. Isolated ablation and candidate A/B remain blocked where a clean headless runner was unavailable.

## 3.0.0 — Unreleased

- Rebuilt the public README around the user journey: product status, trust architecture, lifecycle boundaries, safe installation, optional Profile/Receipt controls, evidence limits, release semantics, and a complete repository map.
- Collapsed the product distribution to the single `agent-quality-loop` Skill. Removed standalone adapter packages and physical route shims; the Task Contract remains the sole task truth.
- Added Profile v2 as an optional `explicit_only` control plane with current-turn override, Fresh Mode, bounded Guided projection, explicit export/import, and no implicit repeated-behavior retention.
- Added the optional packaged `aql.js` CLI and mechanical Capability Receipt contract. AQL Core degrades normally when profile storage, CLI execution, or user-directory access is unavailable.
- Added receipt-owned snapshot lifecycle commands: install, status, update, and uninstall refuse unowned or drifted targets and preserve profile data.
- Expanded validation and exact-tag release gates to Ubuntu, Windows, and macOS; platform results remain evidence only after those jobs run on the exact tag.
- Hardened release input handling: tag values reach shell only through environment variables, must name an exact tag ref, and must equal the packaged version before attestation or release creation.
- Historical Profile Projection v1 evidence remains historical. Its old A/B/C control is `INVALID`; AQL 3.0 product screening and longitudinal value remain `NOT_RUN`.


## 2.8.0 — 2026-08-15

- Added experimental, opt-in Profile Projection v1: complete matching active collaboration-profile entries are projected task-locally into the existing Task Contract (max two) and traced through existing `injected_refs`. Fresh Mode skips stored profile defaults for one task while preserving project facts, lessons, authority, evidence, acceptance, and release boundaries. No persistent User Lens, second Brief contract, score, ranker, or default-suite change was introduced.
- Made the project collaboration-profile template inert when copied unchanged: it parses zero entries and projects nothing. Candidate entries now require a safe `source_ref` and real `observed_at`; rejected options are project-scoped; Growth Focus requires its declared minimum structure and accepts only `PILOT` / `PASS` / `FAIL` / `NOT_RUN` outcomes when present.
- Hardened profile integrity: published evidence safety is independent of the verifier's username/hostname; `validate-profile.js` opens canonical carrier paths, parses exact Markdown entry blocks, rejects raw caller Markdown and forged neighboring digests, and makes missing measured carriers machine-failing source-binding `NOT_RUN`. Confirmation-only writing postures/routes/rejections/Growth Focus require structural explicit-confirmation provenance, route ids are enumerated, and user scope requires both current-session assumptions and runtime opt-in.
- Hardened selection and data rules: task-class → domain → project → opted-in user priority is always enforced; same-scope/source different values conflict and skip instead of letting caller-owned specificity or id act as a semantic tie-breaker; impossible/future dates and generic applicability placeholders fail; elapsed time proposes review rather than silently archiving without measured history.
- Kept Result Attention Rendering inside the existing parent-owned User Result Summary rather than adding a second output contract. Deterministic Profile Projection coverage is 58 cases (15 valid / 43 negative controls), alongside evaluation cases 89–109.
- Historical v2 probe artifacts remain unchanged. Their ten named one-host mechanisms retain their recorded result, while the old A/B/C product control remains `INVALID`; the separately versioned v3 replacement remains preregistered and `NOT_RUN`. Product value, longitudinal value, the full cross-host pilot, and v3 outcome/audit execution remain `NOT_RUN` and are not claimed by this release.
- Package contract version is 2.8.0. Profile Projection v1 remains experimental and opt-in inside the formally released package.

## 2.7.0 — 2026-08-13

- Parent-owned adaptive user results replace the mandatory pipe-delimited status line: routine success compresses, formal/failure/handoff/release expands, dirty artifacts bind exact identity, and adapters remain receipt-only. Writing now uses nine distinct jobs plus four canonical truth modes; source handling is a separate axis. Probe validation separates structure, identity, and independent semantic grade, retains P-W6 as FAIL, and checks local claim anchors.
- Terminal adaptive value (post-2.6.1 baseline): four legal terminals (EVIDENCED / BUILT / ACCEPTED / RELEASE_READY) may stop with `next_allowed_phase: null`; ALIGN Boundary states the turn terminal; user-visible Chinese status language tightened; bare「验收」disambiguation (not default publish); evaluation cases 66–73; adaptive host-probe / pilot docs remain screening or NOT_RUN until live transcripts exist.
- Cognitive collaboration + writing vertical: observable material cognitive layers, fixed/guided/open traceability, one writing adapter with truth modes and task-local deliver/co-create/explicit-coach posture, same-profile Writing Preferences + Growth Focus, and evaluation cases 74–88. Corpus research remains bounded to a read-only inventory and 14 traceable claims; no new lifecycle, route, authority source, ranker, embedding profile, or event store. Longitudinal writing growth remains NOT_RUN.
- Public README rewritten around user-visible collaboration results (shared checkable goal, evidence, stop reason, and separate release authority). Writing remains the first vertical, not the product boundary. Long-term, causal, and cross-host effects stay under evaluation and do not block current contract use.
- Package contract version is 2.7.0. Historical `v2.6.1` remains the previous published tag and is not reused.

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
