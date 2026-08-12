---
name: aql-diagnose
description: >-
  Explicit diagnose route: evidence-first read-only investigation with an EVIDENCED terminal ceiling. No local implementation writes.
license: MIT
metadata:
  author: MQZZang
  version: "2.6.0"
---
# AQL Diagnose

## Route Axes

- `intent`: `diagnose`
- `mode`: `evidence`
- `action_authority`: `read`
- `terminal_ceiling`: `EVIDENCED`

## Permissions

- Do not perform local implementation writes.

## Handoff

Return evidence-backed findings only. Hand off to agent-quality-loop for implement, accept, or release when the user asks.

## Contract

Follow the `agent-quality-loop` task contract, mode router, and evidence rules in its SKILL.md and `references/contracts.md`. This route is explicit-only packaging; it does not restate lifecycle phases or duplicate parent summaries.
