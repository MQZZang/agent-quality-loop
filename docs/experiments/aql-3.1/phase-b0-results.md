# Phase B0 results

Protocol: `aql-3.1-ablation-v0/1`  
Overall verdict: **`INCONCLUSIVE_EXECUTION_BLOCKED`**  
B0 arm: **`CONTAMINATED_SKIP`**  
Main matrix: **`NOT_RUN`**  
Blind scoring / unsealing: **`NOT_RUN`**

This is not `AQL_SIGNAL`.

## Two isolation attempts

| # | Mechanism | Evidence | Result |
|---|---|---|---|
| 1 | `codex exec --ephemeral --skip-git-repo-check --ignore-user-config --sandbox read-only -C F:\MySkill\aql31-lab\clean-home -m gpt-5.6-sol "Reply with the single word PONG."` | Hang >85s, no stdout; maintainer stated Codex has no quota | `EXECUTION_BLOCKED` |
| 2 | Cursor Task sentinel `428b20de` (`sha256 6a41388fea4acc2e0511f004d1e185a8f214f5f8b98854c9d2f11c2e1a44a734`) | `VISIBLE_SKILLS` includes `agent-quality-loop` plus dozens of host skills | Isolation conditions 2 and 5 failed |

## Sentinel excerpt

`VISIBLE_SKILLS` named `agent-quality-loop`. Files read: none. The agent listed host-injected skills from the parent Cursor session.

## Morphology

Decision table #5 → conservative default #2: keep full Core; implement WP1–WP7. Recorded in `morphology.md`.
