---
name: aql-release-check
description: >-
  Explicit release preflight route: readiness check only. Read-only; no release act.
license: MIT
metadata:
  author: MQZZang
  version: "2.7.0"
---
# AQL Release Check

## Route Axes

- `intent`: `release`
- `mode`: `release`
- `release_intent`: `preflight`
- `action_authority`: `read`

## Permissions

- Do not publish, deploy, upload, or otherwise perform a release act.

## Handoff

Return release-readiness findings only. Any publish, deploy, or external release act requires explicit user authority via agent-quality-loop.

## Contract

Follow the `agent-quality-loop` task contract, mode router, and evidence rules in its SKILL.md and `references/contracts.md`. This route is explicit-only packaging; it does not restate lifecycle phases or duplicate parent summaries.
