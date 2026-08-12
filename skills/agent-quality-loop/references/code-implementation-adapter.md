# Code Implementation Adapter

Read this reference only for code implementation. It is the self-contained embedded contract for `agent-quality-loop`; an installed `ask-plan-code-qa` may implement the same contract in embedded profile.

## Input

Require an `ALIGNED` and `EVIDENCED` parent contract containing:

- goal, success observables, counterexamples, scope allowlist, and non-goals;
- assurance and action authority;
- workspace/baseline identity and dirty-state caveat;
- causal evidence, assumptions, unknowns, pause conditions, and semantic must-hold checks when applicable.

If any conclusion-changing input is absent or stale, return to the parent lifecycle for read-only reconstruction. Do not create a second goal contract.

## Dispatch Brief

When dispatching a sub-executor (including a zero-context or weaker model), hand off a **Dispatch Brief**. The parent contract remains the single source of truth; the Brief is its executable projection for that leaf—not a second form or dual ritual. Compatible with host orchestration rules (for example user model-routing): if the parent contract already carries the fields below, project them into the Brief rather than re-authoring a parallel checklist.

Minimal field set:

| Field | Purpose |
|---|---|
| **goal anchor** | One-sentence outcome the executor must optimize for |
| **scope allowlist / non-goals** | Exact paths or surfaces allowed; what must not change |
| **baseline** | Workspace/baseline identity and dirty-state caveat |
| **must-holds** | Semantic or behavioral invariants that must remain true |
| **verification commands** | Exact commands/checks the leaf must run, with exit-code evidence |
| **escalation triggers** | When to stop and report upward (see list below) |
| **receipt format** | Point at the Output receipt schema; do not duplicate its YAML |

Escalation triggers (generic; stop and report, do not self-dispose):

- Brief is self-contradictory
- Goal or architecture must change
- Public contract must change
- The plan is fundamentally wrong
- Verification fails and cannot be fixed inside scope
- Security, payment, or data-migration concerns
- User product decision required

## Procedure

When dispatching a sub-executor, use a Dispatch Brief (above).

1. **Inspect** — re-read target files, callers, tests, configuration, and related contracts. Protect unrelated dirty work.
2. **Plan Gate** — choose the smallest root-cause change. Confirm scope, semantics, cross-file impact, acceptance method, and pause conditions. Only `Pass` or `Pass with Risk` permits editing.
3. **Code** — edit only allowlisted surfaces, follow existing architecture, preserve must-hold checks, and stop on scope expansion or authority conflict.
4. **Self-QA** — run the smallest sufficient checks for the inherited assurance. Record passing, failing, and not-run evidence; do not convert proxy evidence into a user-outcome claim.

Assurance controls verification cost, not authority:

- `fast`: trivial reversible change, focused diff/check.
- `standard`: default root-cause change with focused tests and relevant cross-file checks.
- `formal`: stronger implementation evidence for later independent acceptance; this adapter still ends at `BUILT`.

## Output

Return exactly one receipt to the parent lifecycle:

```yaml
implementation_receipt:
  adapter: code-implementation-adapter/v1 or ask-plan-code-qa/embedded
  input_contract_ref: contract id plus workspace baseline
  changed_artifacts: exact paths
  verification_performed: exact commands/checks and results
  passing_evidence_refs: concrete references
  failing_evidence_refs: concrete references
  not_run: required checks not performed and why
  scope_deviations: deviations or []
  remaining_risks: residual risks or []
  result_phase: BUILT
```

Do not emit duplicate alignment lines or a second lifecycle summary. Never claim `ACCEPTED`, `RELEASE_READY`, `DEPLOYED`, `PRODUCTION_VERIFIED`, or new authority.

## Pause Conditions

Pause and return an actionable blocker for:

- dirty-file collision or unattributable baseline;
- generated/source ambiguity;
- goal, scope, semantic, or authority drift;
- destructive, external, or production effects;
- missing secrets or runtime prerequisites;
- failing evidence that invalidates the plan.
