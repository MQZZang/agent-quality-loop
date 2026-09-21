# Multi-Agent Leverage

Independence and parallelism supply layer for `agent-quality-loop`. Subagents produce evidence; the lifecycle owner alone adjudicates. Not a committee, not a debate club, not "more brains => smarter."

## Contents

- [Entry Points](#entry-points)
- [Trigger Conditions](#trigger-conditions)
- [Aggregation Discipline](#aggregation-discipline)
- [Degradation Ladder](#degradation-ladder)
- [Cost Caps](#cost-caps)

## Entry Points

Supply independence/parallelism only where it causally counters a known failure mode:

| Hook | Failure mode countered | Supply |
|---|---|---|
| **ALIGN divergence probes** | Anchoring / single-reader miscompile of ambiguous intent | 2-3 zero-context compilers -> main-context diff |
| **EVIDENCE parallel explore** | Serial bottleneck on independent read-only lanes | Parallel read-only leaves when the host supports it |
| **ACCEPT blind consumer** | Text-self-consistency; implementer-narrative contamination | Fresh agent cold-consumes artifact under declared perspective only |

Do not fan out for ritual coverage, consensus theater, or averaging opinions.

## Trigger Conditions

### ALIGN divergence probes

**Open only when:** one bounded read-only grounding pass still leaves at least two credible, high-impact interpretations whose difference another independent reader can test, or the user explicitly requests a divergence probe. `assurance: formal`, a semantic-risk word, a contradiction keyword, or an open-ended creative task is an inspection signal, not by itself a dispatch trigger.

For every assurance tier, skip the probe when source inspection already resolves the reading, the request is fully specified, or fan-out would only restate the same evidence. Formal quality still requires genuinely independent acceptance later; it does not require multiple ALIGN compilers.

**Procedure:**

1. Dispatch 2–3 zero-context compilers whose **objective functions differ** — not N samples of one prompt. Default pick 2–3 from: **literal compiler** (strict user wording), **consumer-perspective compiler** (declared final consumer needs), **falsifier** (given the leading reading, construct the strongest alternate reading that still fits the user's words but would make delivery fail). The falsifier's job is not to confirm the work is correct — it is to try to break it. Two heterogeneous roles beat three homogeneous ones. Each receives only `raw_request` + minimal project context (repo identity, domain hint, hard constraints). No draft contract, no prior alignment lines, no implementer speculation. **Falsifier admission:** adopt a falsifier objection only when it names a falsifiable observation or a concrete counterexample; discard pure rhetoric — never escalate it into a user question.
2. Each returns exactly the three ALIGN lines — goal, boundary, most likely misunderstanding — labelled the way ALIGN would label them for this user, so probe output can be compared against the contract without re-mapping.
3. Two-phase aggregation — **source-align before any cross-probe compare:**
   - **Phase 1 (per probe, before compare):** bidirectional source check — (a) every hard constraint in the user's words appears in that probe's compile; (b) every compiled item traces to the user's words or readable repo evidence, else must be labeled inference. Fail either direction → drop that probe before compare.
   - **Phase 2 (compare survivors):** divergence is a lead to investigate, not proof of true ambiguity. Trace each difference back to the request and observable facts; ask **at most one** confirmation question only if multiple credible, result-changing readings remain after that check. **Agreement ≠ validation:** shared omission of a hard constraint, or shared addition of an untraceable constraint, is shared-prior risk — disclose in ALIGN; never silently adopt.
4. Probe Briefs reuse the **Dispatch Brief** format in [code-implementation-adapter.md](code-implementation-adapter.md) (goal anchor, scope allowlist/non-goals, baseline, must-holds, verification, escalation triggers, receipt). Do not duplicate that field set here.

### ACCEPT blind consumer

**Open when:** the artifact is experiential (see [domain-profiles.md](domain-profiles.md): document / UI / game design / narrative, and experiential slices of mixed work) and a cold consumer pass supplies evidence the independent acceptance actually needs. Formal acceptance always needs a fresh acceptor, but a separate blind-consumer agent is not automatic for a non-experiential artifact.

**Procedure:**

1. Independent agent receives **only** the artifact (or runnable pointer) and the declared consumer perspective/medium. Isolate implementer narrative and detailed `success_observables` / acceptance criteria from the blind agent.
2. Blind agent cold-consumes once and returns an experience report (breaks, confusion, finished-quality gaps, what was actually tried).
3. Main/acceptor context compares that report to `success_observables` and records it as an `agent_review` finding. A blind-consumer report cannot by itself set `user_observable_result: PASS`.
4. The blind consumer supplies experience evidence while the independent acceptor reviews goal, semantics, and dimensions. On conflict -> conservative map to `FAIL` or `BLOCKED`; never average.

If the host cannot isolate a blind agent, the acceptor still cold-consumes first, then reads the implementer narrative (see Degradation Ladder).

### EVIDENCE parallel explore

When the host can run read-only leaves concurrently, split independent evidence lanes (files, configs, logs, repros) across them only when the latency or independence benefit exceeds briefing and merge cost. Merge labeled claims in the main context.

Model choice and quota policy stay at the host orchestration layer (e.g. Cursor model-routing). This skill does **not** hardcode model names.

## Aggregation Discipline

- Subagent output = evidence, never a verdict or phase grant.
- Default **single round**; no multi-round debate loops (avoids multi-agent text-self-consistency).
- ACCEPT prefers acceptor context/model-family distinct from the implementer when the host can supply it; record actual `acceptance_independence` honestly.
- Acceptor feed order: available authoritative request/correction/spec provenance → contract → artifacts/diff → raw evidence → only then implementer narrative.
- Subagent authority inherits the parent ceiling per [Delegated-Agent Authority Inheritance](contracts.md#delegated-agent-authority-inheritance); do not restate that rule here.
- Main context owns diffs, question synthesis, dimension status, and lifecycle mapping.
- Probe agreement is not correctness evidence; source-alignment outranks consensus.
- Prefer executable/observable external evidence over inter-agent textual cross-examination; textual adversarial exchange supplements only when no external observation surface exists.

## Degradation Ladder

| Host capability | Behavior | Recording |
|---|---|---|
| Subagents available | Use probes / blind consumer / parallel explore per triggers above | Distinct context refs; `relation: fresh_context` when truly fresh |
| No subagents | Same checks sequentially with role switch (compiler ↔ critic, implementer ↔ acceptor, cold-consume then narrative) | Set `acceptance_independence.relation` to what actually happened: `fresh_context` \| `different_role` \| `same_context` |
| Independence cannot be evidenced | Do not claim independent review | Formal acceptance stays `phase: BUILT`, `verdict: PENDING` |

Never invent a review that did not run. Never upgrade `same_context` self-check into formal `ACCEPTED`.

## Cost Caps

| Lever | Cap |
|---|---|
| Assurance gating | No assurance tier alone mandates ALIGN probes or a separate blind consumer |
| Rounds | Single round by default; no debate tournament |
| ALIGN probes | 2-3 readers max; one confirmation question max |
| ACCEPT blind | One blind consumer pass per acceptance attempt unless the user re-authorizes |
| EVIDENCE parallel | Only non-overlapping read-only leaves; no concurrent writers |

Prefer the lowest sufficient fan-out that addresses the failure mode. Skip multi-agent entirely when a single careful pass already resolves ambiguity or when the artifact is non-experiential under `fast`/`standard` without trigger hits.
