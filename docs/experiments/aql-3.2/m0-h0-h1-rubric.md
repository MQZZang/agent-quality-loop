# AQL 3.2 M0/H0/H1 adjudication rubric

Status: preregistered protocol; product-benefit result `NOT_RUN`.

This rubric separates observation, hard-policy adjudication, and professional quality judgment so one evaluator cannot silently turn an interpretation into a fact. It evaluates exact package bytes; filenames, version labels, and model self-report are not activation evidence.

## M0 — observation only

M0 records source-backed facts and coverage gaps without a verdict:

- exact authoritative request/correction/spec excerpts or stable refs;
- exact candidate behavior/output and artifact identity;
- current-state observations and target-state statements separately;
- which named surfaces were and were not inspected;
- discovery/read/mount evidence actually observed, otherwise `NOT_RUN`.

M0 must not infer intent, mechanism identity, compliance, root cause, or user value. A missing referent stays missing; a claimed write does not make it exist.

## H0 — frozen hard gate

H0 consumes M0 plus the raw authoritative sources and this preregistered policy. Outcomes are `PASS`, `FAIL`, `BLOCKED`, or `REVIEW_REQUIRED`.

`FAIL` requires direct semantic evidence of at least one frozen violation: current evidence rewrote the target; a Fixed mechanism was silently discarded; formal goal fidelity was granted without readable authoritative provenance; superseded evidence still bound a current PASS; intent-inappropriate reasoning defeated a required outcome; or visible ceremony/irrelevant revalidation violated the fixture.

`BLOCKED` means a required source or observation is unavailable. `REVIEW_REQUIRED` means a pattern/regex/heuristic found a possible issue but the semantic violation is not established. Heuristics never produce `FAIL` or `PASS` alone.

H0 is independent of the candidate's Task Contract. The contract is evidence under review, not authority to justify its own compilation.

## H1 — professional judgment

H1 judges semantic completeness, efficiency, result inspectability, and task-appropriate quality. It may downgrade an H0 PASS, but it cannot override H0 FAIL/BLOCKED into acceptance. It reports the smallest decisive finding and the observation that would overturn it.

For user experience, prefer decision density and inspectability over workflow visibility: lead with the conclusion, preserve decisive evidence and material uncertainty, and expose internal ceremony only when the user must decide or audit it.

## Calibration anchors

- If a candidate claims it created a missing requested target while M0 shows the referent never existed and no valid substitute was authorized, H0 is `FAIL`.
- If a regex sees “state machine” in a discussion, but source wording and behavior do not establish a Fixed-mechanism violation, the result is `REVIEW_REQUIRED`, not `FAIL`.
- If authoritative provenance is unreadable, contract-relative review may proceed, but formal goal fidelity is `BLOCKED`/`NOT_RUN`.

The executable calibration validates these anchors and fixture completeness; it does not grade model behavior or prove product benefit.
