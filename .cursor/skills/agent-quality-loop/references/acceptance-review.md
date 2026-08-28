# Independent Acceptance Review

Acceptance tests whether the frozen Task Contract is faithful to readable authoritative request/correction/spec provenance and whether the delivered artifact meets that contract. It is a fresh-context, read-only AQL Core function, not implementation self-QA, a vote, or release authorization.

## Trust Invariants

These do not add routine-task ceremony. Ordinary work stops at `BUILT`.

- Fresh context
- Read-only
- Read order: available authoritative request/correction/spec provenance → contract → artifact/diff → raw evidence → implementer narrative
- No self-certification
- Evidence-bound PASS; a demonstrated defect is FAIL
- Acceptance does not repair
- Acceptance is not release

## Standard acceptance (default)

Standard acceptance is result-anchored free review. The acceptor answers three questions with whatever probes professional judgment selects, in any order, with no dimension bookkeeping and no `not_applicable` classification ceremony:

1. When authoritative source provenance is readable, are the frozen goal, scope, and non-goals faithful to it, and does the observable after-state hold?
2. Is any hard boundary violated (authority, fabrication, evidence honesty, acceptance/release separation)?
3. Is every claim within its evidence and observer limits?

Findings are reported result-first in plain prose, ordered by consequence. No fixed finding template. Cold-consumption probes and counterexamples are tools the acceptor may choose, not mandatory steps.

When authoritative provenance is unreadable, standard acceptance may report contract-relative findings and their boundary, but cannot claim original-intent fidelity or grant lifecycle `ACCEPTED`.

A bare request containing「验收」routes here unless the user asked for `formal` quality or a release-bound accept. Do not dump dimension tables. Do not use release language.

## Conjunctive Review

Use this method only when `assurance: formal` or the accept is bound to a later release gate.

Classify every canonical dimension as `required` or evidence-backed `not_applicable`. The required set is never empty and always includes:

```text
goal_fidelity
semantic_invariants
user_observable_result
reproducibility
```

Also assess `source_static`, `tests`, `runtime_native`, and `privacy_security` when applicable. For each required dimension, record `PASS`, `FAIL`, `BLOCKED`, or `NOT_RUN` and bind `PASS` to concrete, readable, current, dimension-relevant evidence.

`user_observable_result: PASS` requires both a native-medium / runtime `evidence_kind` and `observer_class` of `mechanical_runtime` or `human` (with `human_role`). `agent_review` cannot produce that PASS.

Grant `ACCEPTED` only when every required dimension is `PASS`. A demonstrated defect yields `FAIL`. Missing evidence, baseline, authority, or independence yields `BLOCKED`/`PENDING`. Do not repair during acceptance without new execute authority.

When authoritative request/correction/spec provenance is readable, `goal_fidelity: PASS` must bind source-to-contract and contract-to-result evidence. When that provenance is unreadable, the acceptor may report contract-relative conformance, but formal `goal_fidelity` is `BLOCKED` or `NOT_RUN`; it cannot claim fidelity to the original intent or grant `ACCEPTED`.

## Entry Conditions

- A readable aligned/evidenced contract, implementation receipt, artifact/diff, and baseline are available. Any lifecycle `ACCEPTED` claim also requires readable authoritative request/correction/spec provenance.
- The acceptor has a distinct context reference. A role rename inside the same context is not independence.
- If those conditions cannot be evidenced, keep the last valid phase at `BUILT` and record `PENDING` or `BLOCKED`; never self-certify.

Acceptance ends at quality assessment. It neither starts release preflight nor authorizes a tag, push, publish, deployment, upload, or external write.
