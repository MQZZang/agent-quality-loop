# Explicit-Only Collaboration Profile v2

The optional profile is `$AQL_HOME/profile.json`, validated as `aql.collaboration-profile/v2`. It is user-owned preference data, never task evidence, authority, acceptance, release permission, or a replacement for the Task Contract. Its memory policy is always `explicit_only`.

## Persistent Writes

Write a persistent entry only from either:

1. an unambiguous user memory request, such as “remember this”, “from now on”, or “use this by default”; or
2. an explicit confirmation after AQL has restated the proposed preference.

For a meaning-sensitive alias, working identity, or preference that materially changes decisions, restate the exact entry and require confirmation. A clear, low-risk memory request may be saved directly with a concise notice of what was saved, scope, and how to revoke it.

Ordinary repeated behavior, repeated choices, correction patterns, silence, task completion, output acceptance, and inferred user traits never create, update, count toward, activate, or prompt a cross-task candidate. An explicit correction may be offered once at a natural stop in the same task; without confirmation it is discarded when that task ends. There is no Growth Focus, learner model, repeated-signal store, hidden scoring, or automatic memory promotion in v2.

Perform every profile and project-identity mutation through the packaged CLI/runtime so schema validation, expected-revision CAS, locking, atomic replacement, and managed cleanup remain in force. Never free-form edit `profile.json` or `.aql/project.json`. If that control plane is unavailable, report only the requested profile-management operation as unavailable; continue ordinary AQL Core work without profile application.

## Entry Rules

Entries use the v2 schema's `id`, `kind`, `state`, `value`, timestamp fields, and provenance. Persistent provenance is only `explicit_memory_command`, `explicit_confirmation`, or an auditable migration. An active entry must be complete and semantically clear. Replacement uses `supersedes`; archive and forget are explicit user-controlled operations.

Applied 2.8 migration reads the source bytes once, derives both the proposed entries and the owned backup from those same bytes, and leaves the user-owned source unchanged. It merges incoming active and archived entries into an existing Profile; an entry-id collision fails before mutation instead of replacing either side. An explicit expected revision cannot create an absent target. The owned record beside the target retains the source's `*.2.8.backup.*` filename and binds its byte hash to every incoming entry id without putting a machine path in the portable Profile. A later operation treats the record as owned only when its root marker, closed metadata, exact inventory, file type, size, hash, and Profile identity still match; path exchange or drift fails closed rather than deleting an unowned replacement.

`forget` removes the entry from AQL-managed active data, pending data, temporary files, and every owned migration or automatic backup that contains its body. It validates every cleanup target before the Profile commit, commits the Profile under the same lock/CAS, then cleans owned artifacts; commit failure leaves backups intact, and cleanup failure rolls the Profile back so the operation can be retried. A scoped forget removes every matching record; `forget --all` chooses the complete current entry set inside the locked mutation and removes every record owned by that Profile, including an empty migration record. Automatic backups must be valid snapshots of the same Profile, and optional receipt purge recognizes only closed, same-Profile projection receipts; filename or string-match lookalikes are preserved. Forget never alters the user-owned migration source and does not claim forensic erasure from operating-system snapshots or external backups.

## Scope And Fresh Mode

User profile entries are portable defaults and may be projected only by [Profile Projection v2](profile-projection.md). A project-scoped preference requires explicit confirmation and the on-demand identity file defined there. Current-turn instructions always override stored defaults. Fresh Mode ignores stored preferences only; it preserves project facts, repository rules, lessons, authority, evidence, acceptance, and release boundaries, and writes nothing.

Ordinary task results use [Result Attention](result-attention.md). They do not reveal profile contents, projections, capability receipts, or profile-management machinery unless the user asks about it or the missing capability materially blocks the result.
