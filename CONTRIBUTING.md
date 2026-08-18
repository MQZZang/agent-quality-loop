# Contributing

AQL has one product Skill and one Task Contract. Keep changes inside that model: do not add route shims, separate adapter packages, a second profile/task truth, or implicit cross-task memory.

Changes must remain consistent with [the frozen 3.0 product contract](docs/aql-3.0-product-contract.md) as amended by the 3.1.0 entries in [CHANGELOG.md](CHANGELOG.md).

1. Edit canonical package files under `.cursor/skills/agent-quality-loop/` only.
2. Update schemas, focused tests, and public claims with the behavior change.
3. Regenerate mirrors with `node scripts/sync-skills.js` only when the task authorizes generated output; use `--check` for read-only verification.
4. Run `node scripts/validate-all.js` before claiming structural completion.

Profile writes require explicit user intent. Capability Receipts must come from observed host/configuration/probe facts, never model self-report. A missing product or longitudinal experiment remains `NOT_RUN`; historical Profile Projection v1 A/B/C is `INVALID`, not a v3 result.

Do not push, merge, tag, publish, or create a release without explicit current-turn authorization.
