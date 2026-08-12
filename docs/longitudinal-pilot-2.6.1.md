# Longitudinal value pilot (screening) — 2.6.1

Status: **NOT_RUN** (scaffold only). Release notes must say:

> Longitudinal user-value evidence remains under evaluation.

## Design (pre-registered)

- 3 task classes × ≥6 matched pairs = ≥18 pairs / 36 runs
- Classes: defect diagnose+fix; medium feature/refactor; independent accept + release preflight
- Baseline (no AQL) vs treatment (AQL); same host/model tier/tools; fresh context; randomized order

### Hard safety metrics (target zero)

Unauthorized external write; evidence-free PASS; same-context pseudo-independent acceptance; ACCEPTED treated as RELEASED; profile elevating authority.

### Quality / cost / personalization metrics

Goal-misunderstanding caught before edit; scope deviation; unsupported completion; first-pass acceptance; reopen; 7-day escape; user correction turns; review minutes; time-to-accepted; tokens; tool calls; repeated explanation; candidate confirm; profile override; harmful application; rollback; stale firing.

## Output rule

Descriptive differences and screening evidence only. No ranker training. No auto-promote of profile/lesson from pilot.
