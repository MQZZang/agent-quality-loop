# Corpus Distillation Audit Summary

## Decision

`BOUNDED_PASS`: the complete file tree is inventoried and the fourteen selected AQL-relevant claims are traceable and schema-validated. This is sufficient to support the implemented product mechanisms. It is not evidence that every proposition in the corpus was reviewed, that all licenses are known, or that long-term writing growth is proven.

## Coverage and controls

- 397/397 regular files inventoried; 1,561,998,865 bytes.
- 364 PDFs, 13,040 pages; all were metadata/text-probed successfully in the frozen local environment. Extraction success does not certify reading order, tables, figures, equations, or meaning.
- One exact duplicate SHA group retained; one high-confidence semantic/version group recorded separately; no source file deleted, modified, or auto-merged.
- Local provenance traces: 346 arXiv-ID-linked, 7 manifest-URL-linked, 11 catalog-only PDFs. Licenses: 397 `unknown`.
- Fourteen bounded claims: 11 accepted, 2 heuristic, 1 rejected. Each record has source identity/locator, claim class, mechanism, intended outcome, applicability, limits, tradeoffs, counterevidence, grade, freshness, copyright status, decision, and integration target.
- No long source excerpts or raw corpus content entered the distributed Skill.

## Product conclusion

The evidence supports a narrow architecture: observable first-principles compilation; fixed/guided/open constraint separation; a writing collaboration adapter with nine reader/author jobs, four canonical truth modes, a separate source-handling axis, and `deliver|co-create|coach`; one transparent, revocable preference/Growth Focus lane; and descriptive evidence associations. It does not support mind-reading, pseudoneuroscience, a hidden recommender, engagement optimization, a second lifecycle/store, or automatic formal acceptance.

## Known limits

- The ledger is a relevance-selected evidence set, not semantic exhaustiveness.
- All copyright/reuse license statuses remain unknown; paraphrase-only treatment is mandatory.
- Host/model runtime results apply only to the recorded contexts and do not establish universal cross-model behavior.
- Longitudinal user growth remains `NOT_RUN`; it must not be advertised as proven.

## Evidence map

- Baseline and freeze: [baseline-report.md](baseline-report.md)
- Inventory/extraction/dedup: [corpus-audit.md](corpus-audit.md), [inventory.json](inventory.json), [semantic-duplicate-groups.md](semantic-duplicate-groups.md)
- License/provenance limits: [licenses-and-provenance.md](licenses-and-provenance.md)
- Claim records and synthesis: [claim-ledger.json](claim-ledger.json), [claim-ledger.md](claim-ledger.md), [distilled-principles.md](distilled-principles.md)
- Tensions, rejection, and code mapping: [contradiction-map.md](contradiction-map.md), [rejected-material.md](rejected-material.md), [integration-map.md](integration-map.md)
- Runtime behavior evidence: [behavior-probes.md](behavior-probes.md)
