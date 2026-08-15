# Profile Projection v1

Experimental compile rules for applying existing collaboration-profile entries to one task. This is a task-local projection into the existing Task Contract, not a persistent User Lens, a second contract, a scoring system, or a new lifecycle phase.

## Invariants

1. The Task Contract remains the only task truth source.
2. `.ai/knowledge/collaboration-profile.md` remains the only project collaboration-preference carrier. A user-level carrier is read only after explicit opt-in.
3. The projection exists only while compiling the current task. Do not persist it as `profile_projection`, `user_lens`, `profile_mode`, or a separate file.
4. Current-turn explicit instructions override profile defaults before candidate selection.
5. Project facts, repository rules, authority, evidence floors, acceptance obligations, and release boundaries are Fixed inputs outside the preference precedence chain.
6. Selected profile entries are Guided defaults. The AI's professional methods, tools, structure, and solution strategy remain Open unless fixed elsewhere.
7. A profile entry cannot raise `action_authority`, lower `assurance` or evidence/acceptance floors, prove PASS, or authorize release.
8. At most two profile entries may affect one task. Zero is a valid projection.

## Entry Contract

Every entry eligible for automatic task projection has these fields:

```yaml
id: stable unique id inside this profile
lane: phrase_lexicon | communication | collaboration_habit | writing_preference | growth_focus | rejected_option | route_alias
value: confirmed or candidate collaboration default
scope: project | domain:<name> | task_class:<name> | user
applies_when: concrete condition a human and an agent can evaluate
source: explicit_statement | explicit_confirmation | repeated_correction | repeated_choice
status: candidate | active | archived
last_fired: YYYY-MM-DD | never
```

`id` is a stable human-maintained slug. Rewording `value` does not silently create a new id. `applies_when` must be concrete; placeholders such as `appropriate`, `when relevant`, `适用时`, `TBD`, and `<specific condition>` are incomplete. Dates are real UTC calendar dates, not regex-shaped strings.

Conditional structured fields are:

- `conflict_key` when entries can express competing values for one preference;
- `confirmation_ref` for active explicit-confirm-only entries; it is a stable non-secret task/evidence ref, not a raw prompt;
- `writing_posture: deliver | co-create | coach` when a writing preference controls collaboration posture;
- `trigger_phrase` and `route_id: diagnose | accept | release-check | resume` for a route alias;
- `source_ref` and `observed_at` for a To Confirm candidate.

An active route alias, rejected option, Growth Focus, or writing posture requires both `source: explicit_confirmation` and `confirmation_ref`. A model/caller assertion such as `explicitly_confirmed: true` has no standing. Do not store raw prompts, secrets, third-party personal data, inferred identity, personality diagnoses, or hidden capability scores.

The compact profile template maps user-facing examples to lanes as follows:

| Preference type | Lane |
|---|---|
| Language, density, result order, reusable good/bad guidance | `communication` |
| Question threshold, risk, quality, and decision habits | `collaboration_habit` |
| Audience, medium, source strictness, structured posture | `writing_preference` |
| Transferable practice intention | `growth_focus` |
| Operational phrase meaning | `phrase_lexicon` |
| Stable project-scoped rejection | `rejected_option` |
| Confirmed phrase to existing route id | `route_alias` |

Good/bad response examples may justify a plain-language candidate, but the profile stores the reusable default rather than a raw conversation excerpt.

## Inputs

Projection may read only:

- the current user request and current ALIGN/Task Contract context;
- the current project/domain/task class established from readable task evidence;
- the project collaboration profile, when present;
- a user-level collaboration profile only after explicit opt-in for this host/session.

Do not use third-party descriptions, model-authored user summaries, complete chat history as a hidden profile, or ungrounded repository prose that says what the user likes.

When an opted-in user carrier actually participates, record `{kind: user_profile_opt_in, enabled: true, scope: current_session, source_ref: <safe current-turn ref>}` in the existing Task Contract `assumptions`; do not create a persistent opt-in field or infer consent merely because the path exists. Production projection validation and full-envelope validation both require that structured assumption; source binding additionally requires the runtime opt-in gate and canonical-suffix user carrier path.

## Fresh Mode

Treat natural-language equivalents such as “这次忽略我的历史偏好”, “这次从零分析”, “不要按画像处理本次任务”, and “Fresh mode for this task” as a current-task Fresh Mode request.

Fresh Mode:

- skips project-level and opted-in user-level collaboration-profile entries, including profile phrase and route aliases;
- does not update profile `last_fired` and does not turn the temporary choice into a profile candidate;
- does not ignore the current request, project facts, `AGENTS.md`/rules, project context, technical lessons, authority, evidence, acceptance, or release boundaries;
- does not delete or rewrite any profile and creates no persistent mode state.

When a full envelope is otherwise justified, record measurement with no `kind: profile` entries in `injected_refs` and add one existing `assumptions` sentence: `Current task requested Fresh Mode; stored collaboration-profile defaults were not applied.` Do not emit a full envelope merely to disclose Fresh Mode.

## Candidate Filter

Unless Fresh Mode is active, an entry is selectable only when every condition holds:

```text
status == active
source is one of the declared source values
all Entry Contract fields are present
scope matches the current task
applies_when is concrete and matches
the current turn did not override it
the authority firewall permits it
the entry is not stale or archived
the match is operational, not a quoted title or unrelated mention
user scope was explicitly enabled for this host/session
```

`route_alias`, `rejected_option`, writing posture, and `growth_focus` additionally require structural explicit-confirmation provenance. `phrase_lexicon` retains the narrow second-hit rule in [personalization.md](personalization.md). Do not weaken the filter to fill the two-entry budget.

Legacy entries missing `id`, `lane`, `scope`, `applies_when`, `source`, `status`, or `last_fired` remain human-readable but are not automatically projected. Preserve them until the user confirms or a field-level edit normalizes them; never delete or wholesale-rewrite them during migration.

## Selection Order

After semantic matching and current-turn override removal, prefer:

1. exact `task_class:<name>` scope;
2. exact `domain:<name>` scope;
3. exact `project` scope;
4. matching opted-in `user` scope;
5. `explicit_confirmation`;
6. `explicit_statement`;
7. `repeated_correction` or `repeated_choice`;
8. the more specific declared `applies_when` receipt.

Group competing entries by `conflict_key`. First compare scope and source strength. If the best scope/source tier contains different values or effects, mark a conflict and skip them regardless of caller-declared `specificity`; ask only when that unresolved default changes the task outcome. Specificity and stable code-point `id` order may order equivalent same-effect records and emitted refs only. They must never decide between different user preferences. Select the first two remaining candidates; priority enforcement is not optional.

The current-turn instruction is not a ranking input: it removes conflicting entries before ranking. Semantic scope and condition matching remain agent judgment grounded in the current task; do not replace them with keyword scores or claim mathematical user understanding.

## Contract Effects

Selected entries may affect only existing contract surfaces:

- ordinary communication, collaboration, writing, quality-bar, risk, decision, and Growth Focus defaults become source-backed Guided `assumptions` or affect the existing User Result Summary expression;
- a confirmed phrase lexicon entry interprets the user's phrase in its recorded operational sense;
- a confirmed route alias selects only an existing route and cannot change authority or the assurance floor;
- a confirmed, scope-matching rejected option may become a default `non_goals` item for this task, but the current turn may override it without immediately rewriting the profile.

Never convert a normal profile entry into `action_authority`, `evidence_authority`, required acceptance truth, release authorization, or fixed implementation steps. A Guided preference may be professionally overridden when stronger task evidence requires it; disclose the reason when the deviation materially affects the result.

## Source Tracking

Every selected entry that actually changes the contract or result expression gets one existing `injected_refs` record:

```yaml
- kind: profile
  class: learned
  ref: .ai/knowledge/collaboration-profile.md#<entry-id>
  content_sha256: <sha256 of the canonical single-entry Markdown block from the readable carrier>
  reason: <one line naming the matched scope/condition and the Guided default affected>
```

The canonical block begins at `### <entry-id>` and ends before the next `###`, `##`, or EOF. Decode UTF-8, normalize CRLF/CR to LF, strip blank lines only from block edges, preserve internal whitespace/field order, and append exactly one LF. Hash the block opened by the validator from the canonical project path under `baseDir`, or from an explicit opted-in user carrier path with the same `.ai/knowledge/collaboration-profile.md` suffix. Raw caller-supplied Markdown or `entry_content` is never source-binding input. When a measured selection lacks its carrier, source binding is `NOT_RUN` and machine validation fails closed; it is not a projection PASS.

For an opted-in user-level profile, use `~/.ai/knowledge/collaboration-profile.md#<entry-id>` rather than an absolute home path in shared statistics or reports. The existing envelope budget permits at most two profile refs. Do not merge several entries behind one ref.

Reasons such as `Relevant`, `Applied profile`, or `User prefers this` are invalid because they do not explain the match or effect. An entry that did not affect the contract is not injected and did not fire.

Update `last_fired` only when the entry affected the contract and profile field-level write authority is available. The receipt carries `{id, new_date}` with a real date no later than the task `as_of`. Read-only work, Fresh Mode, skipped entries, and current-turn overrides do not update it.

## Explicit Feedback Candidates

Only high-confidence feedback may produce a profile candidate:

- an explicit long-term collaboration statement;
- an explicit correction of how the agent should collaborate across tasks;
- an explicit long-term change to an applied profile entry;
- explicit confirmation of a phrase, route alias, rejected option, writing posture, or Growth Focus.

Silence, result acceptance, a one-task format request, Fresh Mode, a good model output, or an unreviewed profile hit do not produce candidates. Use the existing `harvest_candidates` structure and point `source_ref` at the current task and, when applicable, the original entry id. Do not add outcome scores or automatically rewrite an active entry in the same turn.

## User Surface

Ordinary tasks do not display `User Lens`, `Profile Projection`, a full Collaboration Brief, profile scores, full `injected_refs`, or the full Task Contract. Profile application must not add questions to a clear task.

When the user asks what was applied or why, answer from the recorded `injected_refs` and the referenced entry. Do not invent a retrospective rationale. Collaboration Brief / Dispatch Brief remains a transient executor view of the same Task Contract and has no id, phase, persistence, or authority of its own.

## Mechanical Validation Boundary

The bundled fixture validator checks declared projection-receipt shape for metadata completeness, real dates, placeholder lint, structural confirmation provenance, deterministic priority/conflict handling, budgets, authority/evidence preservation, Fresh Mode, and low-noise output. Production `validateProjection()` does not use that fixture exception: any measured selected profile ref must bind through a canonical carrier path or fail with source binding `NOT_RUN`. Neither validator decides whether a concrete natural-language scope or `applies_when` condition truly matches. Fresh-context behavior probes own that evidence.

Stop rather than expand the design when progress would require a persistent User Lens, a second contract, a profile database/event ledger/ranker/embedding, a keyword-score selector presented as semantic understanding, wholesale profile migration, or a lowered trust boundary.
