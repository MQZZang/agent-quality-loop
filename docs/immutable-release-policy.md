# Immutable release policy (preferred)

Preferred GitHub settings for formal skill releases of **MQZZang/agent-quality-loop**. Goal: once a formal `vX.Y.Z` is published, assets and the associated tag cannot be quietly moved, rewritten, or deleted.

## Status

**APPLIED** (2026-08-12, maintainer machine with admin API):

- `GET /repos/MQZZang/agent-quality-loop/immutable-releases` → `{"enabled":true,"enforced_by_owner":false}`
- Tag ruleset **Protect formal v\* tags** (`id` 20750890): `target=tag`, `enforcement=active`, include `refs/tags/v*.*.*`, exclude `v*-rc.*` / `v*.*.*-rc.*`, rules: `deletion` + `update` + `non_fast_forward`

Applies to **future** immutable releases / protected tags. Existing mutable releases (including historical `v2.6.1` if published before enablement) are not retroactively rewritten by this toggle alone.

Manual UI steps below remain the human verification checklist.

---

## Preferred settings

1. **Enable release immutability** for the repository (applies to future releases). Conceptually: published release assets and the associated Git tag stay fixed; see GitHub docs:
   - [Immutable releases](https://docs.github.com/en/code-security/concepts/supply-chain-security/immutable-releases)
   - [Preventing changes to your releases](https://docs.github.com/en/code-security/how-tos/secure-your-supply-chain/establish-provenance-and-integrity/prevent-release-changes)
2. **Protect formal `v*` tags** from update/delete via a **tag ruleset** (Restrict updates + Restrict deletions; optionally Restrict creations to admins / release automation only). See [Creating rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository) and [Available rules](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
3. **Future flow:** publish `vX.Y.Z-rc.N` candidates as needed; create final `vX.Y.Z` **once**; never move or retarget formal tags after push.

---

## Manual UI steps (human verify) — repo `MQZZang/agent-quality-loop`

### A. Enable release immutability

1. Open `https://github.com/MQZZang/agent-quality-loop`.
2. Click **Settings**.
3. Scroll to the **Releases** section.
4. Select **Enable release immutability**.
5. Confirm the checkbox remains enabled after refresh.
6. Note: immutability applies to **future** releases; existing mutable releases stay mutable unless republished under the new policy.

### B. Create a tag ruleset for formal `v*` tags

1. Still under **Settings**, open **Rules** → **Rulesets** (or **Code** → Rulesets, depending on GitHub UI).
2. Click **New ruleset** → **New tag ruleset**.
3. Name (example): `protect-formal-v-tags`.
4. **Enforcement status:** Active (or Evaluate first, then Active).
5. **Target tags:** Add target → include by pattern → `v*` (adjust if you only want `v[0-9]*` style; exclude `v*-rc*` only if you want RCs editable — preferred default protects all `v*` including RCs from move/delete).
6. Under tag protections, enable at least:
   - **Restrict updates**
   - **Restrict deletions**
   - **Block force pushes** (if offered for tags)
7. Optionally enable **Restrict creations** and grant bypass only to release owners / GitHub App used for tagging.
8. Save ruleset. Re-open it and screenshot / note the ruleset id for the Status flip to `APPLIED`.

### C. Human smoke check

1. Attempt (on a throwaway test tag, not a real release): create `v0.0.0-immutable-test`, then try to move it with `git push --force` to a different SHA — expect rejection under an active ruleset.
2. Delete the throwaway tag only via allowed bypass path (admin) if needed; do not leave junk tags on `main` history narratives.
3. For a real formal tag: never rewrite; cut `vX.Y.Z+1` or a new RC instead.

---

## API steps (optional verify / apply)

Requires `repo` (admin) scope. Replace `TOKEN` and confirm owner/repo.

### Check whether release immutability is on

GitHub may expose this under repository properties / settings UI primarily; if the REST field is available in your API version, inspect repository settings via:

```bash
gh api repos/MQZZang/agent-quality-loop --jq '{name, visibility, default_branch}'
```

Then confirm **Settings → Releases → Enable release immutability** in the UI (authoritative until API field is documented for your plan).

### List existing rulesets

```bash
gh api repos/MQZZang/agent-quality-loop/rulesets
```

Look for a tag-targeting ruleset whose `conditions.ref_name.include` covers `refs/tags/v*` (or equivalent `v*` pattern) and whose rules include restrict update/delete.

### Create tag ruleset (example payload — review before POST)

```bash
gh api --method POST repos/MQZZang/agent-quality-loop/rulesets \
  --input - <<'EOF'
{
  "name": "protect-formal-v-tags",
  "target": "tag",
  "enforcement": "active",
  "conditions": {
    "ref_name": {
      "include": ["refs/tags/v*"],
      "exclude": []
    }
  },
  "rules": [
    { "type": "update" },
    { "type": "deletion" },
    { "type": "non_fast_forward" }
  ]
}
EOF
```

If the API rejects a rule type name for your account, fall back to the UI steps above and record the live ruleset JSON from `GET .../rulesets/{id}`.

After a successful create + UI immutability checkbox, update this file’s **Status** from `PENDING_APPLY` to `APPLIED` and note date + actor.

---

## Relation to AQL terminals

- `RELEASE_READY` is a **read-only preflight** verdict, not permission to move tags or mutate a published release.
- Formal publish still follows host/repo policy: create final `vX.Y.Z` once; prefer RC tags for rehearsal.
- Probe C / pilot R2 in adaptive docs stay **NOT_RUN** until a real preflight against a candidate tag is recorded — this policy doc is configuration intent, not probe PASS.
