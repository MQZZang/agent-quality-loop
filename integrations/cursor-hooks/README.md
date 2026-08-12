# agent-quality-loop · Cursor hooks add-on

Optional **deterministic enforcement for decidable invariants** from the agent-quality-loop skill. This is an add-on: it does not modify the skill body.

It mechanizes two checks that can be decided from the workspace envelope and the hook payload:

1. **Authority gate** — for heuristically matched external write-class shell commands, require an explicit release-act envelope with a bound `execution_plan` (exact command + canonical cwd + mechanical TTL), then emit native **`ask`** only — never auto-`allow`. When `read`, also block configured write-class file tools.
2. **Stop gate** — when the envelope `phase` is `BUILT` / `ACCEPTED` / `RELEASE_READY` and `evidence_refs` is an empty array, bounce the agent once with a follow-up.

This package does **not** claim completeness, safety guarantees, or coverage of every external side effect. Heuristics miss disguised commands and tools not on the list. An envelope plan is **not** current tool authorization by itself; the user’s native confirmation is. The hook is not full shell semantics (no argv/cwd normalization beyond exact string + `realpath` equality).

Official docs used for the schema (2026-08): [Hooks](https://cursor.com/docs/hooks), [Third-party hooks](https://cursor.com/docs/reference/third-party-hooks.md).

## Install (merge only — do not “activate” from this README alone)

Cursor loads hooks from (priority high → low): Enterprise → Team → **Project** → **User** (plus optional Claude-compatible locations).

| Level | Config path | Script cwd |
| --- | --- | --- |
| Project | `<repo>/.cursor/hooks.json` | project root |
| User | `~/.cursor/hooks.json` | `~/.cursor/` |

**Recommended (project):** keep this folder at `integrations/cursor-hooks/` (as shipped), then merge the entries from this directory’s `hooks.json` into `<repo>/.cursor/hooks.json`. Commands in the template are project-root relative:

```text
node integrations/cursor-hooks/aql-authority-gate.js
node integrations/cursor-hooks/aql-stop-gate.js
```

**User-level:** copy or clone the scripts under `~/.cursor/` (or another stable location) and adjust `command` paths in `~/.cursor/hooks.json` accordingly. User hooks are not available to cloud agents; project hooks are.

Merge tip: Cursor runs matching hooks from every source. Prefer adding the three entries (`preToolUse`, `beforeShellExecution`, `stop`) alongside existing ones rather than replacing an entire file.

This add-on ships a merge template only. It does not write into your real Cursor config.

## Disable

Set environment variable:

```text
AQL_HOOKS_DISABLE=1
```

Both gates allow immediately when this is set. This is the **only** intentional bypass for the authority gate’s external-write checks.

## Fail-closed policy

| Layer | Behavior |
| --- | --- |
| Invalid / unreadable `hooks.json` or `gates.config.json` | Authority gate **deny** (exit 2) — config/validator failure is fail-closed |
| Unparseable hook input, bad policy regex, unexpected exception | Authority gate **deny** (exit 2) |
| External write-class shell command | **Never `allow`** from AQL — at most native **`ask`** when every release + `execution_plan` gate passes |
| `AQL_HOOKS_DISABLE=1` | Explicit bypass only (see above) |

External write-class commands are never auto-allowed by this add-on. Exact `execution_plan` match may yield host-native **`ask`** only; the user’s confirmation is still required.

## Gate behavior

### Authority gate (`aql-authority-gate.js`)

Events: `preToolUse`, `beforeShellExecution` (see template `hooks.json`).

**External write-class command decision matrix**

| Condition | Result |
| --- | --- |
| non-external command | allow (subject to the separate `read` write-tool rule) |
| unparseable hook input | exit 2 + deny JSON |
| invalid policy / regex | exit 2 + deny |
| no / unreadable envelope | deny |
| envelope schema-invalid for gate checks | deny |
| not valid release-act route | deny |
| release `execution_plan` missing / expired / non-ISO | deny |
| cwd mismatch | deny |
| command not exact match (whitespace / args / remote / branch) | deny |
| exact match all gates | **ask** (never allow) |
| unexpected exception | exit 2 + deny |
| `AQL_HOOKS_DISABLE=1` | allow |

Release-act route still requires `intent=release`, `mode=release`, `phase=RELEASE_READY`, `action_authority=release`, `release_intent=act`, complete human `release_authorization` fields, **and** a valid `release_authorization.execution_plan`:

```json
{
  "host": "cursor",
  "cwd_realpath": "<absolute canonical>",
  "command": "git push origin main",
  "command_sha256": "<64 lowercase hex of raw UTF-8 command>",
  "issued_at": "ISO-8601",
  "expires_at": "ISO-8601"
}
```

Rules: SHA-256 of the exact UTF-8 command string (no shell normalization); `expires_at > issued_at` with max TTL 15 minutes; NL phrases like `"current turn only"` are rejected as mechanical time; `authorized_this_turn` alone never unlocks.

| Other | Result |
| --- | --- |
| `read` + `tool_name` in `writeTools` | deny |

Workspace roots come from the hook payload field `workspace_roots` (fallback: `cwd` / `tool_input.working_directory`).

**Boundaries:** command matching is regex over the raw command string (easy to bypass with wrappers, aliases, or unexpected CLIs). Plan binding is exact-string + canonical cwd only — not a shell parser. Write-tool blocking is an explicit name list. MCP / Tab / network tools outside the list are not covered.

### Stop gate (`aql-stop-gate.js`)

Event: `stop`.

| Condition | Result |
| --- | --- |
| No envelope | allow (empty JSON) |
| `phase` not in `{BUILT, ACCEPTED, RELEASE_READY}` | allow |
| `evidence_refs` missing, non-array, or non-empty | allow |
| Completion-class phase + `evidence_refs: []` + marker absent | `followup_message`: `completion claimed without evidence refs in envelope` (writes `.agent-quality-loop/.stop-gate-fired`) |
| Same condition + marker already present | allow; note that the gate already fired (anti-loop) |

**Boundaries:** emptiness of `evidence_refs` is structural only — the gate does not validate that listed refs exist or are sufficient. Agents can still claim completion in prose without updating the envelope. Template sets `loop_limit: 1` on the stop hook as a second loop brake.

## failClosed recommendation

Per Cursor docs, `failClosed: true` makes crash / timeout / invalid JSON **block** the action instead of fail-open. The authority script itself also fail-closes (deny + exit 2) on unparseable input, invalid policy regex, and unexpected exceptions.

| Hook | Suggestion | Why |
| --- | --- | --- |
| Authority (`preToolUse`, `beforeShellExecution`) | `failClosed: true` (as in template) | A silent allow on gate failure would defeat the external-write / read-write check for that turn. |
| Stop | omit / `false` | Blocking agent completion on a stop-script failure is harsh and can strand sessions; logic already fail-opens when undecidable. |

## gates.config.json

| Field | Role |
| --- | --- |
| `writeTools` | Tool names blocked under `action_authority: read` on `preToolUse` |
| `externalWriteCommandPattern` | Case-insensitive regex source for external write-class shell commands |

Adjust lists/pattern here when you need local policy tweaks. JSON cannot carry real comments; the `_readme` key points here.

## Sample envelope

`sample-envelope.json` is a hooks-only fixture for manual inspection and `test.js`, not a valid complete AQL envelope. Runtime envelopes still belong at `<workspace>/.agent-quality-loop/envelope.json`.

## Test

Zero-dependency:

```bash
node integrations/cursor-hooks/test.js
```

Exit code `0` means the scripted protocol cases passed.

## Known limits (honest)

- Heuristic shell regex; not a sandbox or capability system.
- Envelope `execution_plan` ≠ live tool auth until the user confirms via native `ask`.
- Hook matching is not full shell semantics.
- Write-tool list is incomplete relative to every mutable surface (MCP, plugins, Tab, etc.).
- Stop gate only sees envelope structure, not narrative “done” claims.
- Multi-root workspaces: first matching root that contains an envelope wins.
- Cloud agents load project hooks, not user hooks; some IDE-only events never fire there.
