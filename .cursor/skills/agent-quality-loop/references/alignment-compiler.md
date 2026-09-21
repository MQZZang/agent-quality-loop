# Alignment Compiler

How ALIGN turns a raw request into the existing Task Contract ([contracts.md](contracts.md)). This is not a new lifecycle phase, ceremony, or schema — it is compile discipline for the same contract fields. Ordinary Q&A, low-risk execute, and plan-only turns keep normal AQL routing and are not forced through goal-compiler ceremony.

## Invariants

### Material cognitive layers

“Cognitive” here means an observable, falsifiable path from a request to an outcome—not neuroscience, mind-reading, personality diagnosis, or access to hidden thoughts. Compile only the layers that can change the result:

```text
L0 words used -> L1 situation/problem signal -> L2 consumer/medium
-> L3 change the user wants to cause -> L4 essential job/need
-> L5 constraints/non-goals/risks -> L6 decision criteria/trade-offs
-> L7 facts/sources/unknowns/counterevidence -> L8 delegated AI solution space
-> L9 success observables/counterexamples/minimum sufficient terminal
-> L10 explicitly requested long-term collaboration preference, when applicable
```

This stack is an internal diagnostic, not a required questionnaire or a new contract. Omit layers that would not change scope, execution, evidence, or the terminal. L10 never activates teaching or a profile entry by inference; persistent memory follows [personalization.md](personalization.md).

### 1. Observable after-state

`Goal` / `success_observables` name a user- or system-observable after-state. Activity verbs alone (`investigate`, `improve`, `refactor`, `look into`) are invalid until rewritten as what would be true after success.

### 2. Current-to-target gap

State the gap: what is true now versus what must be true after. If the current state is unknown, record it under `unknowns` (or investigate first) — do not invent a baseline.

For current-state claims, observable workspace reality wins over memory, cache, and stale narrative. For target-state obligations, current-turn instructions and authoritative specifications win; workspace reality is baseline evidence, not authority to rewrite the target. Disclose conflicts explicitly.

### 3. Full-scope evidence coverage

Every in-scope deliverable needs an evidence path. Passing tests cover only what they exercise; they are never evidence for untested docs, configs, UX, rollout, or release surfaces named in scope.

### 4. Ground real context

Ground load-bearing referents read-only before the contract freezes (see contracts grounding ladder). Follow identifiers, relations, shared records, and effect rules when they determine selection or blast radius; name matching alone is insufficient. A restriction on what may be modified does not by itself restrict necessary authorized reads, and evidence needs never justify unrelated or private scanning. Depth is proportionate: stop when further inspection would not change the contract. Do not survey the whole repo for a one-line local fix.

### 5. Material-question threshold

Ask at most the material questions whose answers change direction, authority, or success criteria and cannot be derived safely. A question is justified either by multiple credible result-changing interpretations or by one unobtainable fact that decides the next safe action. Prefer inspection over interrogation. Style words and process preferences are not material goals.

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

Apply the current/target authority rule above. Disclose source conflicts; do not silently prefer memory, cache, or the current implementation over a target obligation.

### 9. Proportionate confirmation

Confirmation is for material blockers only. No per-task goal-compiler questionnaire, no ritual re-confirmation of settled profile or contract facts, and no ceremony that expands ordinary work into a planning theater.

### 10. Trigger boundary

Do **not** hijack:

- ordinary Q&A  
- low-risk execute with a clear local after-state  
- plan-only / diagnose-only turns that already have a usable contract shape  

into a separate goal-compiler ritual. ALIGN emits only the existing AQL contract fields. Expose only decision-relevant goal, scope, uncertainty, or authority information in natural prose under the Skill's ordinary-output rule — never a fixed alignment block, parallel goal document, `.goal-task/` store, or new lifecycle phase.

## Fixed, Guided, and Open Space

After grounding, classify each outcome-changing input without adding schema:

- **Fixed:** explicit user constraints, authoritative facts, permissions, non-goals, safety boundaries, acceptance obligations, and mechanisms stated as mandatory (`must`, `use X`, `acceptance requires X`). Preserve them exactly enough to test.
- **Guided:** preferences, examples, trade-offs, source signals, and mechanisms stated as preferred or replaceable (`prefer X`, `default to X unless...`). Record their source and strength; do not silently harden or discard them.
- **Open:** strategy the user delegated to the AI—structure, sequencing, wording, examples, or mechanisms stated as illustrative/delegated (`for example`, `maybe`, `choose as appropriate`) and implementation choices not fixed elsewhere.

Run a bidirectional trace before contract freeze and before acceptance: every fixed constraint maps forward to a contract obligation/evidence path, and every contract obligation maps backward to a user statement, authoritative source, or disclosed agent judgment. A choice with no source is open or an agent assumption, never a user requirement. A task whose goal and method are fully specified may legitimately have no Open choice; absence of Open space is not a defect. If a fixed item has no downstream check, the compile is incomplete.

## Partial Blocking

An unresolved conflict or unknown blocks only the action or conclusion that depends on it. Continue authorized read-only investigation and deliver independently supported findings when they remain useful, while keeping the affected action paused and the overall status honest. A root-goal contradiction may still block the whole task; do not manufacture busywork merely to show progress.

## Fail-closed compile checks

Before leaving ALIGN for non-trivial work:

| Check | Fail closed when |
|---|---|
| After-state | Goal is only an activity verb or internal process |
| Evidence map | A named deliverable has no decidable evidence path |
| Unknowns | Skipped investigation is papered over with invented facts |
| Attribution | Agent judgment is labeled as the user's decision |
| Freedom/traceability | An unsourced choice is hardened as fixed, or a fixed constraint has no downstream evidence path |
| Conflicts | Project rules / workspace contradict the compiled goal and the conflict is not disclosed |
| Handoff | Compressed resume drops a conjunctive gate or required dimension |
| Observability | A counterexample or success observable is non-decidable |

On fail: revise the contract in ALIGN (or stop with actionable `unknowns`) — do not proceed as if the compile succeeded.
