# Claim Evidence Matrix

| Claim | Evidence | Status |
| --- | --- | --- |
| One discoverable product Skill | STATIC | Validated by `scripts/validate-claims.js` after package/mirror synchronization. |
| Snapshot ownership lifecycle | SELF_TEST | `scripts/install.js --self-test` covers ownership, status, update/uninstall dry-run, drift refusal, unowned refusal, and profile preservation. |
| Mirror consistency | STATIC | `scripts/sync-skills.js --check`; the check path is read-only. |
| Task Contract sole truth and Profile v2 projection limits | SPEC + SELF_TEST | Mechanism coverage only; not a user-value result. |
| Capability Receipt source fields | SPEC + SELF_TEST | Mechanical observed-source contract only; no model self-report. |
| Historical Profile Projection v1 mechanism probes | HISTORICAL BLIND_RUNTIME | Historical, scoped evidence only. It does not validate Profile v2. |
| Historical Profile Projection v1 A/B/C value control | HISTORICAL BLIND_RUNTIME | `INVALID`; it must not support AQL 3.0 product claims. |
| AQL 3.0 Profile v2 product screening | BLIND_RUNTIME | `NOT_RUN`; protocol: [aql-3.0-product-screening/1](aql-3.0-product-screening-preregistration.md). |
| AQL 3.0 single-Skill non-inferiority | BLIND_RUNTIME | `NOT_RUN`; protocol: [aql-3.0-product-screening/1](aql-3.0-product-screening-preregistration.md). |
| Longitudinal user value | LONGITUDINAL | `NOT_RUN`. |
| Cross-host automatic profile synchronization | N/A | Not claimed. Same-storage portability and explicit export/import only. |

Structural checks, hashes, and receipts prove only their named mechanism. They do not prove acceptance, release authorization, product benefit, or long-term value.
