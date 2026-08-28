# AQL 3.2 semantic-patch protocol

Status: preregistered; behavioral runs and product-value claims `NOT_RUN`.

## First-principles question

Do the six semantic patches reduce instruction miscompilation without increasing unnecessary questions, irrelevant revalidation, visible process ceremony, or unsupported claims?

## Arms and identity

Compare the same model/host/task context under:

- `B0`: frozen pre-patch Core bytes;
- `P1`–`P6`: B0 plus exactly one semantic patch;
- `C`: the exact combined candidate bytes.

Record commit/tree/diff and portable package digest for every arm. A version string alone is insufficient.

Forced-load runs test instruction behavior after the exact Skill bytes are supplied. Natural-discovery runs test whether the host discovers/reads those bytes without forcing them. Never combine the two populations or infer runtime application from install status.

## Patch boundaries

1. current-state evidence versus target-state authority;
2. Fixed/Guided/Open mechanism identity;
3. authoritative-source-first acceptance and claim ceiling;
4. correction invalidates dependent bindings only;
5. causal reasoning routed by task intent;
6. no visible fixed alignment block while the internal material-decision record remains.

Each patch uses the paired positive/negative fixtures in `patch-fixtures.json`. A patch-level run changes only that patch. The combined run uses all pairs plus the existing AQL evaluation cases. Do not run every model × host × patch permutation before a representative arm shows signal.

## Measures

H0 records semantic hard failures. H1 records result quality and the following guardrails:

- unnecessary clarification on a fully specified request;
- irrelevant evidence invalidation/revalidation after correction;
- visible fixed alignment ceremony on routine work;
- root-cause theater on feature/greenfield work;
- unsupported load/use/product-benefit claims;
- decision density and inspectability of the user-facing conclusion.

## Decision rule

A patch is retained only if its positive fixture removes the targeted miscompile, its negative fixture preserves legitimate behavior, and it creates no new hard failure or guardrail regression in its pair. The combined candidate must preserve every patch pair and the existing mechanical validators. Any failure rolls back the smallest implicated semantic patch; do not add a new field, phase, ledger, gate, or adapter to compensate.

For the unreadable-source fixture, the required report is a contract-relative finding with an explicit boundary: no original-intent fidelity claim, no formal `goal_fidelity: PASS`, and no `ACCEPTED`.

These fixtures and validators prove only packaged semantics and deterministic invariants. General model improvement, productivity, long-term user value, and natural host activation remain `NOT_RUN` until separately executed controlled evidence exists.
