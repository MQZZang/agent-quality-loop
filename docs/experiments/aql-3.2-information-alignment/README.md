# AQL 3.2 information-alignment screening

Status: retained candidate selected; forced-load screening and independent agent review complete. This is a small iteration-specific protocol, not a new evaluation platform.

## Question

Does one minimal semantic patch improve preservation of objects, relations, negative scope, action authority, and correction dependencies without adding unnecessary questions, mandatory multi-agent fanout, or output ceremony?

## Arms

- A: exact local baseline at `a10c4dd0810b4981521ab04890c48123b33da36b`, with the baseline canonical Skill digest recorded in the execution report.
- B: one final unreleased candidate derived from that baseline; record its diff digest and portable Skill digest after mirror synchronization.

Both arms use the same host, model, reasoning budget, 16 synthetic cases, output schema, and forced-load procedure in fresh contexts. Executors may read only the assigned Skill bytes and `behavior-inputs.json`; they must not read `adjudication-rubric.json`, implementation notes, the other arm, or earlier results. The rubric is applied after both raw outputs exist. Cases `ia-15` and `ia-16` were held out for the first candidate. Round-1 adjudication exposed three shared failures and the candidate was revised once, so those cases are no longer held out for the final candidate; they remain ordinary regression cases and no final blind/held-out claim is allowed.

The inputs model semantic behavior with JSON-like synthetic evidence. They do not validate Excel fidelity, WorkBuddy behavior, natural Skill discovery, or general product benefit. Structural validation and repository checks remain separate evidence lanes.

## Result

The retained candidate is the smallest source-consistency patch. Baseline A and retained B each received 13 PASS, 0 FAIL, and 3 NOT_DECIDABLE judgments with no hard-boundary violation, so the measured outcome is parity and no behavior uplift is claimed. A broader second candidate improved the Open-mechanism case but regressed the core chat-table relation case; it was rejected. The two initially held-out cases lost held-out status after round-1 results informed that rejected iteration, so final reporting treats them only as ordinary regressions.

Raw records are under `results/`: `arm-a-raw.json`, `arm-b-raw.json`, `adjudication-final.json`, plus the preserved intermediate/rejected records. Exact hashes and artifact identity are recorded in `iteration-report.md`.
