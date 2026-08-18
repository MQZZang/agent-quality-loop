# AQL 3.0 Product and Execution Contract

Status: frozen implementation contract for the accepted AQL `3.0.0` development
baseline. It governed the local build and acceptance phase; publication is a later,
separately authorized release task.

Amended by AQL `3.1.0`. This document stays frozen as the 3.0 record; 3.1 changed the
hot-path structure, added the observation axis, added the G1-G3 mechanical gates, and
narrowed four-dimension acceptance to formal or release-bound work. For shipped
behavior read the Skill source under `.cursor/skills/agent-quality-loop/` and the
3.1.0 entries in [CHANGELOG.md](../CHANGELOG.md); where they disagree with this
document, the Skill source is authoritative.

Baseline: published AQL `2.8.0`, Git commit `9af3923`.

This document is the executable instruction for AQL 3.0. It replaces conflicting
mechanisms or sequencing in the two earlier planning drafts. Historical AQL 2.8
evidence remains evidence about 2.8 only; it does not override this contract.

## 1. First-principles goal

AQL 3.0 must let a user give one natural-language request to one portable Skill and
receive a trustworthy result governed by one Task Contract. The user remains the
owner of goals, authority, durable preferences, and release decisions. The agent
retains professional freedom only inside those boundaries.

The target is not "fewer files", "a profile CLI", or "all work packages completed".
Those are means. The target is this observable after-state:

1. A host discovers one AQL product Skill: `agent-quality-loop`.
2. The Skill can align, diagnose, implement, self-check, independently accept, and
   prepare a release without depending on another AQL Skill.
3. One Task Contract is the sole task-lifecycle and authority source of truth.
4. Durable personalization occurs only after an explicit user memory instruction or
   explicit confirmation, and influences only Guided choices.
5. Missing profile access, CLI access, user-directory access, hooks, or host features
   never prevents the Core workflow from operating.
6. Every completion, capability, portability, and product-value claim is bounded by
   readable evidence. Unknown evidence is `NOT_RUN`, never presumed support.
7. Local acceptance never performs or implies push, merge, tag, publish, deployment,
   Release creation, or another external write.

## 2. Authority and truth hierarchy

When two sources conflict, use this order:

1. Platform safety and the user's explicit current-turn instruction.
2. Target-project scoped instructions and facts.
3. The current Task Contract.
4. A temporary Profile Projection derived from confirmed Profile v2 entries.
5. Capability Receipt observations and implementation receipts.
6. Historical plans, prior summaries, examples, and old probe evidence.

The Profile, projection, Capability Receipt, CLI, installer receipt, and acceptance
report are not parallel task contracts. None can add authority or silently change the
goal. Present workspace reality outranks serialized claims about it.

## 3. Fixed scope and non-goals

### In scope

- One canonical Skill and its generated host mirrors.
- The existing Task Contract lifecycle and authority boundaries.
- Built-in code execution/self-QA and fresh-context conjunctive acceptance.
- Profile v2, deterministic projection, migration, import/export, and optional CLI.
- Mechanically sourced Capability Receipts.
- Ownership-aware install, status, update, and uninstall.
- Offline, read-only public conformance checks.
- Result Attention: ordinary output leads with the decision and hides internal
  receipts unless they affect the user.
- Honest preregistration and evidence ledgers for product screening.

### Out of scope

- Implicit behavioral surveillance, hit counters, or hidden candidate storage.
- Automatic cross-device sync, cloud accounts, background services, or uploads.
- A second lifecycle, User Lens, Collaboration Brief, ranker, vector database, or
  profile-driven executor authority.
- Physical route packages or compatibility Skills in the 3.0 distribution.
- Reintroducing a removed Skill to compensate for weak routing.
- Forensic erasure of OS snapshots, filesystem journals, or external backups.
- Claims of longitudinal user growth, automatic learning, or causal productivity
  improvement without completed longitudinal evidence.
- Any external release action in this implementation Goal.

## 4. Frozen product decisions

### 4.1 One Skill

The only AQL product Skill in each discovery tree is:

```text
agent-quality-loop
```

The useful semantics of `ask-plan-code-qa` and `review-gate` must exist inside the
Core Skill or its references before their standalone packages are removed.
`skill-factory` is not distributed by AQL 3.0. Physical `aql-*` route shims do not
exist. Natural-language intent is the canonical interface; host-specific shorthand
may be documented only after a real host probe supports it.

### 4.2 One Task Contract

The Task Contract owns goal, scope, non-goals, assurance, authority, evidence,
pause conditions, lifecycle phase, acceptance, and release boundaries. Adapters and
runtime controls return bounded receipts only. Implementation can reach `BUILT`;
only a separately evidenced fresh context can map the same frozen bytes to
`ACCEPTED`. `ACCEPTED` never means `RELEASE_READY`, deployed, or published.

### 4.3 Explicit-only Profile v2

The default policy is `explicit_only`:

| User behavior | Durable result |
|---|---|
| Explicit low-risk memory instruction with clear meaning | May write an active entry and disclose how to revoke it |
| Explicit memory instruction involving identity, aliases, or decision-shaping ambiguity | Restate exact meaning and write only after confirmation |
| Explicit collaboration correction | May ask once at a natural stop whether to remember it; no confirmation means discard |
| Repeated ordinary choices without durable intent | Do not store, count, activate, or prompt |

There is no cross-task repeated-signal detector in 3.0. A future
`assisted_candidates` mode would require separate opt-in and evidence; it is not part
of this release.

The canonical user profile is `$AQL_HOME/profile.json`. A profile entry contains an
opaque id, revision, status, scope, content, applicability and suppression rules,
expiry/review data, supersession links, and provenance. Profile content is preference
data, not authority or proof.

### 4.4 Projection

Projection is a temporary compile result, not durable state:

```text
confirmed Profile v2 entries
        -> deterministic filtering and conflict suppression
        -> at most two source-bound entries
        -> Guided choices in the existing Task Contract
```

The current request wins. Fresh Mode skips all profile preferences for that task.
Unknown applicability, same-priority conflict, expired/review-due state, or missing
source binding suppresses the entry. Fixed constraints and open professional choices
remain intact.

### 4.5 Core degradation

- No profile file: run normally with no personalization.
- Unreadable profile: skip it; surface the error only when profile management was
  requested or the omission materially affects the task.
- CLI unavailable: Core alignment, evidence, execution, self-QA, and acceptance still
  work; only the requested profile operation is unavailable.
- User directory inaccessible: record `profile_access: observed_false`; do not claim
  a read or fabricate defaults.
- Hooks unavailable: run semantic workflow normally; hooks are optional mechanical
  checks only.

### 4.6 Capability Receipt

A Capability Receipt is temporary and machine-sourced. Every capability field has a
tri-state result (`observed_true`, `observed_false`, `not_run`), source, observation
time, and relevant host/version identity. Permitted sources are installer detection,
host facts, explicit configuration, local probes, and actual tool results. Model
self-report, model inference from a host name, or optimistic defaults are forbidden.

Receipts contain no preference content, grant no authority, and are regenerated when
the host or relevant version changes. Ordinary results hide them unless a missing
capability changes the outcome.

### 4.7 Portability boundary

- Same machine: agents may share the same accessible `AQL_HOME`.
- Different machines: use explicit export/import.
- Remote or sandboxed host: use a host-provided controlled mount or set profile access
  false.
- Default: no network sync, daemon, upload, or cloud claim.

The public claim is "portable profile format and same-storage sharing", not
"automatic cross-device synchronization".

### 4.8 Project identity

`.aql/project.json` is absent by default. Create it only after the user confirms the
first project-scoped preference. It contains schema metadata and an opaque project id,
not a username, preference body, path, remote URL, credentials, or tool permissions.

### 4.9 Writes, concurrency, and deletion

Profile writes require schema validation, expected-revision compare-and-swap, an
exclusive lock, same-directory atomic replacement, backup/recovery, and stale-lock
handling. Two writers based on one revision cannot both silently succeed. An edit
cannot resurrect an entry concurrently forgotten.

Every profile and project-identity mutation must use the packaged CLI/runtime; an
agent must not free-form edit `profile.json` or `.aql/project.json`. If that control
plane is unavailable, only the requested profile-management operation is unavailable;
ordinary Core work continues without profile application.

`archive` retains an inactive entry. `forget` removes the entry body from active data,
managed pending data, managed caches, AQL-managed backups, and AQL-managed temporary
files. Receipts use opaque ids by default. A full managed cleanup may also delete
receipts containing that id. This is logical deletion from AQL-managed artifacts, not
forensic erasure of external copies or storage history.

### 4.10 Installer ownership

The installer manages exactly one package snapshot and records its exact inventory.
It must not overwrite or delete an unowned destination. Drift blocks update and
uninstall until resolved. Dry-run is read-only. Profile data and project identity are
never installer-owned and survive package uninstall.

The normative CLI entry is:

```text
node <SKILL_ROOT>/scripts/aql.js
```

No `npx aql` availability claim is made.

## 5. Required implementation order

These stages are dependencies, not independent wish lists:

1. Freeze this contract and record the 2.8 baseline. Old `INVALID` Profile v1 A/B/C
   is retained only as a methodology failure and historical negative control.
2. Internalize execution/self-QA and acceptance semantics; test them; then remove the
   three standalone Skills and all physical route shims.
3. Implement Profile v2 storage, CLI, migration, projection, and concurrency/failure
   behavior while preserving Core degradation.
4. Implement mechanically sourced capability and install ownership receipts.
5. Update all manifests, validators, docs, claims, generated mirrors, and attestation
   surfaces to the single-Skill 3.0 contract.
6. Add new preregistered Profile v2 A/B/C and 2.8-multi-Skill versus 3.0-single-Skill
   protocols. Never substitute the old invalid experiment or fixture assertions for
   observed product evidence.
7. Run focused tests, full offline validation, available host/platform probes, exact
   inventory and terminology scans, then freeze byte identity for independent review.
8. A fresh-context acceptor reads the contract, raw diff, files, and raw test output
   before the implementer summary. Any required failed or `NOT_RUN` dimension blocks
   `ACCEPTED`.

## 6. Acceptance gates

All required local gates are conjunctive:

| Gate | Required evidence |
|---|---|
| Product shape | Exactly one AQL Skill in canonical and generated discovery trees; no physical route packages |
| Semantic equivalence | Core references and behavioral cases cover implementation/self-QA and independent acceptance boundaries formerly carried by standalone Skills |
| Task truth | One Task Contract; profile/projection/receipt/CLI cannot create authority or lifecycle state |
| Profile control | Explicit-only writes, schema/revision validation, edit/archive/forget, import/export, enable/disable, dry-run migration |
| Projection | Current-turn override, Fresh Mode, scope/applicability/suppression, conflict suppression, max two, Guided-only injection |
| Safety | Concurrent-write conflict, crash-safe replacement, stale-lock recovery, edit-vs-forget non-resurrection, managed deletion boundary |
| Core availability | Missing/unreadable profile, unavailable CLI, and inaccessible user directory degrade without disabling Core |
| Capability honesty | Per-field mechanical source and tri-state result; unknown remains `not_run` |
| Installation | Ownership receipt, exact inventory, dry-run, status/update/uninstall, unowned/drift refusal, profile preservation |
| Conformance | Offline read-only runner verifies structural invariants without claiming semantic acceptance |
| Result Attention | Ordinary success leads with result/scope/evidence/action; internal profile and capability receipts stay hidden unless decision-relevant |
| Reproducibility | Generated mirrors and manifests match canonical bytes; full validation and diff checks pass from the declared baseline |
| Independent acceptance | Fresh context, separation evidence, raw-evidence-first order, exact worktree byte binding, cold consumption and counterexample probe |

Platform, host, product-screening, and longitudinal results must be recorded
individually. An unavailable environment is `NOT_RUN`; it cannot be rewritten as PASS.
Required advertised-host support cannot pass on documentation or schema evidence alone.

## 7. Product evidence and claim policy

Two new protocols are required:

- Profile v2 screening: A = no profile, B = full confirmed profile context,
  C = Profile Projection v2.
- Single-Skill non-inferiority: A = frozen 2.8 multi-Skill behavior,
  B = 3.0 single-Skill behavior.

Both must measure goal correctness, useful result quality, professional solution
quality, misrouting, extra questions, context cost, correct preference application,
correct suppression, and current-turn override. Protocol registration and mechanism
fixtures are not product-effect PASS. A failed screen is fixed at the relevant Core
or projection mechanism; it is not hidden with a new ranker, database, or compatibility
Skill.

`longitudinal_value_verdict: NOT_RUN` is allowed. While it remains `NOT_RUN`, public
materials must not claim proven long-term reduction in repetition, that AQL
automatically learns the user, or that it proves user growth.

Allowed claims must be literal and evidence-bounded: users can explicitly save,
inspect, override, disable, export/import, archive, and forget preferences; confirmed
entries use one portable format; task-local projection and single-Skill behavior have
only the evidence level actually recorded by their gates.

## 8. Stop and repair rules

Stop implementation only for a goal-changing ambiguity, unsafe unrelated worktree
collision, unavailable evidence required by a local gate, destructive/external action,
or a failed independent acceptance gate. Ordinary test failures do not reopen product
architecture: repair the smallest direct cause and rerun the affected gate plus the
full regression suite.

Never solve a single-Skill regression by restoring a removed Skill or route package.
Never solve unknown product value by upgrading it to a claim. Never solve profile
friction by making the CLI mandatory or memory implicit.

## 9. Completion definition for this Goal

This local implementation Goal is complete only when:

1. Every required local gate above has fresh passing evidence.
2. Exact canonical/generated inventories and byte hashes are reproducible.
3. No current public or normative surface contradicts this contract.
4. Unavailable external, host, product, or longitudinal evidence is explicitly
   `NOT_RUN`, with the corresponding claim withheld.
5. A fresh-context independent acceptor grants `ACCEPTED` to the exact frozen local
   worktree bytes.
6. No push, merge, tag, publish, Release, deployment, or other external write occurred
   inside this implementation Goal. A later publication task does not retroactively
   change that boundary and still requires separate current-turn authorization.

`ACCEPTED` is the terminal state for this Goal. A later release requires a separate,
current-turn authorization and a release-specific contract; this document grants none.
