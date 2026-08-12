---
name: aql-accept
description: >-
  Explicit accept route: independent acceptance review in a fresh acceptor context. Read-only; no repair.
license: MIT
disable-model-invocation: true
metadata:
  author: MQZZang
  version: "2.6.0"
---
# AQL Accept

## Route Axes

- `intent`: `accept`
- `mode`: `accept`
- `action_authority`: `read`

## Permissions

- Do not repair, edit, or rewrite artifacts under review.
- Require a fresh acceptor context; do not reuse the implementer's narrative as proof.

## Independence



This route **requires** independent acceptance — it does not claim the current context is already independent.



- If the host can spawn a fresh subagent or fork, use it for the review.

- Otherwise emit an actionable handoff for a distinct acceptor; do not self-approve.

- Same context or unprovable separation → `verdict: PENDING` or `NOT_RUN`; keep the prior legal phase; **never** `ACCEPTED`.

- Renaming the role (`different_role` text alone) is not fresh-context evidence.

- `/aql-accept` (or `$aql-accept`) does not by itself create independence on every host.

## Handoff

Return review findings and a conservative verdict. Do not edit artifacts; hand back to agent-quality-loop if repair is requested.

## Contract

Follow the `agent-quality-loop` task contract, mode router, and evidence rules in its SKILL.md and `references/contracts.md`. This route is explicit-only packaging; it does not restate lifecycle phases or duplicate parent summaries.
