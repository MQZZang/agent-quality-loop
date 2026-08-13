# Semantic Duplicate Groups

This is separate from full-file SHA-256 deduplication. It records high-confidence content relationships without deleting, merging, or treating one version as authoritative.

## Method and coverage boundary

All 364 PDFs were screened by normalized metadata/first-page title. Exact normalized-title candidates were then checked by page count and normalized extracted-page text. This catches obvious same-work/version pairs; it is not an exhaustive embedding- or meaning-level comparison of 13,040 pages.

## High-confidence group

### SD-001 — SimpleQA paper variants

| File | SHA-256 prefix | Pages | Relationship evidence |
|---|---|---:|---|
| `pdfs/2411.04368.pdf` | `cca380927024` | 13 | Same normalized title; 9 page-text hashes match the paired file exactly |
| `pdfs/openai-simpleqa.pdf` | `701809c0cd5c` | 14 | Same normalized title; different full-file hash and one additional page |

Decision: semantic/version duplicate group, retained as two source identities. A claim must still point to the exact file hash and page locator it used; evidence is never silently transferred between variants.

## Reviewed false positive

`pdfs/2305.06161.pdf` and `pdfs/2402.19173.pdf` share a normalized PDF metadata title, but the first is the original StarCoder paper and the second page text begins with “StarCoder2 and The Stack v2.” They have 55 versus 61 pages and zero equal normalized page-text hashes across the aligned first 55 pages. They are related works, not a semantic duplicate group.

## Exact duplicate remains separate

`pdfs/2407.21075.pdf` and `pdfs/apple-intelligence-foundation-language-models.pdf` are byte-identical and remain the sole SHA-256 duplicate group in [inventory.json](inventory.json); they are not relabeled as an approximate group.
