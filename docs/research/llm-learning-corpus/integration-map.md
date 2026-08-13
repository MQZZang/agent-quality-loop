# Integration Map

This map compares the distilled claims with the c45cd15 AQL baseline before product edits. It is the gate between corpus research and implementation.

| Capability / failure | Baseline | Decision | Minimal target | Behavioral proof | Delete/revert when |
|---|---|---|---|---|---|
| Observable first-principles goal, current→target gap, material questions, source grounding | already present | keep; do not duplicate | `alignment-compiler.md` | existing cases 46–55 | n/a |
| Complex task decomposition without questionnaire growth | partial | add material cognitive-layer rule (C-001/C-002) | `alignment-compiler.md` | new ambiguous-writing case | It increases questions on clear tasks without changing outcomes |
| Hard constraints separated from AI strategy | partial | add fixed/guided/open classification and traceability (C-003) | `alignment-compiler.md`, writing adapter | creative and cross-model cases | It becomes a universal outline/template |
| Writing job, truth mode, and source-handling boundary | missing | add one thin vertical adapter with nine jobs, four truth modes, and a separate source-handling axis (C-005/C-006) | `writing-collaboration-adapter.md` | factual, interpretive, hybrid, instruct, teach, and creative cases | It duplicates domain profiles or host document tools |
| Consumer perspective and cold-read acceptance | already present | cross-reference only (C-007/C-013) | `domain-profiles.md` | existing consumer-probe cases + writing cases | The adapter becomes a second acceptance gate |
| Deliver / co-create / coach | missing | task-local source-backed assumption; coach explicit | writing adapter | posture cases | Posture becomes top-level lifecycle state or hidden teaching mode |
| Stable writing preferences | partial | add narrow context-qualified lane to same profile (C-004/C-009) | `personalization.md`, profile template | candidate/current-override cases | It freezes voice/structure or becomes a second profile |
| Growth Focus and descriptive evidence loop | missing | same profile; explicit confirm; derived associations only (C-008/C-010/C-012) | `personalization.md`, profile template, claim-evidence docs | Growth candidate and NOT_RUN cases | It becomes a score, ranker, event store, or proof from one task |
| Longitudinal user outcome | not evidenced | do not implement a learning algorithm; keep `NOT_RUN` | docs only | six-task pilot later | A valid real pilot supplies evidence |
| New lifecycle, route, top-level envelope field, event ledger, ranker, bandit, embeddings | not needed | reject | none | grep + canonical validators | Only a separately approved architecture change with evidence reopens it |
| `contract-presets.md` and `multi-agent-leverage.md` | no unique gap | no change | none | existing cases | A reproducible writing failure uniquely requires them |

## Product architecture after integration

```text
natural request
  -> existing ALIGN contract (observable goal, facts, boundaries, evidence)
  -> writing reference only when prose work matches
       fixed constraints / guided choices / open AI space
       primary writing job / truth mode / source handling / deliver|co-create|coach
  -> host artifact skill when a physical document/presentation is needed
  -> canonical implementation receipt (maximum BUILT)
  -> existing fresh-context ACCEPT when explicitly/formally required
  -> existing RETRO candidates
       same collaboration profile: writing preferences + Growth Focus
       descriptive outcome associations only; no second store
```
