# Collaboration Profile Template

Copy this file to `.ai/knowledge/collaboration-profile.md` for a project. Use the documented user-level path only after explicit opt-in for that host/session. Add entries incrementally; first use is not a questionnaire.

This file stores user-controlled collaboration defaults. It is not project facts, technical lessons, the current Task Contract, authority, evidence, acceptance, release permission, identity diagnosis, or proof of growth. The current-turn instruction always wins.

## Entry Contract

Every entry eligible for automatic projection has these eight fields:

```markdown
### <stable-entry-id>

- id: <stable-entry-id>
- lane: phrase_lexicon | communication | collaboration_habit | writing_preference | growth_focus | rejected_option | route_alias
- value: <concrete reusable default>
- scope: project | domain:<name> | task_class:<name> | user
- applies_when: <specific condition a human and an agent can evaluate>
- source: explicit_statement | explicit_confirmation | repeated_correction | repeated_choice
- status: candidate | active | archived
- last_fired: YYYY-MM-DD | never
```

The heading and explicit `id` must match and be unique. `applies_when` cannot be a placeholder such as `appropriate`, `when relevant`, `适用时`, `TBD`, or `<specific condition>`. Dates must be real UTC calendar dates.

Use these conditional fields only where they apply:

| Field | Required for |
|---|---|
| `conflict_key` | Entries that can express competing values for the same preference |
| `confirmation_ref` | An active route alias, rejected option, Growth Focus, or writing posture; use a stable non-secret task/evidence ref, never a raw prompt |
| `writing_posture` | A writing posture, exactly `deliver`, `co-create`, or `coach` |
| `trigger_phrase` + `route_id` | A route alias; `route_id` is exactly `diagnose`, `accept`, `release-check`, or `resume` |
| `source_ref` + `observed_at` | A To Confirm candidate; `observed_at` is `YYYY-MM-DD` |

An active confirmation-only entry must use `source: explicit_confirmation` and a safe `confirmation_ref`. A caller/model boolean cannot substitute for that provenance. `coach` is never inferred from repetition.

## Canonical Entry Bytes

The content-bound block begins at `### <stable-entry-id>` and ends immediately before the next `###`, `##`, or EOF. Canonicalization is:

1. decode as UTF-8;
2. normalize CRLF/CR to LF;
3. remove blank lines only from the block edges;
4. preserve internal whitespace and field order;
5. end with exactly one LF.

`injected_refs.content_sha256` hashes those canonical bytes, not caller-supplied `entry_content` and not the whole profile. Validate a real carrier with:

```text
node .cursor/skills/agent-quality-loop/scripts/validate-profile.js --project-profile .ai/knowledge/collaboration-profile.md
```

A project ref is `.ai/knowledge/collaboration-profile.md#<stable-entry-id>`. Shared output for an explicitly enabled user profile uses `~/.ai/knowledge/collaboration-profile.md#<stable-entry-id>`, never an absolute home path.

## Lane Reference

| Lane | Stores | Promotion boundary |
|---|---|---|
| `communication` | language, density, result order | explicit signal or permitted repeated low-risk signal |
| `collaboration_habit` | question threshold, quality/risk/decision habits | explicit signal or permitted repeated low-risk signal |
| `writing_preference` | audience, medium, source strictness; optional structured posture | posture requires explicit confirmation |
| `growth_focus` | bounded practice intention and review point | explicit confirmation only; never proof of growth |
| `phrase_lexicon` | operational meaning of a phrase | explicit confirmation or the protocol's permitted second hit |
| `rejected_option` | project-scoped option not to re-propose | explicit confirmation only |
| `route_alias` | confirmed phrase to one existing route id | explicit confirmation only; never authority |

## Active Defaults

Only complete `status: active` entries may be projected. At most two may affect one task.

### comm-decision-first

- id: comm-decision-first
- lane: communication
- value: Put the decision before supporting detail.
- scope: project
- applies_when: presenting an architecture or product decision in this project
- source: explicit_confirmation
- status: active
- last_fired: never
- conflict_key: result_order

## To Confirm

Candidates are visible but never auto-applied or promoted in their creation turn.

### candidate-writing-posture

- id: candidate-writing-posture
- lane: writing_preference
- value: Collaborate through bounded coaching after a complete user draft.
- scope: task_class:technical_brief
- applies_when: revising a technical brief after the user supplies a complete draft
- source: explicit_statement
- status: candidate
- last_fired: never
- writing_posture: coach
- source_ref: task:example-observation
- observed_at: 2026-08-15

## Archived

Archived entries remain readable for manual review and revival but are not projected. Age or mismatch may propose review; without measured injection history or explicit user confirmation, it does not silently archive an entry.

## Lane Examples

These are values, not a second data source:

- `phrase_lexicon`: `验收` means independent read-only acceptance when used as an operation.
- `rejected_option`: do not re-propose Redis as this project's local cache.
- `route_alias`: `trigger_phrase: 帮我过一遍`, `route_id: accept`.
- `growth_focus`: practice traceable causal claims with bounded feedback and an explicit review date.

## Legacy Compatibility

Old free-form/table content remains readable. A block missing any of the eight required fields is legacy/incomplete and not automatically projected. Normalize only through explicit confirmation or an authorized field-level edit. Never wholesale-rewrite a real profile, silently migrate project entries to user scope, or delete negative/history evidence.

Do not store raw prompts, secrets, third-party personal data, inferred identity/personality, hidden capability scores, outcome scores, standing push/release authority, or evidence-lowering preferences.
