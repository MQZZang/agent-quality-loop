# Profile Projection v2

Profile Projection v2 is an optional, task-local compile step. It reads the explicit-only user profile at `$AQL_HOME/profile.json` and places no more than two applicable entries in the existing Task Contract's **Guided** portion. It is not a lifecycle phase, User Lens, second Brief, ranking service, or authority source.

## Availability And Boundaries

- AQL Core works normally when the profile is absent, unreadable, disabled, paused, the CLI is unavailable, or the host cannot access a user directory. Do not fabricate profile access. Report the access problem only for an explicit profile-management request.
- A profile entry can guide presentation, collaboration, semantic aliases, or working context. It never grants authority, changes scope, lowers evidence or acceptance requirements, authorizes release, or substitutes for project rules and task evidence.
- The current-turn instruction wins. Fresh Mode skips all stored profile entries for this task. Both conditions produce no profile write.
- Only complete `active` entries with schema-valid explicit provenance may project. Choose at most two. Suppress an entry when its applicability is unknown, it conflicts with an equally applicable entry, it is review-due, incomplete, superseded, archived, or contradicted by the current task.
- Record only entries that materially changed Guided in the existing Task Contract `injected_refs`. Do not create a projection receipt as another truth source, and do not expose projection internals in ordinary output.

## Fresh Mode

Fresh Mode is a current-task instruction to skip stored profile entries. It never suppresses current instructions, repository rules, project facts, lessons, authority, evidence, acceptance, or release boundaries, and it does not persist a mode or write profile data.

## Selection

1. Start from the current request and frozen Task Contract.
2. Remove entries overridden by the current turn or Fresh Mode.
3. Retain only complete active entries with a clear, applicable scope.
4. Suppress conflicting peers rather than using an implicit score or stable ID tie-breaker.
5. Select the smallest relevant set, capped at two, and compile it into Guided only.

When applicability cannot be decided from the entry and task, suppress it. A profile is a default, not a question generator for an otherwise clear task.

## CLI Projection Context

`profile project --context FILE` consumes a task-local JSON observation compiled by
the calling agent or integration. It is not stored profile data, a second Task
Contract, or user authority. The closed root requires `as_of`, `scopes`, and
`semantic`; optional fields are `fresh_mode`, `current_turn_overrides`,
`policy_conflicts`, and `deviations`.

For a global entry whose id is `concise`, a minimal eligible context is:

```json
{
  "as_of": "2026-08-18",
  "scopes": [{ "level": "global" }],
  "semantic": {
    "concise": {
      "applies_when_matches": true,
      "suppress_when_matches": false,
      "material_effect": true,
      "reason": "The current result needs the saved concise presentation default.",
      "effect": "Use concise result presentation in Guided choices."
    }
  }
}
```

Replace `as_of` with the actual task date and include only observations supported by
the current task. Unknown applicability, suppression, or material effect must remain
absent/false so projection fails closed. For non-global scope, add the exact
`{ "level": "project|domain|task_class", "id": "..." }` item to `scopes`.

## Capability Receipt

Capability Receipt is temporary mechanical evidence about a host capability, not profile data and not Task Contract state. Each capability observation has a source from an installer fact, host-provided version/feature, explicit configuration, local probe, or actual call result. A model assertion or host-name guess is not evidence. Unknown or unrun capability is `NOT_RUN`, never support by implication.

Regenerate the receipt when host identity, version, or relevant configuration changes. Disclose it only when a missing capability changes the task outcome. It may support a routing decision but cannot grant authority, acceptance, or lifecycle advancement.

## Portability And Project Identity

The profile JSON is portable between Agents that can read the same local store. This means same-machine sharing through an accessible `$AQL_HOME`, not automatic cross-device, cloud, container, or remote-host synchronization. Cross-device transfer is explicit export/import; default behavior performs no upload or background service.

Create `.aql/project.json` only after the user confirms saving a project-scoped personal preference. It contains only its schema and opaque project identity. It contains no profile content, user identity, path, remote URL, credential, permission, or tool configuration. Without that confirmed save, do not create it.
