---
name: aql-resume
description: >-
  Explicit resume route: reconstruction-first continuation from artifacts. Initial authority is read; do not inherit prior external or release authority.
license: MIT
disable-model-invocation: true
metadata:
  author: MQZZang
  version: "2.8.0"
---
# AQL Resume

## Route Axes

- `intent`: `resume`
- `reconstruction`: `first`
- `initial_action_authority`: `read`

## Permissions

- Do not inherit prior external, destructive, or release authority from an earlier session.

## Handoff

Reconstruct goal, scope, and evidence from artifacts, then propose the next safe step. Re-derive authority before any write or external act.

## Contract

Follow the `agent-quality-loop` task contract, mode router, and evidence rules in its SKILL.md and `references/contracts.md`. This route is explicit-only packaging; it does not restate lifecycle phases or duplicate parent summaries.
