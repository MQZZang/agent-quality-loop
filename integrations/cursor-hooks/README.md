# agent-quality-loop · Cursor hooks add-on

Optional **deterministic enforcement for decidable invariants** from the agent-quality-loop skill. This is an add-on: it does not modify the skill body.

It mechanizes checks that can be decided from the workspace envelope and the hook payload:

1. **Authority gate** — for heuristically **matched** external write-class shell commands, require an explicit release-act envelope with a bound `execution_plan` (exact command + canonical cwd + mechanical TTL), then emit native **`ask`** only — never auto-`allow`. When `read`, also block configured write-class file tools. Optional `beforeMCPExecution` applies the same never-auto-allow rule to configured MCP mutation tools.
2. **Stop gate** — when the envelope `phase` is `BUILT` / `ACCEPTED` / `RELEASE_READY` and `evidence_refs` is an empty array, bounce the agent once with a follow-up.

**Claim (allowed):** Matched external-write shell and configured MCP actions never receive automatic allow from the AQL hook.

This package does **not** claim completeness, safety guarantees, full shell understanding, or a sandbox. `mode: "compatibility"` is **heuristic coverage only** — patterns miss disguised commands, wrappers, and tools not listed. An envelope plan is **not** current tool authorization by itself; the user’s native confirmation is. The hook is not full shell semantics (no argv/cwd normalization beyond exact string + `realpath` equality).

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

Merge tip: Cursor runs matching hooks from every source. Prefer adding the entries (`preToolUse`, `beforeShellExecution`, `beforeMCPExecution`, `stop`) alongside existing ones rather than replacing an entire file.

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
| Missing / unreadable `hooks.json` or `gates.config.json` | Authority gate **deny** (exit 2) — config/validator failure is fail-closed |
| Unparseable hook input, bad policy regex, unexpected exception | Authority gate **deny** (exit 2) |
| Matched external write-class shell command | **Never `allow`** from AQL — at most native **`ask`** when every release + `execution_plan` gate passes |
| Configured MCP mutation tools | **Never `allow`** from AQL — ask/deny via the same release-act style path |
| `AQL_HOOKS_DISABLE=1` | Explicit bypass only (see above) |

Matched external-write shell and configured MCP actions never receive automatic allow from the AQL hook. Exact `execution_plan` match may yield host-native **`ask`** only; the user’s confirmation is still required.

## Gate behavior

### Authority gate (`aql-authority-gate.js`)

Events: `preToolUse`, `beforeShellExecution`, and optionally `beforeMCPExecution` (wired in template `hooks.json` when the host supports it; behavior is also covered by stdin payload tests).

#### Modes (`gates.config.json` → `mode`)

| Mode | Shell behavior |
| --- | --- |
| `compatibility` (default) | Only commands matching `externalWriteCommandPattern` enter the release-act exact-plan path. **Unmatched shells keep non-external behavior** (allow unless a write-tool / other gate applies). Heuristic coverage — **not** full shell understanding / **not** a sandbox. |
| `strict` | Known safe read-ish shells (small explicit list: `git status\|diff\|log\|show`, `ls`, `dir`, `type`, `cat`, `Get-Content`, `rg`, `findstr`) → allow (subject to write-tool rules). Matched external writes → existing evaluateExternalWrite (`ask`/`deny`, never hook `allow`). Other `writeTools` still use the authority matrix. **Unknown shell → `ask` (or `deny` if `strictUnknownShellPolicy` is `deny`); never silent allow.** |

#### External write-class command decision matrix

| Condition | Result |
| --- | --- |
| non-external command (`compatibility`) | allow (subject to the separate `read` write-tool rule) |
| non-external unknown shell (`strict`) | ask or deny per `strictUnknownShellPolicy` — never allow |
| unparseable hook input | exit 2 + deny JSON |
| invalid policy / regex | exit 2 + deny |
| matched external + no / unreadable envelope | deny |
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

#### MCP (`beforeMCPExecution`)

Optional host event; template wires it. Tool names are matched **exactly** against config lists:

| Match | Result |
| --- | --- |
| `mcp.known_read_tools` | allow |
| `mcp.known_mutation_tools` | release-act path (plan `command` = tool name); **ask** / **deny** — never auto-allow |
| unknown + `compatibility` | allow with `_aql_note` disclosure (per `unknown_mcp_policy.compatibility`, default `allow_with_disclosure`) |
| unknown + `strict` | ask (per `unknown_mcp_policy.strict`, default `ask`) |

**Boundaries:** command matching is regex over the raw command string (easy to bypass with wrappers, aliases, or unexpected CLIs). Plan binding is exact-string + canonical cwd only — not a shell parser. Write-tool blocking is an explicit name list. MCP tools outside the configured lists are not treated as mutations.

### Stop gate (`aql-stop-gate.js`)

Event: `stop`.

| Condition | Result |
| --- | --- |
| No envelope | allow (empty JSON) |
| `phase` not in `{BUILT, ACCEPTED, RELEASE_READY}` | allow |
| `evidence_refs` missing, non-array, or non-empty | allow |
| Completion-class phase + `evidence_refs: []` + `loop_count` &lt; `loop_limit` | `followup_message`: `completion claimed without evidence refs in envelope` (no workspace marker) |
| Same condition + `loop_count` &gt;= `loop_limit` | allow; note that the gate already bounced this stop cycle (host anti-loop) |
| Same condition + `loop_count` / `loop_limit` missing or non-numeric | allow; disclosure note (avoid infinite stop loop; never invents workspace writes) |

**Boundaries:** emptiness of `evidence_refs` is structural only — the gate does not validate that listed refs exist or are sufficient. Agents can still claim completion in prose without updating the envelope. Anti-loop is host-side only via `loop_count` / `loop_limit` (template sets `loop_limit: 1`); the gate never writes `.agent-quality-loop/.stop-gate-fired`. New conversations / stop cycles start at `loop_count: 0` and can bounce again independently.

## failClosed recommendation

Per Cursor docs, `failClosed: true` makes crash / timeout / invalid JSON **block** the action instead of fail-open. The authority script itself also fail-closes (deny + exit 2) on unparseable input, invalid policy regex, and unexpected exceptions.

| Hook | Suggestion | Why |
| --- | --- | --- |
| Authority (`preToolUse`, `beforeShellExecution`, `beforeMCPExecution`) | `failClosed: true` (as in template) | A silent allow on gate failure would defeat the matched external-write / MCP-mutation / read-write check for that turn. |
| Stop | omit / `false` | Blocking agent completion on a stop-script failure is harsh and can strand sessions; logic already fail-opens when undecidable. |

## gates.config.json

| Field | Role |
| --- | --- |
| `mode` | `compatibility` (default) or `strict` |
| `strictUnknownShellPolicy` | In strict mode: `ask` (default) or `deny` for unknown shells |
| `writeTools` | Tool names blocked under `action_authority: read` on `preToolUse` |
| `externalWriteCommandPattern` | Case-insensitive regex source for external write-class shell commands (includes git push, publish, cloud CLIs, `docker push`, `helm upgrade\|install\|uninstall`, `firebase deploy`, mutating `curl -X`/`--request`, `scp`, remote `rsync`) |
| `mcp.known_read_tools` | Exact MCP tool names allowed |
| `mcp.known_mutation_tools` | Exact MCP tool names that never auto-allow (release-act path) |
| `mcp.unknown_mcp_policy` | Per-mode policy for tools not on either list |

Adjust lists/pattern here when you need local policy tweaks. JSON cannot carry real comments; the `_readme` key points here.

**Reminder:** `compatibility` mode is heuristic pattern coverage — **not** full shell understanding and **not** a sandbox.

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
- `compatibility` unmatched shells are intentionally allow-by-default (except write-tool gates).
- Envelope `execution_plan` ≠ live tool auth until the user confirms via native `ask`.
- Hook matching is not full shell semantics.
- Write-tool / MCP lists are incomplete relative to every mutable surface.
- Stop gate only sees envelope structure, not narrative “done” claims.
- Multi-root workspaces: first matching root that contains an envelope wins.
- Cloud agents load project hooks, not user hooks; some IDE-only events never fire there.
