# Independent Acceptance Review

Acceptance tests whether the delivered artifact meets the frozen Task Contract. It is a fresh-context, read-only AQL Core function, not implementation self-QA, a vote, or release authorization.

## Entry Conditions

- A readable aligned/evidenced contract, implementation receipt, artifact/diff, and baseline are available.
- The acceptor has a distinct context reference and reads contract -> artifact/diff -> raw evidence -> implementer narrative. A role rename inside the same context is not independence.
- If those conditions cannot be evidenced, keep the last valid phase at `BUILT` and record `PENDING` or `BLOCKED`; never self-certify.

## Conjunctive Review

Classify every canonical dimension as `required` or evidence-backed `not_applicable`. The required set is never empty and always includes:

```text
goal_fidelity
semantic_invariants
user_observable_result
reproducibility
```

Also assess `source_static`, `tests`, `runtime_native`, and `privacy_security` when applicable. For each required dimension, record `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` and bind `PASS` to concrete, readable, current, dimension-relevant evidence.

The user-observable dimension requires a cold-consumption probe in the artifact's native medium when feasible. The probe runs before the implementer narrative; text self-consistency does not replace it. An unrun/infeasible probe is `NOT_RUN`, not `PASS`. Run at least one decision-changing counterexample when the contract defines one.

## Findings And Decision

Report findings before summary, ordered by consequence. Each finding identifies severity, affected dimension, evidence, user impact, and the smallest repair boundary. Advisory style feedback is disclosed but cannot fail an otherwise evidenced required dimension.

Grant `ACCEPTED` only when every required dimension is `PASS`. A demonstrated defect yields `FAIL`. Missing evidence, baseline, authority, or independence yields `BLOCKED`/`PENDING`. Do not average, score, or trade off a failed required dimension. Do not repair during acceptance without new execute authority.

Acceptance ends at quality assessment. It neither starts release preflight nor authorizes a tag, push, publish, deployment, upload, or external write.
