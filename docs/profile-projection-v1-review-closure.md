# Profile Projection v1 Review Closure

Date: 2026-08-15  
Branch: `review/profile-projection-v1-20260815`  
Review baseline: `3e32a4e94d1fb8bceff21dc83c76bfa4ce8935e2`  
Target status: local experimental review candidate; the mechanism merge gate is not yet met; no push, PR, merge, tag, release, publish, or deploy.

## Decision

The three original P0 defects and the named deterministic P1 defects are closed on the local validator, fixture, and Windows evidence surfaces. This is not a merge or release verdict: the v3 product comparison, its independent auditability arm, Ubuntu execution on these exact bytes, a real consumer project carrier, product value, and longitudinal value are `NOT_RUN`.

## P0 Closure

| Finding | Root cause | Repair | Decisive evidence |
| --- | --- | --- | --- |
| P0-1 verifier depended on reviewer identity | Published bytes were scanned with regexes compiled from the verifier host's current username and hostname. | Verification now uses fixed structural leak patterns only; generation-time redaction remains separate. Boundary-aware patterns cover common Windows and POSIX roots including `/root`, `/workspace`, `/etc`, `/usr`, `/var/lib`, and `/data` without treating URL path segments or ordinary words such as `root`, `runner`, or `admin` as identities. | The same six locked v2 evidence sets pass with identity/hostname unset, `root`, `runner`, `admin`, and `Administrator`; local-path negatives fail while `https://example.com/home/...`, `/tmp/...`, and `/C:/...` URLs remain clean. |
| P0-2 confirmation could be self-reported | `semantic.explicitly_confirmed` was caller-owned and was accepted as provenance. | Active confirmation-only entries require `source: explicit_confirmation` plus a safe `confirmation_ref`. Writing posture uses `writing_posture: deliver | co-create | coach`; route aliases require `trigger_phrase` and a fixed `route_id`. The semantic boolean is forbidden. | PP13 and PP36 reject route/writing bypasses; PP37 rejects an unrestricted route ID; PP38 accepts a structurally confirmed route; PP42 forbids the caller boolean even with otherwise valid provenance; PP43 and PP44 reject rejected-option and Growth Focus self-confirmation. |
| P0-3 source binding was fixture self-proof | The old fixture hashed caller-supplied `entry_content` and never opened a Markdown carrier. | `validate-profile.js` rejects raw caller Markdown, opens the canonical project path under `baseDir` or an explicitly opted-in canonical-suffix user path, parses exact `### <id>` blocks, and computes the normalized digest. Production measured selection fails closed when the carrier is unavailable; the fixture-only exception is private to the suite validator. | `project-architecture-detail` binds to `8166605fde4a538e264756b4dc8f7a6b282862e3f8ec1def0d60cd598178b439`; substituting block B digest `c232c66773b1ec22f014dc51195e08bc335ec354d1f235c974c27d20927cc944` fails. Raw text and a noncanonical project path also fail. |

The repository does not contain an actual `.ai/knowledge/collaboration-profile.md`. Therefore real consumer-task source binding is correctly `NOT_RUN`; the passing evidence above is the canonical carrier fixture and forged-neighbor negative control, not a fabricated project-profile PASS.

## Profile Entry Contract

Every projectable block has exactly one of each common field:

```text
id
lane
value
scope
applies_when
source
status
last_fired
```

Conditional fields remain in the same block and state source:

```text
conflict_key
confirmation_ref
writing_posture: deliver | co-create | coach
trigger_phrase
route_id: diagnose | accept | release-check | resume
source_ref / observed_at for candidates
```

Canonicalization is UTF-8, CRLF-to-LF, trimmed edge blank lines, preserved internal order/whitespace, and exactly one final LF. Incomplete legacy blocks remain readable but cannot project.

## P1 Closure

| Finding | Result |
| --- | --- |
| Selection priority | Always `task_class` -> `domain` -> `project` -> explicitly opted-in `user`, then source strength. Priority enforcement has no opt-out flag. |
| Semantic conflict | Within one `conflict_key`, different effects at the best scope/source tier skip as a conflict. Caller-owned `specificity` and stable ID can order equivalent same-effect records only. PP32 gives the selected entry specificity 99 and still rejects selection. |
| Dates | Impossible dates and fixture dates after `as_of` fail; `last_fired` updates require a real date, write authority, and a selected entry. |
| `applies_when` | Obvious placeholders and generic values fail lint. Remaining natural-language applicability stays agent/behavior evidence and is not mislabeled as deterministic semantic proof. |
| User profile | User-level carriers and selected refs require the conjunction of a structured `current_session` opt-in record in existing Task Contract assumptions, the explicit runtime opt-in gate, and a canonical-suffix carrier path. Both the production projection validator and full-envelope validator enforce the same shared assumption predicate. Project data is not silently migrated. |
| Decay | Time alone proposes review; it does not silently archive without measured history and write authority. |

## Result Attention

Result attention is a rendering rule inside the existing parent-owned User Result Summary, not a second contract or persistent state. The first visible lines prioritize conclusion, user impact/boundary, decisive evidence, uncertainty, and at most one necessary action. Routine success remains 1–3 lines; receipts stay out of ordinary output.

Example:

```text
已修复画像冲突选择漏洞；同层不同偏好现在全部跳过，不再由 specificity 或 ID 代替用户决定。
针对性负例与完整验证均通过；无需用户操作。
```

## Template Change

Before: multiple heterogeneous tables, free-form To Confirm bullets, merged metadata columns, and no stable way to derive exact entry refs/digests.

After: one compact eight-field block contract, conditional fields in the same block, canonical byte/hash rules, one active example, and one inactive candidate example. The template currently parses as one active projectable entry and one complete inactive candidate:

```text
comm-decision-first  7a1e7b32d6295adbba87c4bec51849231bb47a2c0f8a7be60e57bdca9c43f680
candidate-writing-posture  754ddd8703c2b8538ed6cef4321b73b44af47b885c0ea8b030b999978fff765c
```

## A/B/C v3

The v2 A/B/C comparison remains `INVALID` and its historical evidence was not rewritten. The v3 protocol is `PRE-REGISTERED` / `NOT_RUN`:

- A receives no collaboration profile;
- B receives the complete profile as ordinary background and no selection, ranking, projection, ref, compiled-effect, or why-applied directive;
- C receives the same complete bytes plus Profile Projection v1;
- every outcome model returns the same single `USER_RESPONSE` contract;
- runner receipts bind input/output transport only and mark refs/reason/source binding `NOT_RUN`;
- a separate audit-only replay checks refs, reasons, and canonical source binding after blind outcome grades are frozen.

Frozen identity:

```text
suite_sha256: 60f06b11f46fc2b44be6fe409acb4fe730f837facf56abdee684a7f3a9b0faaa
baseline_sha256: 0ebcd4f5cc8baf2d67f2f2670a0fa8cf4de6b8adbc8212a2750d135317d041ef
mechanism_sha256: 9730dc96477364e5bd0608a9363dc146d77346d36fbf7d2ba1a0622502f4b27a
runner_sha256: d9d4e187c01619b8052029d9671048d7ac2beaed15bd6448abdb3f001a942679
```

## Validation

Windows local full validation on the synchronized package bytes:

```text
node: v25.3.0
platform: win32 (Windows_NT 10.0.19045)
PASS skill package structure, links, portability, metadata, and 56 envelope regression cases
PASS claim consistency: 109 evaluation cases, 56 envelope regressions, 4 routes, 4 core skills, manifests ok
PASS Profile Projection v1 fixture contract (44 cases: 13 valid, 31 negative controls)
PASS Profile Projection v3 preregistered runner (12 prompt conditions)
PASS portable evidence safety is independent of verifier identity
PASS profile projection evidence sets=6
PASS skill mirror and manifest consistency
validate-all: all steps passed
```

Portable identity matrix:

```text
unset          PASS profile projection evidence sets=6
root           PASS profile projection evidence sets=6
runner         PASS profile projection evidence sets=6
admin          PASS profile projection evidence sets=6
Administrator  PASS profile projection evidence sets=6
```

Ubuntu raw execution on these exact local bytes is `NOT_RUN`:

```text
> wsl.exe -l -q
(no installed distribution)
ubuntu_validate_all: NOT_RUN
```

The instructions prohibit pushing the changed branch without explicit authorization. The repository CI is configured for `ubuntu-latest` and `windows-latest`, but configuration is not execution evidence.

## Independent Review Dimensions

Independent review covered portable verification, real carrier binding, confirmation provenance, selection/conflict semantics, date/condition/opt-in boundaries, result attention, and A/B/C isolation. One late review found the `specificity` bypass, B-arm mechanism language, and `/root`/`/workspace` path gaps. A second review then found URL false positives plus raw caller carrier self-proof. Every finding received a direct negative regression before the final full validation.

| Dimension | Current evidence-bound disposition |
| --- | --- |
| `single_contract_integrity` | `LOCAL PASS` — forbidden second-contract fields and ownership regressions pass. |
| `confirmation_provenance` | `LOCAL PASS` — confirm-only source, ref, structured posture/route, and self-report negatives pass. |
| `profile_carrier_integrity` | `LOCAL PASS` for canonical path-owned fixtures; actual consumer project carrier is `NOT_RUN`. |
| `selection_relevance` | `LOCAL PASS` for declared task-class/domain/project/user priority and conflict mechanics; natural-language relevance quality remains behavioral evidence. |
| `current_turn_override` | `LOCAL PASS`. |
| `fresh_mode_boundary` | `LOCAL PASS`. |
| `model_freedom` | `LOCAL PASS` for the no-fixed-method firewall. |
| `authority_and_evidence_firewall` | `LOCAL PASS`. |
| `portable_evidence_integrity` | `LOCAL PASS` on the Windows identity matrix; Ubuntu execution is `NOT_RUN`. |
| `user_attention_hierarchy` | `LOCAL PASS` for the reference and evaluation case; fresh-context visual blind grading is `NOT_RUN`. |
| `profile_visual_usability` | `LOCAL PASS` for one canonical block format and parser coverage; longitudinal usability is `NOT_RUN`. |
| `experiment_validity` | v2 `INVALID`; v3 `PRE-REGISTERED` / `NOT_RUN`. |
| `cross_host_behavior` | `NOT_RUN`. |
| `documentation_accuracy` | `LOCAL PASS`; no stable-release claim is made. |

## Explicit NOT_RUN

```text
actual project collaboration-profile source binding
v3 12-run smoke execution
v3 independent auditability replay
two-model/two-host full pilot
Ubuntu validate-all on the unpushed candidate
product-value verdict
longitudinal-value verdict
release verdict
```

## Git and Authority Boundary

Before the local closure commit, the intended change set contained 48 tracked modifications and 18 new files across the canonical package, generated mirrors/manifests, root documentation, validators, and v3 protocol files. The final staged summary was `66 files changed, 4307 insertions(+), 483 deletions(-)`. `git diff --cached --check` passed. Historical v2 evidence directories, the v2 runner, and its evidence utility were unchanged.

The remote review branch still points to the baseline commit until a maintainer explicitly authorizes push or PR creation.
