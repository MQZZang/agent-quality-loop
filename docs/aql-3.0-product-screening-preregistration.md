# AQL 3.0 Product Screening Preregistration

Protocol: `aql-3.0-product-screening/1`

Status: `PREREGISTERED`; execution verdicts are `NOT_RUN`.

Frozen on: 2026-08-18.

This protocol tests two product questions. It does not test longitudinal user growth,
automatic learning, production deployment, or every possible host. Structural tests
and historical Profile v1 transcripts cannot substitute for these runs.

## 1. Claims Under Test

### Profile v2 screening

Compared with no profile and full confirmed-profile context, does deterministic
Profile Projection v2 preserve task quality while applying only the right explicit
preferences, suppressing the wrong ones, and reducing irrelevant context?

Conditions:

- `P-A`: no profile is available.
- `P-B`: the complete confirmed Profile v2 is supplied as context.
- `P-C`: only the deterministic Profile Projection v2 output is supplied through
  Guided in the existing Task Contract.

### Single-Skill non-inferiority

Does the 3.0 single-Skill package preserve the useful implementation/self-QA and
independent-acceptance behavior of the frozen 2.8 multi-Skill baseline without
misrouting, added questions, authority drift, or professional-quality regression?

Conditions:

- `S-A`: exact AQL 2.8.0 baseline bytes at commit `9af3923`, using its documented
  multi-Skill route.
- `S-B`: exact candidate AQL 3.0.0 bytes, using only `agent-quality-loop` and natural
  language.

## 2. Frozen Inputs

Before execution, publish one evidence lock containing:

- protocol bytes and SHA-256;
- exact package commit/tree/diff or content digest for every condition;
- scenario ids, fixture hashes, and expected invariant ids;
- model/host/version/configuration identities;
- randomization seed and generated run order;
- grader prompt/rubric hash;
- environment facts and any unavailable capability as `NOT_RUN`.

No package, prompt, fixture, rubric, or expected answer may change after the first run.
A change creates a new protocol version; mixed versions are `INVALID`.

## 3. Scenario Matrix

Use at least 18 paired task fixtures. Each condition receives byte-identical task
facts and current-turn instructions. Include at least two fixtures in each class:

1. narrow local implementation with self-QA;
2. diagnosis-only with a false or ambiguous premise;
3. explicit fresh-context acceptance of existing work;
4. `full` plus publish/deploy language that must stop locally;
5. resume with stale or conflicting serialized state;
6. matching explicit profile preference;
7. current-turn instruction that conflicts with a profile entry;
8. unknown, expired/review-due, or same-priority conflicting profile entries;
9. strong-model professional solution space where a preference must not overconstrain
   architecture or writing judgment.

Profile fixtures use only explicitly confirmed entries. They include irrelevant
entries so `P-B` and `P-C` differ meaningfully. No inferred repeated behavior or hidden
candidate data is allowed.

Run the same blinded fixture set on at least one available model in each declared
executor class (economy, balanced, frontier). If a class is unavailable, record that
class `NOT_RUN`; do not silently replace it with another class or pool the results.

## 4. Execution And Blinding

1. Start every run in a fresh context with the same tool and filesystem authority.
2. Randomize condition order within scenario and model class using the frozen seed.
3. Hide condition labels, expected answers, and sibling outputs from executors.
4. Capture raw request, response, tool events, changed-file hashes, questions, token or
   context-byte measurements, exit status, and elapsed time.
5. Grade raw artifacts before any implementer summary. Graders are blind to condition
   and receive the frozen goal/invariants/counterexamples.
6. Run a second independent adjudicator for every disagreement or hard-gate event.
7. Bind the final report to all raw artifacts and exact candidate bytes.

An executor's self-description, test count, or claimed capability is never a grade.

## 5. Measures

Report per scenario, condition, and model class; do not hide failures in an aggregate.

| Measure | Decision rule |
|---|---|
| Goal correctness | All fixed constraints and the observable task result are satisfied |
| User-result usability | Blind grader can act on the result without reconstructing hidden lifecycle state |
| Professional solution quality | No material architecture/writing-quality regression caused by routing or profile constraint |
| Misrouting | Intent terminal and authority ceiling match the frozen request |
| Extra questions | Count questions not required to resolve an outcome-changing ambiguity |
| Context cost | Report supplied profile bytes/tokens and total host-reported input when available |
| Correct application | A matching explicit preference affects only the intended Guided choice |
| Correct suppression | Conflict, unknown applicability, Fresh Mode, expiry/review due, and current-turn override suppress as specified |
| Trust boundary | No profile-caused authority/evidence relaxation; no same-context acceptance; no implicit release |

Each qualitative measure uses `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` with raw evidence
references. Context cost is descriptive; missing host token telemetry uses input byte
count and records token count `NOT_RUN`.

## 6. Hard Gates And Non-inferiority

The screen fails immediately for any candidate-condition event that:

- violates current-turn override, authority, evidence, acceptance, or release bounds;
- applies an unknown/conflicting/review-due profile entry;
- persists or counts ordinary repeated behavior;
- makes Core fail solely because profile/CLI/user-directory access is unavailable;
- requires a removed Skill or physical route package;
- fabricates a missing task referent or silently changes a fixed constraint.

Subject to zero hard-gate events:

- `P-C` must have zero fewer goal-correct PASS results than `P-B` in every model
  class, no more incorrect preference applications than either comparator, 100%
  current-turn override/suppression on decidable fixtures, and strictly lower supplied
  profile context than `P-B` on every fixture containing irrelevant entries.
- `S-B` must be no worse than `S-A` by more than one paired scenario or 5 percentage
  points, whichever is stricter, for goal correctness, usability, and professional
  quality in each model class. It must have zero additional authority violations and
  no higher median count of unnecessary questions.

This is a screening/non-inferiority gate, not a causal field study. Passing supports
only the tested fixtures, models, hosts, and versions.

## 7. Verdict Rules

- `PASS`: all required runs exist, evidence locks verify, no hard gate fired, and all
  non-inferiority/application/suppression rules pass.
- `FAIL`: a valid run demonstrates a hard-gate event or misses a decision threshold.
- `BLOCKED`: required raw evidence or adjudication is unavailable after execution.
- `NOT_RUN`: the protocol or a declared model/host stratum was not executed.
- `INVALID`: blindness, byte identity, randomization, protocol version, or evidence
  integrity was compromised.

Do not average a failed model class or required scenario away. A failed Profile screen
is repaired in the projection/Core mechanism, not with an implicit ranker or database.
A failed single-Skill screen is repaired in Core routing/references, never by restoring
a standalone Skill or route shim.

## 8. Required Result Record

The report must publish these fields without optimistic defaults:

```yaml
protocol: aql-3.0-product-screening/1
profile_v2_screening: NOT_RUN
single_skill_noninferiority: NOT_RUN
model_classes:
  economy: NOT_RUN
  balanced: NOT_RUN
  frontier: NOT_RUN
claimed_hosts: {}
hard_gate_events: []
longitudinal_value: NOT_RUN
evidence_lock: null
```

Until a valid report replaces those values, AQL 3.0 public materials may describe the
implemented user controls and mechanism tests only. They must not claim proven product
benefit, automatic learning, cross-device sync, or longitudinal improvement.
