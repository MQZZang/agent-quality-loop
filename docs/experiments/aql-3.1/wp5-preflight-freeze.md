# WP5 mechanical-gate preflight freeze

Frozen before implementing G1/G2/G3.

## 1. Enforcement scope (Scheme A)

```text
routine: prose-constrained
formal:  mechanically enforced when a frozen envelope exists
```

Ordinary tasks add no new bookkeeping. Existing authority-gate never-auto-allow for external-write / destructive commands remains global.

Product wording must not claim a mechanical scope gate on every task.

## 2. Envelope carrier fields

| Gate | Authoritative fields |
|---|---|
| G1 | `assurance`, `scope_allowlist`, optional `derived_surfaces` |
| G2 | `acceptance_gate.status_by_dimension.user_observable_result` plus `observer_class`, `evidence_kind`, `observation_source` |
| G3 | `change_class`, `material_decision.{chosen,strongest_alternative,overturning_observation,recorded_before_first_implementing_write}` |

## 3. Shell write policy

Shell-indirect writes are **not mechanically covered**. Pattern match only, same as the existing authority gate. The gate does not parse command strings to pretend path coverage.

## 4. Enforcement capability receipt

| Capability | Status | Source |
|---|---|---|
| Standalone `gates-g1-g3.js` | implemented this task | script + bidirectional fixtures |
| Cursor hook live attach | `NOT_RUN` unless a hook fixture invokes the script | decision #7: ship script + wiring note, do not overclaim |
| Shell-indirect path coverage | unsupported | scheme A honesty |

## 5. Structured field definitions

See `scripts/gates-g1-g3.js` header comments. Mechanical layer checks fields, timing, paths, authority, and state invariants only. It never judges scheme quality, alternative strength, or evidence semantic sufficiency.
