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
   - **Decay / archive (RETRO)** — every entry carries `last_fired` (`YYYY-MM-DD` or `never`) and may use `status: archived`. During RETRO, set `status: archived` when a lesson has not matched for **90 consecutive days** or has never matched inside the most recent **10** ALIGN injection windows. `archived` entries stay in this file for manual revival but do **not** participate in ALIGN injection or ACCEPT recidivism checks. Reviving means setting `status: active` and updating `last_fired` when it next matches. On a successful ALIGN inject of an `active` lesson, patch `last_fired` to today's date.
6. **Status and scope on every entry** — each lesson carries `status` (`active` | `merged` | `promoted` | `expired` | `archived`), `scope` (`project` | `global`), and `last_fired` (`YYYY-MM-DD` | `never`). New writes to this file default to `scope: project`, `status: active`, and `last_fired: never`.
7. **Active cap** — prefer ≤ **30** `active` entries. When over the cap, **merge** near-duplicates, **expire** stale ones, or **archive** by the decay rule before adding more; do not grow an unbounded list.
8. **Promotion on recurrence** — if the same lesson recurs ≥ **2** times (same trigger/root cause), promote via **skill-factory** into a rule/skill (or other durable mechanism) change; mark the lesson `promoted` and link the resulting artifact.
9. **Harvest triggers** — RETRO and Self-QA may produce candidates (or direct writes when policy §5 allows). Global candidates follow the same template and cite this format; no migration tooling in this change.
10. **Evidence to read is required** — every entry must name a concrete retrieval surface (file, command, or output) to check first when the trigger reappears; vague “be careful” text does not satisfy the field.
11. **Applies-when match before inject** — Before ALIGN injects an `active` lesson, compare that entry's `Applies when` to the current task. On mismatch: skip inject this round; in RETRO emit one sentence marking it `retire_candidate`. Skip `archived` (and non-`active`) entries entirely. The only allowed date field for decay is `last_fired`; do not add hit counters or other date ledgers (runtime writeback goes stale).
12. **Field-level patch only** — Merge, expire, archive, and revise by patching named fields on the affected entry. Never rewrite this file wholesale (a full-file rewrite silently erases other entries).
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
**Status:** active | merged | promoted | expired | archived
**Last fired:** YYYY-MM-DD | never
**Applies when:** Trigger conditions for reuse

<!-- Optional equivalents (may mirror fields above): -->
<!-- **Context:** same role as Trigger / area -->
<!-- **Lesson:** same role as Rule (one paragraph) -->
```

---

## Lessons

<!-- Add entries below. Keep newest active entries near the top of the Lessons section. -->

### 2026-08-12 — Copy-paste instructions are release-grade: verify external CLI flags or mark them unverified

**Trigger:** Writing commands for another executor (human or agent) to run against an external CLI or service
**Root cause:** A maintainer instruction pack included `npx skills add … --dry-run` on the assumption that a dry-run flag exists by convention. The CLI silently ignores unknown flags and executed a real install — an unintended side effect delivered through an instruction block that looked authoritative. Grounding rung 3 (authoritative sources over model memory) applies to outgoing instructions exactly as it applies to incoming premises.
**Rule:** Any command handed to another executor is a release-grade artifact: verify flags against the tool's own `--help` or docs first, or explicitly mark the line "unverified — run --help first". Never assume a safety flag (dry-run, no-op, list) exists; prefer the tool's confirmed read-only form (here: `-l`).
**Evidence:** 2026-08-12 local execution report: "CLI help 无 --dry-run；该参数被忽略并实际执行了安装。只列清单应使用 -l。"
**Evidence to read:** The local executor's verbatim step-6 output; `npx skills --help`
**Scope:** project
**Status:** active
**Last fired:** 2026-08-12
**Applies when:** Writing instruction packs, dispatch briefs, or docs that contain runnable commands against external tools

### 2026-08-12 — Re-verify PR and base state before every push in a long session

**Trigger:** Pushing additional commits to a PR branch during a long turn, or mutating a PR's title, body, or status
**Root cause:** A PR's state is a remote fact that changes without notice: the user squash-merged the open PR mid-session while the agent kept pushing six commits to the merged PR's branch. GitHub accepts those pushes and body edits silently, and pull_request workflows stop triggering because a merged PR emits no synchronize events — locally misread as a CI outage, costing a diagnostic detour (a workflow-file revert) aimed at the wrong cause.
**Rule:** Before each push or PR mutation after any pause, re-read the PR state (`gh pr view --json state,mergeStateStatus`). If merged or closed: stop; branch new work off the updated base, cherry-pick, and open a fresh PR; verify squash fidelity (`git diff <merge-commit> <old-head>` empty) so prior acceptance transfers to the base; restore the merged PR's description to its merged scope.
**Evidence:** The runs list showed pull_request runs only through `bf8e5ff`; later heads had no github-actions check suite at all; `gh pr view 7` returned `state: MERGED` with master at `af32b1b`, byte-identical to `bf8e5ff`.
**Evidence to read:** `gh pr view <n> --json state` before pushing; `git diff <merge-commit> <old-head> --stat` for squash parity
**Scope:** project
**Status:** active
**Last fired:** 2026-08-12
**Applies when:** Long-running turns that push repeatedly to a PR branch, resume after user activity, or interpret sudden CI silence on pushes

### 2026-08-12 — Budget-tier single-shot compile can fabricate a missing referent despite explicit prose

**Trigger:** Relying on ALIGN grounding prose alone to stop a cheap executor model from "making the request true" when a named referent does not exist as described
**Root cause:** On budget tiers the instruction-following prior "user asked for an edit, produce the edit" outcompetes mid-paragraph prose. The model performs the grounding read, observes the premise is false, then fabricates the referent and discloses only after the edit — compliance fails at action selection, not at information gathering. Strengthening and repositioning the prose did not change the behavior (two identical failures across rule revisions), consistent with the closed-branch lesson that semantic gates cannot be forced mechanically or rhetorically.
**Rule:** Treat grounding compliance as tier-dependent. Flagship/mid single-shot responses may be trusted to disclose-before-edit; budget tiers must run inside the full loop — where self-QA `verification_performed` and acceptance `goal_fidelity` check the user-observable outcome and a fabricated referent should fail both (containment by design; that catch itself was not probed this round) — or receive the compiled contract from a stronger compiler instead of compiling themselves. After two same-shape failures, stop stacking ALIGN prose; the residual is a routing decision, not a wording decision.
**Evidence:** 2026-08-12 blind fixture probes (config.json without a timeout field; the real value in settings/runtime.yaml; fixture hashes diffed before/after every run): grok mid-tier PASS (three-line premise disclosure, blocked badge, one question), gpt flagship PASS (personalization firewall), kimi PASS twice (lexicon hit and quoted-title miss), composer budget FAIL twice (fabricated `"timeout": 60` both before and after the rule was strengthened; disclosure only post-edit).
**Evidence to read:** Re-run evaluation case 45 Scenario A as a blind fixture probe on one budget-tier executor; diff fixture hashes and check whether disclosure preceded any edit
**Scope:** project
**Status:** active
**Last fired:** 2026-08-12
**Applies when:** Choosing executor tiers for compile-sensitive work, weighing trust in a single-shot budget-tier response, or proposing further prose hardening after repeated same-shape grounding failures

### 2026-08-12 — Acceptance evidence must bind the exact shipped bytes

**Trigger:** Producing or consuming an acceptance/verification report for an artifact that is regenerated, committed, or installed after the verification ran
**Root cause:** Commit-time regeneration (sync-skills rewrites every manifest with a fresh `generated_at`) changes bytes after verification. The report's hashes then describe a pre-push state that survives only inside the report, and local installs refreshed before the regeneration silently sit one step behind the pushed tree.
**Rule:** Order the endgame as regenerate → verify → report, with nothing mutating afterward — or commit first and verify the pushed SHA. Every acceptance report must name the commit or tree it verified, and local installs are refreshed after the final commit, never before.
**Evidence:** The v2.2 completion report cited manifest SHA-256 `BB1C831E…` and "source, mirror, installed byte-identical"; pushed `35821c3` contains manifests regenerated at `2026-08-12T04:00:16Z`, seconds before the commit, with actual SHA-256 `d376a8ab…`. The cloud re-acceptance had to supersede the reported hash before it could proceed.
**Evidence to read:** `git log -1 --format=%H` against the commit named in the report, then a fresh `sha256sum` of each shipped `manifest.json` against the report's value
**Scope:** project
**Status:** active
**Last fired:** 2026-08-12
**Applies when:** Writing or trusting acceptance, release-readiness, or install-parity claims for artifacts that get regenerated, committed, or installed after verification

### 2026-08-11 — A repository's publishable surface is larger than its working tree

**Trigger:** Auditing a repository for private content before making it public, or before any handoff that exposes history
**Root cause:** A content scan targets the artifact you picture — files. But git publishes several surfaces that hold no file content and are therefore invisible to that scan: commit messages, author and committer name/email, branch and tag names, and, on a forge, the issue and pull-request threads attached to the repo. Each is written casually, by different actors, at different times, which is exactly why private context settles there.
**Rule:** Enumerate publishable surfaces before scanning, then scan each one: blob content across all refs, commit messages, author/committer identity, ref names, and forge-side issues and pull requests. A clean file scan is evidence about files only — do not report it as evidence about the repository.
**Evidence:** 2026-08-11 a full-object scan of 177 blobs across all refs reported no private-project references; an independent read then found a prior private product name in commit message `fa4a30d` (subject: strip that product's remaining references). The same scan had also missed that four commits carried personal emails in author metadata rather than in any file.
**Evidence to read:** `git log --all --format='%s%n%b'` and `git log --all --format='%an <%ae>|%cn <%ce>' | sort -u`, then the forge's issue and pull-request list — run these alongside, never instead of, the blob scan
**Scope:** project
**Status:** active
**Last fired:** never
**Applies when:** Preparing any repository for publication, open-sourcing, external handoff, or a visibility change from private to public

### 2026-08-11 — Correcting an inventory means re-deriving it, not patching the row you were told about

**Trigger:** Fixing a document that enumerates things — a layout table, a file list, a field or option list — after a reviewer names one wrong item
**Root cause:** A named defect silently redefines the scope of the repair. The reviewer reported the row they happened to check, not the set of rows that are wrong, so accepting their report as the boundary inherits their sampling. An inventory is also the one kind of claim whose correctness turns on what is *absent*, and absence is unreadable from inside the artifact — it surfaces only when the artifact is compared against an independently enumerated source.
**Rule:** When a correction targets an inventory, re-enumerate the actual repository surface (including current untracked deliverables) and diff that against the document, then repair the whole delta in one pass. Never edit only the row that was named.
**Evidence:** 2026-08-11 commit `9c61daa` ("Describe the knowledge directory's actual contents in the layout table") fixed the single `.ai/knowledge/` row a blind read had flagged and shipped a README layout table still missing `scripts/`, `CONTRIBUTING.md`, and `.github/` — the last created two commits earlier in the same session. A later probe that enumerated `git ls-files` *before* opening the README found all three.
**Evidence to read:** `git ls-files | ForEach-Object { ($_ -split '/')[0] } | Sort-Object -Unique`, diffed against the `## Repository layout` table in `README.md` — every tracked top-level path must appear there or be excluded on purpose
**Scope:** project
**Status:** active
**Last fired:** 2026-08-11
**Applies when:** Correcting any document that enumerates files, directories, fields, options, or steps — especially when the correction request named exactly one wrong item

### 2026-08-11 — Deterministic hooks cannot enforce a semantic gate; that branch is closed

**Trigger:** Proposing runtime hooks (Cursor/Codex) to turn this suite's quality gates from convention into enforcement
**Root cause:** A hook is a semantics-blind script fired on an event. It can enforce that a procedure happened; it can never enforce that a judgment was right. Every first-principles goal of this suite — intent fidelity, directive compilation, denoising, non-mechanical execution, goal-anchored acceptance, failure harvest — is a judgment-quality goal, so hook coverage of them is ~zero. Enforcing procedure on a semantic gate is worse than neutral: it manufactures ritual compliance, because the model optimizes for the check rather than the goal.
**Rule:** Do not build hooks to harden goal fidelity, semantic acceptance, or ALIGN / EXECUTE / ACCEPT / RETRO judgment gates. Hooks may only block mechanically decidable envelope predicates: the action-authority ceiling, an empty `evidence_refs` array at a completion-class phase, or missing current-turn release authorization. They must not treat any non-empty `evidence_refs` array as sufficient evidence or acceptance.
**Evidence:** 2026-08-11 blind probes on one executor tier: two scenarios with near-identical mechanical signatures (both edited `list.test.js` and `docs/acceptance/order-list.md`) required opposite verdicts — `blocker` for ruler movement vs. legitimate contract sync. The only discriminator was a disclosed mid-task user clarification, which no hook can read; the model judged both correctly after one paragraph of rule text. 2026-08-11 `integrations/cursor-hooks/` implemented only authority and empty-evidence structural predicates; its independent review recurrence required this boundary to be restated and covered by protocol tests.
**Evidence to read:** Read cases 37 and 38 in `.cursor/skills/agent-quality-loop/references/evaluation-cases.md` side by side, then `integrations/cursor-hooks/README.md` and `node integrations/cursor-hooks/test.js`; any mechanism that cannot separate the cases cannot serve as a semantic quality gate
**Scope:** project
**Status:** active
**Last fired:** 2026-08-11
**Applies when:** Evaluating runtime hooks, harness-level enforcement, or any deterministic pre/post-action gate as a way to strengthen this suite's quality loop

### 2026-08-11 — Reconcile external research against this repo before it becomes a plan item

**Trigger:** Turning market research, papers, or competitor teardowns into an iteration plan for these skills
**Root cause:** Research returns mechanisms phrased in the source's vocabulary, so matching them against the repo from memory misses text that already says the same thing in different words. The resulting phantom gap is worse than wasted effort: it consumes change budget, adds diff noise, and under a net-line cap it pressures the executor to delete load-bearing text to fund an addition that changes no behavior.
**Rule:** Every research-derived item must cite a repo grep before it enters a plan — quote the existing line and then drop or narrow the item, or quote the absence. Put the `file:line` in the brief so the executor can reject a duplicate instead of implementing it.
**Evidence:** 2026-08-11 plan item S5 "cross-model-family acceptor independence" was cut after `multi-agent-leverage.md:72` turned out to already read "ACCEPT prefers acceptor context/model-family distinct from the implementer when the host can supply it; record actual `acceptance_independence` honestly." An adversarial falsifier probe caught it, not the author.
**Evidence to read:** For each research-derived item, `rg -n "<mechanism key terms>" .cursor/skills` before writing the brief; for this class of miss, `rg -n "model-family|independence" .cursor/skills/agent-quality-loop/references/multi-agent-leverage.md`
**Scope:** project
**Status:** active
**Last fired:** never
**Applies when:** Compiling outside sources (papers, other agent frameworks, competitor teardowns, market scans) into proposed changes to this repo's skills

### 2026-08-10 — Keep one deploy form per host, and keep non-live copies out of the skills root

**Trigger:** Installing or refreshing local Cursor/Codex installs of this package on Windows
**Root cause:** Three separate symptoms, one cause — the deployed tree was allowed to hold exceptions. `~/.cursor/skills/<name>` junctions once targeted the Codex mirror `.agents/skills/`, so Cursor read stale files after edits to the authoritative `.cursor/skills/`. `~/.codex/skills/skill-factory` was left a junction into `.agents` while its three siblings were real copies, so a generic clear-and-copy refresh wrote through the link and emptied the repo's source file. A dated backup tree left inside `~/.codex/skills/` stayed agent-discoverable and shadowed the live skills with a pre-change version.
**Rule:** One form per host with no exceptions — maintainer Cursor live links point to `.cursor/skills/<name>`, while the public installer and Codex use real snapshots from generated `.agents/skills/<name>`. The installer must refuse to replace an existing link. After skill edits run `.cursor` → `.agents` sync, then refresh Codex snapshots; never hand-edit `.agents`. Keep backups and retired versions outside any skills discovery root, because an agent will load them as live skills.
**Evidence:** 2026-08-10 junctions retargeted `.agents` → `.cursor`, validators PASS. 2026-08-11 a refresh loop cleared the `skill-factory` junction and emptied `.agents/skills/skill-factory/SKILL.md`; same session, an attached `agent-quality-loop` resolved to `~/.codex/skills/_backup-aaca-20260810-140920/` whose `review-gate` had no `Finding Severity` section. Both exceptions removed 2026-08-11.
**Evidence to read:** `Get-ChildItem "$env:USERPROFILE\.codex\skills" -Force | ForEach-Object { $_.Name, $_.LinkType }` — every entry from this repo must show a blank `LinkType`, and no `_backup*` entry may exist; then the same listing for `~/.cursor/skills`, where each must be a `Junction` onto `.cursor/skills`
**Scope:** project
**Status:** active
**Last fired:** 2026-08-11
**Applies when:** Installing, refreshing, or backing up this repo's skills into user-level Cursor/Codex on Windows, or diagnosing “the agent is not seeing my skill edits”

### 2026-08-10 — Forward-test skill changes across the executor model matrix

**Trigger:** Behavioral forward-testing after changing SKILL/reference text
**Root cause:** A flagship-only probe samples one compliance regime; cheaper executor models are the ones most at risk of mechanical misreads, and single-tier tests miss cross-model routing variance
**Rule:** Run the same blinded probe on at least one flagship + one mid + one budget executor model; compare invariant compliance and note any label/routing variance
**Evidence:** 2026-08-10 tri-model blind probe (flagship/grok/composer) on a contradictory narrative request: all invariants held on all tiers; the align-vs-evidence mode-label variance surfaced only through the matrix
**Evidence to read:** Re-run the same blinded probe from `references/evaluation-cases.md` on one flagship + one mid + one budget executor; compare invariant compliance and mode-label variance across the three transcripts
**Scope:** project
**Status:** active
**Last fired:** never
**Applies when:** Forward-testing changes to agent-quality-loop, its adapters, or references before declaring them accepted
