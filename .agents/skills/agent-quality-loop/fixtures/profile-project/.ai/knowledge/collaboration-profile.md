# Profile Carrier v1 Fixture

This file is a deterministic project-carrier fixture. It is not a user profile and is never installed as one.

## Active Defaults

### project-architecture-detail

- id: project-architecture-detail
- lane: communication
- value: Use a full root-cause comparison for architecture decisions.
- scope: project
- applies_when: the task is an architecture decision in this project
- source: explicit_confirmation
- status: active
- last_fired: never

### project-architecture-concise

- id: project-architecture-concise
- lane: communication
- value: Give the architecture decision in one concise paragraph.
- scope: project
- applies_when: the task is a routine architecture status update in this project
- source: explicit_confirmation
- status: active
- last_fired: never
