# Corpus Audit

## Decidable inventory result

| Measure | Result |
|---|---:|
| Regular files | 397 |
| Total bytes | 1,561,998,865 |
| PDFs | 364 |
| PDF pages | 13,040 |
| PDF header/metadata scan | 364 succeeded in the baseline probe |
| Text extraction terminal | 364 `success`; 0 `ocr-required`; 0 `failed` |
| Exact duplicate groups | 1 |
| Inventory rows | 397 |
| License proven from local evidence | 0 |

The text-extraction result means each PDF produced extractable text with the pinned local `pypdf` probe. It does not certify reading order, tables, figures, equations, footnotes, or semantic completeness. Those remain document- and claim-specific evidence questions.

## Duplicate and provenance result

One exact SHA-256 group was found and neither source file was deleted:

```text
52b1843e6b2348c1c3be3e310fa231266928b43f5fe8b26ba3d45b560992b6cb
  pdfs/2407.21075.pdf
  pdfs/apple-intelligence-foundation-language-models.pdf
```

The intended provenance classes are:

- `arxiv-id-linked`: numeric arXiv filename linked by the local catalog;
- `manifest-url-linked`: exact filename paired with an HTTP(S) URL in `_meta/download-manifest.txt`;
- `catalog-only`: filename appears in the local PDF catalog but no direct local source URL was found;
- `unknown`: none of the above.

These labels identify a local trace, not ownership or a reuse license. Every PDF remains `license_status: unknown` unless explicit license evidence is later added to the source corpus.

## Claim-selection boundary

The 397-file inventory was screened by catalog topic and keyword relevance to AQL: instruction compilation, constraint handling, context selection, factuality, evaluation, human feedback, Agent Skills, and personalization risk. Fifteen PDFs were extracted into a temporary local analysis directory for page-level review; only the claims retained in [claim-ledger.json](claim-ledger.json) enter the integration decision.

The ledger is bounded, not exhaustive:

- a claim needs a source SHA-256 and page/span locator;
- an accepted claim needs mechanism, applicability, non-applicability, a counterexample, an integration target, and evidence stronger than marketing or an unsupported heuristic;
- sources not selected for the ledger are “not evaluated for AQL integration,” not rejected and not evidence of absence;
- image/table-only meanings were not used;
- no near-duplicate documents were auto-merged. The only dedupe action is exact full-file hash grouping.

Title/page-text screening identified one high-confidence semantic/version group (the two local SimpleQA variants) and one reviewed title-metadata false positive (StarCoder vs StarCoder2). Both decisions and their bounded method are recorded in [semantic-duplicate-groups.md](semantic-duplicate-groups.md); no file was merged.

## Known unknowns

- Per-file copyright and reuse licenses are not established by public availability or arXiv linkage.
- The local corpus is broad on LLMs and agents but thin on longitudinal human writing-skill transfer; it cannot prove AQL’s long-term user-growth outcome.
- No six-task longitudinal writing pilot exists in this repository. Its state remains `NOT_RUN`.
- A successful text extraction does not make a paper’s claim universally valid, current, or directly applicable to writing collaboration.
