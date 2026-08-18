# Agent Quality Loop Repository Rules

## Architecture

`agent-quality-loop` is the sole product Skill and owns the single Task Contract. Do not add standalone adapters, physical route packages, route aliases, or another task/profile lifecycle.

The frozen first-principles scope, non-goals, and completion gates are in [docs/aql-3.0-product-contract.md](docs/aql-3.0-product-contract.md).

Profile v2 is optional, `explicit_only`, and may affect only Guided choices. It never grants authority or acceptance. AQL Core must remain usable if the profile, CLI, or home directory is unavailable.

## Sources And Distribution

Edit canonical Skill content only under `.cursor/skills/agent-quality-loop/`. `.agents/skills/agent-quality-loop/` and `skills/agent-quality-loop/` are generated mirrors. Run `node scripts/sync-skills.js` to regenerate them; `node scripts/sync-skills.js --check` must be read-only.

The repository installer copies snapshots from the host-specific source tree. It owns only receipt-backed snapshots; profiles and project files are never installer-owned.

## Verification

Run `node scripts/validate-all.js` after compatible package and mirror updates. Structural validation is not semantic acceptance or product evidence. Do not relabel historical v1 A/B/C evidence as AQL 3.0 product evidence: its control is `INVALID`.

External publication, tags, releases, and remote changes still require current-turn user authority.
