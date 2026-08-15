# User Profile Carrier v1 Fixture

This file is a deterministic opted-in user-carrier fixture. It is never installed as a real user profile.

## Active Defaults

### route-review-accept

- id: route-review-accept
- lane: route_alias
- value: Map the confirmed review phrase to acceptance.
- scope: user
- applies_when: the phrase is used as a task operation
- source: explicit_confirmation
- confirmation_ref: task:confirm-route-review
- trigger_phrase: 帮我过一遍
- route_id: accept
- status: active
- last_fired: never
