# Alignment Compiler

How ALIGN turns a raw request into the existing Task Contract ([contracts.md](contracts.md)). This is not a new lifecycle phase, ceremony, or schema — it is compile discipline for the same contract fields. Ordinary Q&A, low-risk execute, and plan-only turns keep normal AQL routing and are not forced through goal-compiler ceremony.

## Invariants

### 1. Observable after-state

`Goal` / `success_observables` name a user- or system-observable after-state. Activity verbs alone (`investigate`, `improve`, `refactor`, `look into`) are invalid until rewritten as what would be true after success.

### 2. Current-to-target gap

State the gap: what is true now versus what must be true after. If the current state is unknown, record it under `unknowns` (or investigate first) — do not invent a baseline.

### 3. Full-scope evidence coverage

Every in-scope deliverable needs an evidence path. Passing tests cover only what they exercise; they are never evidence for untested docs, configs, UX, rollout, or release surfaces named in scope.

### 4. Ground real context

Ground load-bearing referents read-only before the contract freezes (see contracts grounding ladder). Depth is proportionate: stop when further inspection would not change the contract. Do not survey the whole repo for a one-line local fix.

### 5. Material-question threshold

Ask at most the material questions whose answers change direction, authority, or success criteria and cannot be derived safely. Prefer inspection over interrogation. Style words and process preferences are not material goals.

### 6. Skip-investigation semantics

When investigation is skipped (authority, time, or user direction), leave gaps visible in `unknowns` / `assumptions`. Never fabricate files, behaviors, baselines, or evidence to fill them.

### 7. Delegated judgment

When the agent chooses among interpretations or trade-offs without an explicit user decision, record the choice as an agent assumption/judgment. Never rewrite it as a user decision or as settled profile preference.

### 8. Reuse active truth (precedence)

Prefer existing active truth over rewriting:

1. Explicit current-turn user confirmation  
2. Authoritative in-repo / linked spec or design  
3. Issue, todo, or accepted tracker item  
4. Prior envelope or cache  

When sources conflict, **workspace reality wins**. Disclose the conflict; do not silently prefer memory or cache.

### 9. Proportionate confirmation

Confirmation is for material blockers only. No per-task goal-compiler questionnaire, no ritual re-confirmation of settled profile or contract facts, and no ceremony that expands ordinary work into a planning theater.

### 10. Trigger boundary

Do **not** hijack:

- ordinary Q&A  
- low-risk execute with a clear local after-state  
- plan-only / diagnose-only turns that already have a usable contract shape  

into a separate goal-compiler ritual. ALIGN still emits only the existing AQL contract fields and three alignment lines — never a parallel goal document, `.goal-task/` store, or new lifecycle phase.

## Fail-closed compile checks

Before leaving ALIGN for non-trivial work:

| Check | Fail closed when |
|---|---|
| After-state | Goal is only an activity verb or internal process |
| Evidence map | A named deliverable has no decidable evidence path |
| Unknowns | Skipped investigation is papered over with invented facts |
| Attribution | Agent judgment is labeled as the user's decision |
| Conflicts | Project rules / workspace contradict the compiled goal and the conflict is not disclosed |
| Handoff | Compressed resume drops a conjunctive gate or required dimension |
| Observability | A counterexample or success observable is non-decidable |

On fail: revise the contract in ALIGN (or stop with actionable `unknowns`) — do not proceed as if the compile succeeded.
