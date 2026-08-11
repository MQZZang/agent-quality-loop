# Lessons Learned

Verified, reusable experience from past agent sessions on this project. Not a chat log.

**Default scope of this file:** `project`. Global lessons use the same entry format but live in a deploy-side user-level lessons file (same template); this repo file does not migrate them.

## Rules for This File

1. **Only verified lessons** — observed in repo, tests, or production; not speculation.
2. **No chat fluff** — no greetings, no duplicate narrative from tickets.
3. **No doc duplication** — if it belongs in README or official docs, link there instead.
4. **Update over append** — refine an existing entry rather than adding a near-duplicate.
5. **Write policy (by authority and scope)** — not “propose-only”:
   - **project** scope and agent authority ≥ `local_write` → write the entry here directly and **disclose the diff** (user may revoke/revert).
   - **global** scope, or authority is **read-only** → output a **candidate entry** for confirmation; do not write until confirmed (or until authority/scope allows).
6. **Status and scope on every entry** — each lesson carries `status` (`active` | `merged` | `promoted` | `expired`) and `scope` (`project` | `global`). New writes to this file default to `scope: project` and `status: active`.
7. **Active cap** — prefer ≤ **30** `active` entries. When over the cap, **merge** near-duplicates or **expire** stale ones before adding more; do not grow an unbounded list.
8. **Promotion on recurrence** — if the same lesson recurs ≥ **2** times (same trigger/root cause), promote via **skill-factory** into a rule/skill (or other durable mechanism) change; mark the lesson `promoted` and link the resulting artifact.
9. **Harvest triggers** — RETRO and Self-QA may produce candidates (or direct writes when policy §5 allows). Global candidates follow the same template and cite this format; no migration tooling in this change.
10. **Evidence to read is required** — every entry must name a concrete retrieval surface (file, command, or output) to check first when the trigger reappears; vague “be careful” text does not satisfy the field.
11. **Applies-when match before inject** — Before ALIGN injects an `active` lesson, compare that entry's `Applies when` to the current task. On mismatch: skip inject this round; in RETRO emit one sentence marking it `retire_candidate`. Do not add hit counters or date ledgers (runtime writeback goes stale).
12. **Field-level patch only** — Merge, expire, and revise by patching named fields on the affected entry. Never rewrite this file wholesale (a full-file rewrite silently erases other entries).
13. **`promoted` needs an observable diff** — Mark `promoted` only when a rule, skill, or script already shows an observable diff that absorbs the lesson; otherwise keep `status: active`.

## Feedback Loop (from ask-plan-code-qa QA / RETRO)

After verified implementation work (or RETRO), if a lesson is reusable:

1. Classify **scope** (`project` vs `global`) and check **authority**.
2. If **project** and authority ≥ `local_write`: write (or update) the entry with the template below, keep newest `active` entries near the top of **Lessons**, disclose the diff, and note revocability.
3. If **global** or **read-only**: put a full candidate (template fields) in QA **Next Step** / RETRO output for confirmation; do not treat “propose first” as the only path when §5 allows a direct write.
4. On recurrence ≥ 2, open a skill-factory promotion path instead of only appending another near-duplicate.

## Entry Template

```markdown
### YYYY-MM-DD — Short title

**Trigger:** When / what situation surfaces this lesson
**Root cause:** Why it happened (brief)
**Rule:** What to do differently next time (actionable)
**Evidence:** PR, commit, test, or file path
**Evidence to read:** Concrete surface to check first next time (file, command, or output)
**Scope:** project | global
**Status:** active | merged | promoted | expired
**Applies when:** Trigger conditions for reuse

<!-- Optional equivalents (may mirror fields above): -->
<!-- **Context:** same role as Trigger / area -->
<!-- **Lesson:** same role as Rule (one paragraph) -->
```

---

## Lessons

<!-- Add entries below. Keep newest active entries near the top of the Lessons section. -->

### 2026-08-11 — A repository's publishable surface is larger than its working tree

**Trigger:** Auditing a repository for private content before making it public, or before any handoff that exposes history
**Root cause:** A content scan targets the artifact you picture — files. But git publishes several surfaces that hold no file content and are therefore invisible to that scan: commit messages, author and committer name/email, branch and tag names, and, on a forge, the issue and pull-request threads attached to the repo. Each is written casually, by different actors, at different times, which is exactly why private context settles there.
**Rule:** Enumerate publishable surfaces before scanning, then scan each one: blob content across all refs, commit messages, author/committer identity, ref names, and forge-side issues and pull requests. A clean file scan is evidence about files only — do not report it as evidence about the repository.
**Evidence:** 2026-08-11 a full-object scan of 177 blobs across all refs reported no private-project references; an independent read then found `Reasonix`, a prior private product name, in commit message `fa4a30d` ("Strip all Reasonix-specific references"). The same scan had also missed that four commits carried personal emails in author metadata rather than in any file.
**Evidence to read:** `git log --all --format='%s%n%b'` and `git log --all --format='%an <%ae>|%cn <%ce>' | sort -u`, then the forge's issue and pull-request list — run these alongside, never instead of, the blob scan
**Scope:** project
**Status:** active
**Applies when:** Preparing any repository for publication, open-sourcing, external handoff, or a visibility change from private to public

### 2026-08-11 — Correcting an inventory means re-deriving it, not patching the row you were told about

**Trigger:** Fixing a document that enumerates things — a layout table, a file list, a field or option list — after a reviewer names one wrong item
**Root cause:** A named defect silently redefines the scope of the repair. The reviewer reported the row they happened to check, not the set of rows that are wrong, so accepting their report as the boundary inherits their sampling. An inventory is also the one kind of claim whose correctness turns on what is *absent*, and absence is unreadable from inside the artifact — it surfaces only when the artifact is compared against an independently enumerated source.
**Rule:** When a correction targets an inventory, re-enumerate from the source of truth and diff that against the document, then repair the whole delta in one pass. Never edit only the row that was named.
**Evidence:** 2026-08-11 commit `9c61daa` ("Describe the knowledge directory's actual contents in the layout table") fixed the single `.ai/knowledge/` row a blind read had flagged and shipped a README layout table still missing `scripts/`, `CONTRIBUTING.md`, and `.github/` — the last created two commits earlier in the same session. A later probe that enumerated `git ls-files` *before* opening the README found all three.
**Evidence to read:** `git ls-files | ForEach-Object { ($_ -split '/')[0] } | Sort-Object -Unique`, diffed against the `## Repository layout` table in `README.md` — every tracked top-level path must appear there or be excluded on purpose
**Scope:** project
**Status:** active
**Applies when:** Correcting any document that enumerates files, directories, fields, options, or steps — especially when the correction request named exactly one wrong item

### 2026-08-11 — Deterministic hooks cannot enforce a semantic gate; that branch is closed

**Trigger:** Proposing runtime hooks (Cursor/Codex) to turn this suite's quality gates from convention into enforcement
**Root cause:** A hook is a semantics-blind script fired on an event. It can enforce that a procedure happened; it can never enforce that a judgment was right. Every first-principles goal of this suite — intent fidelity, directive compilation, denoising, non-mechanical execution, goal-anchored acceptance, failure harvest — is a judgment-quality goal, so hook coverage of them is ~zero. Enforcing procedure on a semantic gate is worse than neutral: it manufactures ritual compliance, because the model optimizes for the check rather than the goal.
**Rule:** Do not build hooks to harden ALIGN / EXECUTE / ACCEPT / RETRO gates. Reopen only for mechanically decidable, irreversible environment hazards, and only on a trigger: a junction reappears among the Codex-side real copies, or agents begin routinely editing the deploy tree. Even then, weigh that a single-host safety net is worse than none for a two-host workflow — it lowers vigilance on the unprotected host.
**Evidence:** 2026-08-11 blind probes on one executor tier: two scenarios with near-identical mechanical signatures (both edited `list.test.js` and `docs/acceptance/order-list.md`) required opposite verdicts — `blocker` for ruler movement vs. legitimate contract sync. The only discriminator was a disclosed mid-task user clarification, which no hook can read; the model judged both correctly after one paragraph of rule text. Separately, `scripts/fix-superpowers-windows.ps1` exists because another plugin's hooks would not execute on Windows without a `.cmd` shim — the one time hooks touched this environment, the cost was a dedicated patch script.
**Evidence to read:** Read cases 37 and 38 in `.cursor/skills/agent-quality-loop/references/evaluation-cases.md` side by side — any proposed enforcement mechanism that cannot separate those two cannot serve as a quality gate; then `scripts/fix-superpowers-windows.ps1` for the Windows hook-execution cost already paid
**Scope:** project
**Status:** active
**Applies when:** Evaluating runtime hooks, harness-level enforcement, or any deterministic pre/post-action gate as a way to strengthen this suite's quality loop

### 2026-08-11 — Reconcile external research against this repo before it becomes a plan item

**Trigger:** Turning market research, papers, or competitor teardowns into an iteration plan for these skills
**Root cause:** Research returns mechanisms phrased in the source's vocabulary, so matching them against the repo from memory misses text that already says the same thing in different words. The resulting phantom gap is worse than wasted effort: it consumes change budget, adds diff noise, and under a net-line cap it pressures the executor to delete load-bearing text to fund an addition that changes no behavior.
**Rule:** Every research-derived item must cite a repo grep before it enters a plan — quote the existing line and then drop or narrow the item, or quote the absence. Put the `file:line` in the brief so the executor can reject a duplicate instead of implementing it.
**Evidence:** 2026-08-11 plan item S5 "cross-model-family acceptor independence" was cut after `multi-agent-leverage.md:72` turned out to already read "ACCEPT prefers acceptor context/model-family distinct from the implementer when the host can supply it; record actual `acceptance_independence` honestly." An adversarial falsifier probe caught it, not the author.
**Evidence to read:** For each research-derived item, `rg -n "<mechanism key terms>" .cursor/skills` before writing the brief; for this class of miss, `rg -n "model-family|independence" .cursor/skills/agent-quality-loop/references/multi-agent-leverage.md`
**Scope:** project
**Status:** active
**Applies when:** Compiling outside sources (papers, other agent frameworks, competitor teardowns, market scans) into proposed changes to this repo's skills

### 2026-08-10 — Keep one deploy form per host, and keep non-live copies out of the skills root

**Trigger:** Installing or refreshing local Cursor/Codex installs of this package on Windows
**Root cause:** Three separate symptoms, one cause — the deployed tree was allowed to hold exceptions. `~/.cursor/skills/<name>` junctions once targeted the Codex mirror `.agents/skills/`, so Cursor read stale files after edits to the authoritative `.cursor/skills/`. `~/.codex/skills/skill-factory` was left a junction into `.agents` while its three siblings were real copies, so a generic clear-and-copy refresh wrote through the link and emptied the repo's source file. A dated backup tree left inside `~/.codex/skills/` stayed agent-discoverable and shadowed the live skills with a pre-change version.
**Rule:** One form per host with no exceptions — Cursor side junctions onto `.cursor/skills/<name>`, Codex side real copies from `.agents/skills/<name>`. After skill edits run `.cursor` → `.agents` sync, then refresh the Codex copies; never hand-edit `.agents`. Keep backups and retired versions outside any skills discovery root, because an agent will load them as live skills.
**Evidence:** 2026-08-10 junctions retargeted `.agents` → `.cursor`, validators PASS. 2026-08-11 a refresh loop cleared the `skill-factory` junction and emptied `.agents/skills/skill-factory/SKILL.md`; same session, an attached `agent-quality-loop` resolved to `~/.codex/skills/_backup-aaca-20260810-140920/` whose `review-gate` had no `Finding Severity` section. Both exceptions removed 2026-08-11.
**Evidence to read:** `Get-ChildItem "$env:USERPROFILE\.codex\skills" -Force | ForEach-Object { $_.Name, $_.LinkType }` — every entry from this repo must show a blank `LinkType`, and no `_backup*` entry may exist; then the same listing for `~/.cursor/skills`, where each must be a `Junction` onto `.cursor/skills`
**Scope:** project
**Status:** active
**Applies when:** Installing, refreshing, or backing up this repo's skills into user-level Cursor/Codex on Windows, or diagnosing “the agent is not seeing my skill edits”

### 2026-08-10 — Forward-test skill changes across the executor model matrix

**Trigger:** Behavioral forward-testing after changing SKILL/reference text
**Root cause:** A flagship-only probe samples one compliance regime; cheaper executor models are the ones most at risk of mechanical misreads, and single-tier tests miss cross-model routing variance
**Rule:** Run the same blinded probe on at least one flagship + one mid + one budget executor model; compare invariant compliance and note any label/routing variance
**Evidence:** 2026-08-10 tri-model blind probe (flagship/grok/composer) on a contradictory narrative request: all invariants held on all tiers; the align-vs-evidence mode-label variance surfaced only through the matrix
**Evidence to read:** Re-run the same blinded probe from `references/evaluation-cases.md` on one flagship + one mid + one budget executor; compare invariant compliance and mode-label variance across the three transcripts
**Scope:** project
**Status:** active
**Applies when:** Forward-testing changes to agent-quality-loop, its adapters, or references before declaring them accepted
