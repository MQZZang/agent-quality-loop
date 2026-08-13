# Baseline Report

Snapshot date: 2026-08-13 (Asia/Shanghai)

## Product repository

- Canonical writable source: `<repo>`.
- Implementation baseline: local `origin/master@c45cd15bf4dffaea7a32de665cd9d5409fe8eaa1`, which contains v2.6.1 plus the terminal-adaptive follow-up.
- Working branch: `cognitive-writing-loop`, created directly from that local ref; no merge, fetch, commit, push, tag, release, publish, or deploy was performed.
- Pre-implementation validation: `node scripts/validate-all.js` exited 0.
- Pre-existing user state: untracked `skills-lock.json`. It is preserved, is not an implementation artifact, and must remain excluded from task attribution.
- The installed snapshot at `<installed-snapshot>` is not canonical and is outside the write scope.

## Read-only corpus

- Source: `<corpus>`.
- The corpus is not a usable Git repository. Its parent VCS marker is empty and there is no nested VCS marker, so a corpus commit/dirty state cannot be asserted.
- Frozen regular-file snapshot: 397 files, 1,561,998,865 bytes; 364 PDF, 21 Markdown, 7 text, and 5 Python files.
- Existing `_meta/CONTRACT.md` says 187 PDFs / 511.7 MB and is stale. It was not modified because the corpus is read-only.
- The immutable derived inventory lives in [inventory.json](inventory.json). Every row has a relative path, byte size, SHA-256, type/encoding result, provenance status, license status, and—where applicable—PDF probe disposition.

## Pollution controls

- The corpus was opened read-only. Derived manifests and research notes are stored only in this product repository.
- No PDF, extracted page text, raw prompt log, or long source passage is copied into the distributed Skill.
- Hash identity is the freeze boundary. A later run is a new snapshot if any path, byte count, or SHA-256 changes.
- “100% coverage” in this work means 100% of regular files have an inventory row. It never means every semantic claim in 13,040 pages was reviewed or atomized.

