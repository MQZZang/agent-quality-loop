# Collaboration Profile Template

Copy this file to `collaboration-profile.md` in a project that uses this workflow pack, or to the documented user-level path only after explicit opt-in. Populate it incrementally; do not turn first use into a questionnaire.

**What this is:** stable, user-controlled collaboration defaults. It is separate from:

- `project-context.md` — project facts, stack, commands, and architecture;
- `lessons.md` — verified technical lessons;
- the Task Contract — the current task's only goal, authority, evidence, and lifecycle truth source.

The current-turn instruction always wins. Matching complete `active` entries may be selected as Guided defaults; candidates, archived entries, and incomplete legacy entries are not automatically applied. The profile is never authority, task evidence, acceptance evidence, release permission, identity diagnosis, or proof of growth.

## Entry Format

Every entry eligible for automatic task projection uses this exact field set:

```markdown
### <stable-entry-id>

- id: <stable-entry-id>
- lane: phrase_lexicon | communication | collaboration_habit | writing_preference | growth_focus | rejected_option | route_alias
- value: <concrete collaboration default>
- scope: project | domain:<name> | task_class:<name> | user
- applies_when: <specific condition a human and an agent can evaluate>
- source: explicit_statement | explicit_confirmation | repeated_correction | repeated_choice
- status: candidate | active | archived
- last_fired: YYYY-MM-DD | never
```

Use the same stable human-maintained slug for the heading and explicit `id` field. Rewording `value` does not silently create a new id. A project entry ref is:

```text
.ai/knowledge/collaboration-profile.md#<stable-entry-id>
```

An opted-in user-level ref uses `~/.ai/knowledge/collaboration-profile.md#<stable-entry-id>` in shared output, never an absolute home path. When an entry actually affects a task, `injected_refs.content_sha256` binds the exact single-entry Markdown block with CRLF normalized to LF.

Do not store raw full prompts, secrets, third-party personal data, inferred identity/personality, hidden capability scores, profile scores, or standing release authority.

---

## Communication

Use lane `communication` for language, density, response structure, and reusable good/bad-response guidance. Store the reusable default, not a raw conversation excerpt.

### comm-conclusion-language

- id: comm-conclusion-language
- lane: communication
- value: <e.g. write decision conclusions in Chinese>
- scope: user
- applies_when: <e.g. the task result is presented directly to this user>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Question Threshold

Use lane `collaboration_habit`.

### habit-material-questions-only

- id: habit-material-questions-only
- lane: collaboration_habit
- value: <e.g. resolve discoverable doubts first; ask only when the answer changes the outcome>
- scope: user
- applies_when: <e.g. an ambiguous task still has an outcome-changing choice after inspection>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Risk Tolerance

Use lane `collaboration_habit`. This is a Guided collaboration preference and cannot lower project safety, authority, evidence, or acceptance floors.

### habit-reversible-work-speed

- id: habit-reversible-work-speed
- lane: collaboration_habit
- value: <e.g. proceed on reversible local changes without ritual confirmation>
- scope: user
- applies_when: <e.g. local low-stakes changes with no production/data/security effect>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Quality Bar

Use lane `collaboration_habit`.

### habit-root-cause-quality

- id: habit-root-cause-quality
- lane: collaboration_habit
- value: <e.g. prefer root-cause changes and evidence-bound completion claims>
- scope: user
- applies_when: <e.g. non-trivial diagnosis, implementation, or review>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Decision Habits

Use lane `collaboration_habit`. Do not turn a preference such as “fewer dependencies” into a Fixed implementation rule; stronger task evidence may justify a different Open solution.

### habit-dependency-tradeoff

- id: habit-dependency-tradeoff
- lane: collaboration_habit
- value: <e.g. prefer fewer dependencies when quality and safety are otherwise equivalent>
- scope: user
- applies_when: <e.g. comparing technically viable implementation options>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Good vs Bad Responses

Use `communication` or `collaboration_habit`. Summarize the reusable reason; do not preserve the original prompt/response.

### comm-decision-first

- id: comm-decision-first
- lane: communication
- value: <e.g. lead with the decision, then show only evidence that can change it>
- scope: user
- applies_when: <e.g. architecture, product, or review decisions>
- source: repeated_correction
- status: candidate
- last_fired: never

## Writing Collaboration Preferences

Use lane `writing_preference`. Keep audience, medium, source strictness, feedback density, or explicitly confirmed posture narrow and context-qualified. Structure and voice remain Open unless the current task fixes them. `coach` is never inferred from repetition.

### writing-executive-source-strictness

- id: writing-executive-source-strictness
- lane: writing_preference
- value: <e.g. material factual claims must trace to the supplied research packet>
- scope: task_class:executive_brief
- applies_when: <e.g. drafting factual executive briefs from a bounded source packet>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Growth Focus

Use lane `growth_focus`. It requires explicit confirmation and names a transferable capability plus observable behavior, bounded support/posture, and review/expiry in `value`/`applies_when`. It is a practice intention, not evidence of improvement. Longitudinal outcome remains `NOT_RUN` until readable repeated-task evidence exists.

### growth-claim-traceability

- id: growth-claim-traceability
- lane: growth_focus
- value: <e.g. practice making causal claims traceable; agent support is bounded feedback after a complete draft>
- scope: task_class:technical_brief
- applies_when: <e.g. user explicitly chooses this practice focus for technical briefs; review by YYYY-MM-DD>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Phrase Lexicon

Use lane `phrase_lexicon`. The entry fires only in its recorded operational sense; quoted titles and unrelated mentions are mismatches. Promotion requires explicit confirmation or the allowed second-hit rule in the personalization protocol.

### phrase-independent-accept

- id: phrase-independent-accept
- lane: phrase_lexicon
- value: <e.g. “验收” means independent read-only acceptance>
- scope: user
- applies_when: <e.g. the phrase is used as an operation, not inside a title or quotation>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Rejected Options

Use lane `rejected_option`. Entries are project-scoped, explicit-confirm-only defaults. A single-task rejection stays in that task's `non_goals`. Never store standing push/release authority here.

### reject-project-cache-redis

- id: reject-project-cache-redis
- lane: rejected_option
- value: <e.g. do not re-propose Redis as this project's local cache>
- scope: project
- applies_when: <e.g. selecting the local cache architecture for this project>
- source: explicit_confirmation
- status: candidate
- last_fired: never

## Route Aliases

Use lane `route_alias`. The value maps a confirmed phrase only to `diagnose`, `accept`, `release-check`, or `resume`. It creates no physical skill and cannot raise authority or lower assurance/evidence floors.

### route-review-accept

- id: route-review-accept
- lane: route_alias
- value: <e.g. “帮我过一遍” maps to `accept`>
- scope: user
- applies_when: <e.g. the phrase is used as a task operation, not in a title or quotation>
- source: explicit_confirmation
- status: candidate
- last_fired: never

---

## To Confirm

Candidates awaiting promotion. Rejected options, route aliases, writing posture, and Growth Focus require explicit confirmation. Other low-risk lanes may use explicit confirmation or the permitted second independent signal. Never apply a candidate in its creation turn.

### candidate-<stable-id>

- id: candidate-<stable-id>
- lane: <allowed lane>
- value: <proposed reusable default>
- scope: project | domain:<name> | task_class:<name> | user
- applies_when: <specific condition>
- source: explicit_statement | explicit_confirmation | repeated_correction | repeated_choice
- source_ref: <task/envelope/evidence reference; no raw prompt>
- observed_at: YYYY-MM-DD
- status: candidate
- last_fired: never

## Legacy Compatibility

Keep old free-form or table entries readable. Missing `id`, `lane`, `value`, `scope`, `applies_when`, `source`, `status`, or `last_fired` means the entry is not automatically projected. Normalize only through explicit confirmation or the next authorized field-level edit. Never wholesale-rewrite a real user profile, delete legacy content because fields are missing, or silently migrate project entries to user-level.
