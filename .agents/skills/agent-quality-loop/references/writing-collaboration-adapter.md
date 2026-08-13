# Writing Collaboration Adapter

Use this reference for drafting, rewriting, or developing prose after the parent AQL contract is `ALIGNED` and `EVIDENCED`. It reuses the [alignment compiler](alignment-compiler.md), [canonical implementation receipt](contracts.md#phase-summary-and-full-envelope), and [domain profiles](domain-profiles.md); it is not another route, lifecycle, contract, or acceptance gate.

## Input and Boundaries

Consume the existing goal, consumer and medium, sources, scope/non-goals, assumptions, assurance, authority, and semantic must-holds. If a conclusion-changing source, audience choice, or permission is missing, return to the parent lifecycle instead of inventing it.

For an underspecified writing request, ask one compact decision question, not one numbered intake question per missing field. Bundle only the smallest coupled answer that unlocks direction (for example, `主题｜平台｜目标读者` in one reply) and then draft; if the user forbids questions, make bounded assumptions visible and produce the most useful artifact the evidence permits.

Writing classification is task-local execution context and is never serialized as additional envelope state. Every non-trivial task declares one primary writing job; optional secondary jobs must name exactly which section or outcome they control:

| Writing job | Reader/author outcome |
|---|---|
| **inform** | The reader knows the material facts or status. |
| **explain** | The reader understands a relationship, cause, or mechanism. |
| **decide** | The reader can make a neutral judgment or trade-off. |
| **persuade** | Disclosed evidence and framing influence an attitude or choice without coercion. |
| **instruct** | The reader can perform the requested action. |
| **teach** | The reader gains a transferable model and can adapt it to a similar situation. |
| **entertain** | The reader receives the intended experience. |
| **express** | The artifact conveys a stance, voice, identity, or feeling. |
| **author-tool** | The artifact helps the author continue creating, deciding, or revising. |

These jobs are not interchangeable merely because one artifact can serve several. For example, an instruction can enable one action without teaching transfer, and an explanation can clarify a mechanism without persuading the reader to choose it.

Declare one canonical truth mode for each material section, or `hybrid` for an artifact whose labeled sections intentionally use different modes:

| Truth mode | Claim/source boundary |
|---|---|
| **evidence-bound factual** | Every material factual claim traces to an opened allowed source; unsupported claims are removed, qualified, or returned as unknown. |
| **interpretive** | Source facts and the writer's analysis/judgment are visibly separated; an interpretation is never presented as a sourced fact. |
| **creative fictional** | Invented events stay inside the disclosed fictional boundary; real people, events, data, quotations, and citations still need sources or explicit fictionalization. |
| **hybrid** | Factual, interpretive, and fictional/illustrative passages are labeled by section or paragraph; an unlabeled boundary cannot pass self-QA or acceptance. |

`mixed` as a generic writing class never substitutes for the `hybrid` truth mode.

Choose source handling separately, as a lower-level execution strategy rather than a truth mode:

- **source-transform**: reorder, compress, clarify, or restyle supplied material without adding external factual substance; identify any extrapolation;
- **bounded invention**: invent only inside the contract's stated fictional, illustrative, or placeholder boundary while preserving sourced real-world facts;
- **open creation**: create original content inside the declared truth boundary, with real-world claims still governed by that boundary.

Never manufacture a fact, quotation, citation, source title, or source access. A source pointer that was not opened is an unverified lead, not evidence.

## Collaboration Frame

Before drafting, separate:

1. **Fixed constraints** — source facts, approved claims, audience, format, legal/brand boundaries, explicit must-holds, and text the user said to preserve.
2. **Guided choices** — structure, emphasis, tone, examples, and trade-offs for which the request or authoritative sources provide direction without fixing one answer.
3. **Open AI space** — connective prose, candidate phrasing, and permitted invention left genuinely undecided.

Keep enough local traceability to explain which source or constraint controls a material passage. This is working evidence in the existing contract/receipt and is never persisted as a separate state surface.

Choose a task-local posture as a source-backed assumption:

- `deliver`: default when the request asks for an artifact or revision and does not reserve intermediate decisions;
- `co-create`: use when the user explicitly requests iteration or the sources show that unresolved choices should be surfaced as bounded options;
- `coach`: use only when the user explicitly asks to learn, practice, or retain authorship.

Dispatch receives the posture, primary/secondary jobs, truth mode, and source-handling strategy only as a projection of the parent contract. An executor's receipt may report what it did but cannot redefine the posture, sources, goal, or authority. Even in `coach`, return a usable artifact—such as an actionable outline, revised passage, or decision-ready draft—rather than withholding work to force participation.

## Execution Shapes

Pick the smallest shape that reaches the observable outcome:

- **Source-led draft**: inspect the allowed sources, map material claims to them, draft, then check every claim that could mislead the consumer. Conflicts remain explicit; source precedence comes from the parent contract.
- **Outline-led draft**: produce a decision-bearing outline when structure is the main uncertainty, then draft from it. An outline is a deliverable only when the contract says the author will use it directly; otherwise it is working material.
- **Exploration-led draft**: when direction is genuinely open, generate a small set of meaningfully different options, compare them against fixed constraints and consumer observables, select or present the surviving option, and produce a usable draft. Do not turn stylistic variety into a new approval ceremony.
- **Editorial pass**: preserve the requested semantic level—proofread, line edit, structural edit, or transformation—and disclose any change that crosses that boundary.

For mixed artifacts, route content work here while the narrowest host skill owns the physical medium. The host document or presentation skill owns file creation, rendering, layout, and format validation; this adapter must not claim those checks unless that skill actually ran them.

## Self-QA and Receipt

Self-QA is proportionate to the contract, and records passing, failing, and not-run evidence:

- the primary job's reader/author outcome is observable, and every secondary job is bounded to its declared part;
- fixed constraints and preserved meaning survived without an executor narrowing the original ruler after drafting;
- an explicit presentation sequence (for example, “first identify both clues, then interpret”) is a fixed constraint: do not interleave later-stage explanation into an earlier required stage and call the order satisfied;
- material factual claims and citations resolve to opened allowed sources;
- interpretations remain visibly separate from source facts; hybrid sections keep factual, interpretive, and fictional/illustrative boundaries visible;
- invented or uncertain material stays inside its disclosed truth boundary;
- the draft is complete and usable for the declared consumer and medium;
- every hard quantitative format bound (such as character, word, item, or step count) is checked with a deterministic counter when available; otherwise keep a safe margin from the boundary and never round an estimate into PASS;
- outline, links, formatting, and rendered output were checked only where the responsible host skill supports them;
- scope deviations and unresolved source conflicts are visible.

Return the exact `implementation_receipt` shape from [contracts.md](contracts.md#phase-summary-and-full-envelope), mapped as follows:

- `adapter` identifies this reference and any host artifact skill actually used; `input_contract_ref` points to the inherited contract and baseline.
- `changed_artifacts` names the drafts/files; `verification_performed` records classification, posture, source checks, constraint checks, and any host-format checks that actually ran.
- passing/failing evidence, `not_run`, deviations, and risks use their canonical fields without promotion by narrative detail.
- `result_phase` is at most `BUILT`.

Receipt detail is non-authoritative and adds no envelope state. This adapter cannot self-accept, grant authority, or claim release readiness.

Consumer perspective, cold-read/native-medium probing, and `ACCEPTED` mapping remain owned by [domain profiles](domain-profiles.md) and the single parent acceptance gate. Long-term preference learning, profile updates, and claims of writer growth are outside this adapter; one task can evidence only the current artifact and interaction.
