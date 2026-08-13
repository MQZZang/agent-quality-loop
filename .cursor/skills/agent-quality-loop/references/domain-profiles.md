# Domain Profiles

Compact lookup for Adapter Router and ACCEPT. Pick the narrowest matching domain; mixed work lists each domain and the governing consumer. Extensible - add a row, do not invent a parallel vocabulary.

## Contents

- [How to Use](#how-to-use)
- [Domain Table](#domain-table)
- [Canonical Mapping Notes](#canonical-mapping-notes)

## How to Use

1. Name `target_user_or_system` as final consumer + medium (not the requesting human unless they are the consumer).
2. Write `success_observables` / `counterexamples` in that consumer's perceptible language.
3. At ACCEPT, run the domain probe when the artifact is consumable in its native medium; bind the probe result to `user_observable_result`. If a real device/environment is required and unavailable, status is `NOT_RUN` with disclosure - never a text-only substitute.
4. Route EXECUTE to the narrowest adapter/skill for the domain; lifecycle ownership stays in `agent-quality-loop`.

Writing work uses [writing-collaboration-adapter.md](writing-collaboration-adapter.md) for drafting behavior, then keeps the consumer perspective and probe from the applicable row below. Mixed writing lists each domain and the governing consumer; document/presentation host skills still own file creation, rendering, and format validation.

## Domain Table

| Domain | Consumer perspective | Probe method | Finished-quality baseline | Canonical dimension mapping |
|---|---|---|---|---|
| **code** | End user of the changed behavior, or the integrating system/API consumer | Run the smallest falsifying path: focused repro, CLI/API call, or UI path that proves the user-observable delta; bind command/output refs | Correct root-cause change; allowlist-only edits; passing/failing/not-run evidence honest; no false user-outcome claims from proxy tests | `user_observable_result`: behavior the consumer can trigger or observe. Usually also `source_static` + `tests`; `runtime_native` when runtime/device matters; `privacy_security` when auth/data paths change |
| **document** | Reader of the published doc, or author using an outline/spec as a work tool | Cold-read the full deliverable in reading order without the implementer narrative; note confusion, missing decisions, unusable structure | Scannable, decision-complete for its job; claims match cited evidence; outline usable as an author tool without tribal knowledge | `user_observable_result`: what the reader/author can extract or do after one cold pass. `source_static` for structure/links; `tests`/`runtime_native` usually `not_applicable` unless the doc drives executable checks |
| **UI** | Interactive end user operating the interface | Walk the primary task flow cold (click/tap/keyboard); record friction, dead ends, labeling failures; screenshot or step log as evidence | First-path completable without coach text; hierarchy and affordances match the job; no decorative clutter that hides the action | `user_observable_result`: task completion and perceptible UX. Prefer `runtime_native` when interactive; `source_static` for layout/copy; `tests` when UI tests exist |
| **game design** | Player of the experience **and** designer/planner consuming the design artifact (dual lens - state which governs each observable) | Player lens: play or simulate the loop cold. Designer lens: use the doc/tables to answer progression, economy, and edge questions without author coaching | Player: loop readable, goals/feedback clear, no silent softlocks. Designer: numbers/rules actionable, edge cases named, no paper-only fantasy disconnected from project reality | `user_observable_result`: player-felt moments **or** planner-usable decisions (label which). Dual-lens tasks must not PASS on designer prose alone when a playable/probeable slice exists |
| **narrative** | Reader (story/prose) or author-tool user (outline/beat sheet) - never confuse the two | Reader: cold-read for immersion breaks, unclear stakes, unearned turns. Author-tool: cold-use the outline to draft the next unit without asking the implementer | Reader: coherent voice, paced reveals, emotional through-line holds. Author-tool: beats actionable, gaps explicit, no ornamental structure that blocks drafting | `user_observable_result`: reader felt outcome **or** author next-step usability. Treat as experiential: probe required when the text is the product; `tests`/`runtime_native` usually `not_applicable` |

Expand with one sentence when a row is ambiguous (e.g. "design doc for a live game" -> game design dual lens, not generic document). Do not expand into taste essays.

## Canonical Mapping Notes

Always-required acceptance dimensions (`goal_fidelity`, `semantic_invariants`, `user_observable_result`, `reproducibility`) apply in every domain. Domain rows only clarify how to interpret them - especially `user_observable_result`.

- `user_observable_result` PASS needs consumer-language evidence from the probe (or explicit `NOT_RUN`/`BLOCKED` with why). Implementer self-description is not sufficient.
- `not_applicable` on optional dimensions (`source_static`, `tests`, `runtime_native`, `privacy_security`) still needs a task-specific rationale and evidence ref; unavailable evidence is never `not_applicable`.
- Experiential domains (document / UI / game design / narrative) default to consumer-probe obligation when the artifact is natively consumable; code uses behavioral repro as its probe.
- Adapter choice follows domain; acceptance still uses [contracts.md](contracts.md) gates. Blind consumer probes, when used, follow [multi-agent-leverage.md](multi-agent-leverage.md).
