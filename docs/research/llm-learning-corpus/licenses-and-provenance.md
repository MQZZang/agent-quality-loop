# Licenses and Provenance

Snapshot: 2026-08-13. Machine-readable per-file provenance and license fields are in [inventory.json](inventory.json).

## What the evidence establishes

| Local trace | Files | Meaning | Does not establish |
|---|---:|---|---|
| `arxiv-id-linked` | 346 PDFs | A numeric filename maps to an item in the local catalog | ownership, reuse permission, or the paper's current status |
| `manifest-url-linked` | 7 PDFs | The exact filename has an HTTP(S) source in the local download manifest | license or authenticity beyond that local trace |
| `catalog-only` | 11 PDFs | The filename appears in the local catalog without a direct local source URL | origin URL, author identity, or license |
| non-PDF local project files | 33 files | The file is present in the frozen corpus tree | external provenance or redistribution permission |

All 397 files remain `license_status: unknown`. Public availability, an arXiv identifier, a download URL, or successful extraction is not license evidence. Derived AQL rules therefore use bounded paraphrases and source locators; no long source passages or original PDFs are copied into the product repository.

## Identity, duplicates, and modification boundary

- File identity is relative path + byte size + SHA-256; `modified_at` records the frozen filesystem timestamp but is not a provenance proof.
- One exact duplicate group exists: `pdfs/2407.21075.pdf` and `pdfs/apple-intelligence-foundation-language-models.pdf`, SHA-256 `52b1843e6b2348c1c3be3e310fa231266928b43f5fe8b26ba3d45b560992b6cb`. Both sources remain untouched.
- No near-duplicate pair was auto-merged. Semantic similarity requires claim-level review and cannot be inferred safely from filenames.
- The source corpus was read-only. Inventory, hashes, extraction dispositions, and research notes were written only under `<repo>`.

## Re-entry rule

A file's license may change from `unknown` only when explicit local license evidence is recorded and linked. Provenance labels may be refined when a direct, verifiable source or author record is added. Neither change retroactively upgrades the evidence grade of a product claim without claim-level review.
