# Changelog

Versions are the `manifest.json` / frontmatter `metadata.version` value shared by all four packaged skills. Release integrity rule: acceptance evidence binds the exact shipped bytes — verify against the tagged commit, not a report hash.

## Unreleased

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
