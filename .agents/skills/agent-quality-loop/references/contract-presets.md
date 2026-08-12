# Contract Presets

Presets are prefilled Task Contract snippets (data, not new modes). Use them to keep ALIGN latency near zero on routine tasks by starting from a known-good field set instead of inventing one from scratch.

Copy a preset, replace every `<placeholder>`, then run the usual ALIGN check for gaps that still change outcome or authority.

## Micro-fix (typo / one-liner)

```yaml
schema_version: agent-quality-loop/v2
intent: implement
assurance: fast
mode: execute
phase: RAW
change_class: display_only
action_authority: local_write
scope_allowlist:
  - <allowed file or surface>
non_goals:
  - <surfaces that must not change>
success_observables:
  - <who / on what medium / sees what after the fix>
counterexamples:
  - <decidable case that would disprove success>
```

Use for typo, label, or one-line presentation fixes. Prefer `change_class: display_only`; use `content` only when user-facing information (not mere presentation) changes. Keep `assurance: fast` and do not invent formal acceptance.

## Standard bug fix

```yaml
schema_version: agent-quality-loop/v2
intent: implement
assurance: standard
mode: execute
phase: RAW
change_class: algorithm
action_authority: local_write
scope_allowlist:
  - <allowed file or surface>
non_goals:
  - <surfaces that must not change>
success_observables:
  - <who / on what medium / sees what after the fix>
counterexamples:
  - <decidable case that would disprove success>
```

Use for ordinary local defect repair with behavior change. Keep `mode: execute` when the stop is self-QA `BUILT`; switch to `mode: full` only when the request also asks for independent acceptance (still at most `local_write`, never publish).

## Document / content edit

```yaml
schema_version: agent-quality-loop/v2
intent: implement
assurance: standard
mode: execute
phase: RAW
change_class: content
action_authority: local_write
scope_allowlist:
  - <allowed doc or content surface>
non_goals:
  - <unrelated docs, UI, or behavior to preserve>
success_observables:
  - <reader / on what medium / sees what after the edit>
counterexamples:
  - <decidable reader-visible miss that would disprove success>
```

Use for docs, copy, or other user-facing information edits with no code-behavior change. Keep `change_class: content` and compile observables from the reader/consumer perspective.

## Read-only investigation

```yaml
schema_version: agent-quality-loop/v2
intent: diagnose
assurance: standard
mode: evidence
phase: EVIDENCED
change_class: algorithm
action_authority: read
scope_allowlist:
  - <surfaces allowed to inspect>
non_goals:
  - <any write, repair, or deploy>
success_observables:
  - <who / on what medium / can decide what from the evidence>
counterexamples:
  - <decidable gap that would leave the diagnosis unusable>
next_allowed_phase: null
```

Use when the request is diagnosis or evidence only. Set `change_class` to the narrowest class of the subject under investigation (`algorithm` shown for a typical bug diagnosis). Terminal stop is `phase: EVIDENCED` with `next_allowed_phase: null` (`stop_reason: evidence_only_complete` when emitting a full envelope). Never raise `action_authority` above `read`.
