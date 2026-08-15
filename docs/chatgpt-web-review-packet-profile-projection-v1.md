# ChatGPT Web Review Packet: Profile Projection v1

Review target: the GitHub pull request whose base is commit
`3fceb261175930e0b975b78c2f56a857701b7bb4` on `master` and whose head is the
current PR revision.

Package contract version under review: `2.8.0`. Opening or reviewing the pull
request does not itself merge, tag, release, deploy, or mutate a consumer
profile; those actions remain bound to the repository's explicit release flow.

## Review Objective

Determine whether Profile Projection v1 is a coherent, implementable, and
falsifiable single-contract mechanism that preserves user authority and AQL's
existing evidence, acceptance, and release boundaries.

Review mechanism quality and evidence integrity separately from product value.
The current product-value experiment is intentionally `NOT_RUN` because the
existing B condition is not a discriminating no-projection control.

## Required Review Order

Do not treat this packet, the PR description, or an implementation summary as
evidence. Use this raw-first order:

1. Read the mechanism and carrier contract:
   - `.cursor/skills/agent-quality-loop/references/profile-projection.md`
   - `.cursor/skills/agent-quality-loop/references/contracts.md`
   - `.cursor/skills/agent-quality-loop/references/personalization.md`
   - `.ai/knowledge/collaboration-profile.template.md`
2. Inspect deterministic enforcement:
   - `.cursor/skills/agent-quality-loop/scripts/validate-profile-projection.js`
   - `.cursor/skills/agent-quality-loop/fixtures/profile-projection-v1.json`
   - `.cursor/skills/agent-quality-loop/scripts/validate-envelope.js`
   - `.cursor/skills/agent-quality-loop/references/evaluation-cases.md`
3. Verify published evidence before interpreting transcripts:
   - `probes/verify-profile-projection-evidence.js`
   - every `manifest.json` and `evidence.lock.json` under the four canonical
     `probes/transcripts/2026-08-15/profile-projection-v1-*-v2/` directories
4. Read the exact prompts and raw per-run `.md` transcripts. Use `.jsonl` only
   to resolve discrepancies.
5. Read the neutral raw-first review:
   - `probes/transcripts/2026-08-15/profile-projection-v1-neutral-review-v2/review.md`
6. Only then read:
   - `docs/profile-projection-v1-experiment.md`
   - `docs/claim-evidence-matrix.md`
   - this packet and the PR description

If repository access does not expose any required artifact, mark the affected
dimension `NOT_RUN` or `BLOCKED`; do not infer a pass from summaries.

## Fixed Invariants

- The existing Task Contract remains the only lifecycle state carrier.
- Profile data may influence a task only through selected, source-bound
  `injected_refs`; no `profile_projection`, `user_lens`, or
  `collaboration_brief` top-level state is allowed.
- Current-turn instructions override stored preferences before ranking.
- Fresh Mode suppresses optional personalization, not facts, repository rules,
  learned lessons, evidence requirements, assurance floors, or authority.
- Profile entries cannot grant write, push, release, acceptance, or evidence
  authority.
- At most two profile references may be injected for one task.
- Candidates, stale entries, archived entries, incomplete legacy entries, and
  confirmation-required unconfirmed entries cannot fire.
- Selection does not mutate the profile. Temporary overrides do not become
  durable preferences.
- Structural or behavior PASS must not be promoted into product value,
  longitudinal value, release readiness, deployment, or production proof.

## Questions The Review Must Answer

1. Does the design actually preserve one lifecycle contract, or has a second
   source of truth reappeared under another name?
2. Are entry identity, source, scope, status, content digest, selection reason,
   ordering, and two-entry budget defined precisely enough for independent
   implementations to agree?
3. Can the collaboration-profile template represent every required active and
   candidate field without relying on ambiguous prose or hidden state?
4. Does Fresh Mode suppress only optional personalization while preserving all
   non-personal constraints and trust boundaries?
5. Do the validators reject duplicate identity, malformed reasons, forbidden
   state carriers, stale or ineligible entries, and nondeterministic ordering?
6. Does T5-C prove only the stated host-gated no-supply boundary? Confirm that
   the excluded user-entry sentinel is absent from the exact executor prompt.
7. Are the sanitized published artifacts coherently bound by per-artifact
   digests, manifests, and non-self-referential locks? Identify any way evidence
   could be substituted without detection.
8. Do the 16 behavior runs support the ten named mechanism observations without
   supporting a stronger product or production claim?
9. Is `A_B_C_comparison_validity: INVALID` the correct causal conclusion? If
   so, specify the smallest valid replacement control and preregistration
   change, but do not count that proposal as executed evidence.
10. Did any change widen authority, alter default installation, change package
    lifecycle semantics, or silently raise the package version?

## Evidence Identities

```text
deterministic_fixture_sha256:
  975d054e6a14a24c495702c9706af010b8e953dd0b853ae6b4d925ee40ec5eed
smoke_suite_sha256:
  0e9fd7044749c4642eff5c624ebd29dfed258ba7b241532aa89b423027165bb0
coverage_addendum_sha256:
  8cb2b1bbed1a1dee87eb81a47a69efd8deb79bdfe5d44e6b14ebc4e25fead95e
smoke_manifest_sha256:
  8cd2fbc41548e8480f7222e0671fba00e6f846feb95234e589dded27e443145f
coverage_addendum_manifest_sha256:
  77297fd534dcca52d00d648f8160cf5f4abf1c6ddf0bf2fcd331ca453878f92b
opt_in_boundary_manifest_sha256:
  990a416f3fdaf206fb0efa2a35f09f40e8ace5d86f9d081dea538ad9ea9ef0fe
neutral_review_manifest_sha256:
  e0561b19816c632da23fed304aa9aee2675f01fe83231c71c05e5707fb11379d
```

Recompute these identities from the PR contents. A digest mismatch blocks the
associated claim.

## Reproduction

Run at minimum:

```powershell
node scripts/sync-skills.js --check
node .cursor/skills/agent-quality-loop/scripts/validate-profile-projection.js --self-test
node .cursor/skills/agent-quality-loop/scripts/validate-envelope.js --self-test
node probes/run-profile-projection-smoke.js --self-test
node probes/run-profile-projection-review.js --self-test
node probes/verify-profile-projection-evidence.js
node scripts/validate-all.js
git diff --check
```

Do not rerun remote model probes merely to review the existing evidence. A new
behavior run is a new evidence batch and requires a new manifest identity.

## Required Output

Lead with findings ordered by severity and cite exact files and lines. Separate
demonstrated defects from missing evidence and advisory improvements.

Then report exactly these independent verdicts:

```text
review_integrity: PASS | FAIL | BLOCKED
single_contract_invariant: PASS | FAIL | BLOCKED | NOT_RUN
profile_projection_spec: PASS | FAIL | BLOCKED | NOT_RUN
deterministic_enforcement: PASS | FAIL | BLOCKED | NOT_RUN
published_evidence_integrity: PASS | FAIL | BLOCKED | NOT_RUN
ten_behavior_coverage: PASS | FAIL | BLOCKED | NOT_RUN
A_B_C_comparison_validity: VALID | INVALID | NOT_RUN
product_value_experiment: PASS | FAIL | NOT_RUN
longitudinal_value: PASS | FAIL | NOT_RUN
release_readiness: PASS | FAIL | FORBIDDEN | NOT_RUN
overall_review: PROCEED | PROCEED_WITH_FIXES | BLOCK
```

The following reasoning is forbidden:

- many passing tests therefore product value is proven;
- a clean neutral review therefore the implementation is release-ready;
- absent evidence therefore PASS;
- a later proposal or planned pilot therefore the experiment ran;
- PR creation, approval, or mergeability therefore release authorization exists.

## Implementer-Declared Current Status

This block is a claim to verify, not an answer to adopt:

```text
mechanism_spec_verdict: PASS
deterministic_fixture_verdict: PASS
behavior_probe_verdict: PASS
A_B_C_comparison_validity: INVALID
product_value_experiment_verdict: NOT_RUN
longitudinal_value_verdict: NOT_RUN
release_verdict: FORBIDDEN
```
