# AQL information-alignment iteration report

Status: local implementation and implementer self-QA complete; independent standard-acceptance review found the lifecycle-label contradictions corrected below, and final reacceptance is pending. Nothing was published, pushed, tagged, released, deployed, or installed globally.

## Result and boundary

The retained candidate is a minimal source-consistency patch for the existing single Skill and single Task Contract. It makes the common ALIGN path preserve result-changing objects, relations, negative scope, this-turn authority, and read-versus-write boundaries; permits one bounded question for an unobtainable decisive fact; loads the expanded alignment compiler only for complex cases; removes the false requirement for Open solution space; stops semantic-risk words/formal assurance from mechanically forcing ALIGN fan-out; treats probe divergence as a lead rather than proof; and allows multiple independent decision-changing cautions.

The behavior screen did **not** prove an uplift. On the same 16 synthetic forced-load cases, `gpt-5.6-terra` at medium effort produced identical retained-arm judgments: A = 13 PASS / 3 NOT_DECIDABLE / 0 hard-boundary violations; B = 13 PASS / 3 NOT_DECIDABLE / 0 hard-boundary violations. The patch is therefore retained for verified rule consistency and missing coverage, not claimed model improvement.

## Baseline and identities

- Repository baseline: clean `master`, HEAD `a10c4dd0810b4981521ab04890c48123b33da36b` (`docs: mark v3.2.0 as current release`).
- Baseline canonical identity: Skill SHA-256 `fc3389dac96552b240d41a8b3a296468578b2ae062329e1af3b475bcf9b72f45`; manifest SHA-256 `682edeae06d39986ce4a1643574e2d17d7af93aa0a2f535ed72905e7d05ee878`; portable tree SHA-256 `24594c0982cd751da6be8933fb56fb54089164e9f91137cd3aeb475ff63dda6f`.
- Retained canonical Skill SHA-256: `d7a70d2a50c137d968128bec8c5aeb28246454d7e9c4116fbea2dc36ee9894b9`.
- Final synchronized package identity at the last pre-report doctor run: manifest SHA-256 `dcfed9ba5161a982abdd628832eb87650e8277492be748c5bc34e1bb12a9e715`; portable tree SHA-256 `df60f8411c3ff667ee1b55bcb2bbb36d055995b1ae9ad83dced434eafa05e0bd`.
- The manifest contains a generated timestamp, so package digests change when mirrors/manifests are regenerated even if `SKILL.md` bytes return to the same content. Forced-load executors opened only `SKILL.md` plus the input file; their behavioral binding is therefore the recorded Skill hash and opened-file list. Final package acceptance binds the synchronized package identity separately.

## Evidence to root cause

| Evidence | Finding | Resulting action |
|---|---|---|
| Baseline `validate-all`, mirror check, and doctor all passed | The repository was mechanically healthy; a broken package or mirror was not the observed problem | Do not rebuild packaging or installer mechanisms |
| `alignment-compiler.md` failed closed when “no meaningful solution space remains” | A fully specified task could be rejected merely for having no Open quota | Remove that fail condition; retain only source traceability and fixed-obligation evidence |
| `multi-agent-leverage.md` opened ALIGN probes on formal/risk-word triggers and called surviving divergence proven ambiguity | Dispatch and ambiguity conclusions were broader than the evidence justified | Require unresolved high-impact readings after grounding; treat divergence as an investigatory lead |
| `result-attention.md` allowed only one caution | Several independent decision-changing risks could be omitted by presentation budget | Keep one primary conclusion/action but preserve every independent material caution |
| Common `SKILL.md` path lacked explicit read/write split, relation/shared-record grounding, missing-decisive-fact question, and partial blocking | Useful semantics existed only partially or in references, so routine execution was not self-contained | Inline the minimal high-frequency rules; keep `alignment-compiler.md` on-demand |
| Doctor reported host discovery/runtime read/application as `NOT_RUN` | Filesystem identity did not establish natural host loading or actual behavioral application | Do not attribute the issue to Skill discovery and do not claim natural activation |

## Scope and decisions

Reused: the single Task Contract, existing lifecycle/authority/evidence rules, Fixed/Guided/Open classification, correction dependency, formal independent acceptance, release separation, explicit-only memory, current-target distinction, and existing sync/validation architecture.

Changed: canonical `SKILL.md`; `alignment-compiler.md`, `contracts.md`, `multi-agent-leverage.md`, `result-attention.md`, and the directly conflicting writing reference; focused evaluation cases and validator anchors; generated mirrors/manifests; README, changelog, claim matrix, and this small experiment directory.

Rejected or intentionally unchanged:

- no Jev API, SDK, model confidence threshold, semantic scoring runtime, second contract, event ledger, user profile expansion, background service, model router, or mandatory questionnaire;
- no public schema, lifecycle, permission enum, installer, hook, release workflow, or version bump;
- no modification or access to the real `D:\MobleGame\landlord\Tables\Datas\手机聊天表.xlsx`;
- no publication or global installation;
- the second, broader “deliver every supported effect / own every Open choice now” increment was rejected after a fresh run showed one improvement and one regression, including a regression on the core chat-table case.

## Behavior screening

- Host: Codex local task on Windows.
- A/B executor: `gpt-5.6-terra`, reasoning effort `medium`, fresh context per arm.
- Adjudicator: `gpt-5.6-sol`, reasoning effort `high`, fresh read-only context.
- Loading: explicit forced-load of the assigned `SKILL.md`; natural discovery not tested.
- Input: 16 synthetic JSON-like cases. This verifies semantic task behavior only, not native Excel fidelity.
- Final result: parity, 13 PASS / 3 NOT_DECIDABLE per arm, zero hard-boundary violations, no decisive difference.
- Remaining NOT_DECIDABLE cases in both arms: `ia-02` omitted a known conditional freeze effect; `ia-09` preserved Open mechanism status but did not choose a concrete mechanism; `ia-13` promised a three-email deliverable without providing a usable sequence/plan.
- Former held-out cases: `ia-15` and `ia-16` both passed, but lost held-out status after round-1 results informed a later iteration. Final reporting does not call them blind or held out.

Raw evidence hashes:

- `results/arm-a-raw.json`: `b64292351990775b011411525b8224a8f7b8e21e6e9c25be171cc7e5b3eb7636`
- `results/arm-b-raw.json` (retained candidate): `bf4b1ec85552c551a9765266e67dbc03c34741f8f5763b741a6422670ccb2475`
- `results/adjudication-final.json`: `a6624eaafb6962fdb2148edc6e4d3ed7e085daab0eb17c728f4d329082c945da`
- Rejected second candidate raw: `1ca887840b82cd6d50754e407b9c2eff1077ba6c5ab330ce43205552c4e687de`
- Rejected second-candidate adjudication: `14e35f28dcec818bde64148be800a219a53cfa606774ddd0699a5219f0b845a6`

## Verification performed

Baseline on Node `v24.14.0`, Windows `10.0.19045` x64:

- `node scripts/sync-skills.js --check` — PASS
- `node scripts/validate-all.js` — PASS
- `git diff --check` — PASS
- `node scripts/aql-doctor.js --json --root . --active-skill .cursor/skills/agent-quality-loop` — package identity PASS with expected WARNs for opt-in hooks/MCP coverage; discovery/runtime/application `NOT_RUN`

Candidate-focused checks after final semantic edits:

- `node scripts/sync-skills.js` — mirrors regenerated
- `node scripts/sync-skills.js --check` — PASS
- `node .cursor/skills/agent-quality-loop/scripts/validate-skill.js` — PASS (58 envelope regressions)
- `node scripts/validate-claims.js` — PASS (32 evaluation cases)
- `node scripts/validate-information-alignment-experiment.js` — PASS
- `git diff --check` — PASS

Final full check: `node scripts/validate-all.js` — PASS on Node `v24.14.0`, Windows `10.0.19045` x64. All constituent commands exited 0, including the new information-alignment protocol validator, 32-case claim consistency, 58 envelope regressions, 124 hook fixtures, installer/profile/conformance suites, writing evidence checks, and final mirror consistency. The exact acceptance-time diff identity remains to be frozen immediately before independent standard reacceptance.

## Not verified

- Natural Skill discovery, runtime read/mount identity, and behavioral application for the final candidate.
- WorkBuddy or any other IDE's native behavior.
- Native Excel read/write fidelity, screenshots, or real business data.
- Cross-model, cross-host, cross-platform runtime behavior beyond the Windows mechanical suite.
- General model improvement, user productivity, long-term value, or product benefit.

## Implementation receipt

- Adapter: `code-implementation-adapter/v2` (local documentation/validator maintenance).
- Input baseline: HEAD `a10c4dd0810b4981521ab04890c48123b33da36b`, initially clean.
- Changed artifacts: canonical Skill text and direct references; generated mirrors/manifests; focused evaluation/experiment files; README/changelog/claim matrix; validation entrypoint.
- Scope deviations in implementation: none. The real game workbook, global profile storage and host configuration, publication, and external systems were not modified. During the first independent review, the acceptor's initial `aql-doctor` invocation unintentionally read global Profile schema/status counts without exposing entry content; subsequent validation isolated `AQL_HOME` to a nonexistent path. This review-process read did not affect candidate source or behavior evidence, but it is retained as an explicit process deviation.
- Remaining risks: three screen cases remain NOT_DECIDABLE; natural discovery/native Excel evidence remains NOT_RUN; package digest is manifest-timestamp-sensitive.
- Result phase: BUILT with full implementer self-QA PASS, pending independent standard reacceptance after required report-only corrections.

## Independent acceptance and rollback

The independent acceptor must read the authoritative task book and user request first, then this report's frozen scope, the exact diff, raw A/B evidence, final validation output, and only then implementation narrative. The first pass correctly refused acceptance because this report mislabeled the pending standard review as formal and simultaneously claimed it was already recorded; the first narrow recheck correctly refused again because one `formal acceptance` label remained. After correcting all current-review labels, recording both refusals, and recording the review-process deviation above, the same acceptor must recheck the affected evidence/lifecycle assertions. Its final read-only record will be saved under `results/independent-acceptance.json`; acceptance does not authorize publication.

To revert only this iteration, restore the tracked diff against baseline HEAD `a10c4dd`, remove only `docs/experiments/aql-3.2-information-alignment/` and `scripts/validate-information-alignment-experiment.js`, then regenerate mirrors with `node scripts/sync-skills.js`. Do not use a broad reset when unrelated user changes are present.
