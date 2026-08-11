# Prompt & Agent Design Patterns

This directory stores **public, generic, non-proprietary** prompt and agent design patterns for reuse across tools (Cursor, Claude, Codex, etc.).

## Policy

- **Allowed:** Abstract workflows, output contracts, review checklists, verification habits.
- **Forbidden:** Storing or reproducing leaked system prompt text, proprietary vendor prompts, or copy-paste of internal model instructions.

When adding content, write original summaries — link to public docs if needed, do not transcribe secrets.

---

## Patterns

### Progressive disclosure

Load minimal context first; pull detailed references only when the task requires them. Skills use short `SKILL.md` + optional `reference.md` instead of one giant prompt.

### Evidence-based progress reporting

Claims require proof: command output, file paths, diffs, or explicit **Not Verified**. Ban "should work" without checks.

### Explicit pause conditions

Define when the agent must stop: destructive ops, production, secrets, ambiguous scope, missing credentials. Pause beats guessing.

### Root-cause-first debugging

Reproduce → localize → identify cause → fix at source. Avoid masking symptoms in downstream layers.

### Smallest sufficient change

One problem, one minimal diff. No unrelated refactors, abstractions, or "while I'm here" edits.

### Assumption disclosure

When requirements are multi-interpretable, list assumptions before acting. Update plan if assumptions change.

### Review gates

Separate phases for assumption, context, plan, code, and QA review. Each finding needs Issue · Evidence · Risk · Suggested fix — not blanket approval.

### Eval-driven skill refinement

Every skill ships with ≥3 eval cases (happy, ambiguous, boundary/failure). Update cases when real sessions expose new failure modes; record durable lessons in `lessons.md`.

### Shared goal alignment (combat intent)

Before building, reconstruct the user's real intent (product-manager view) and co-build **one Unified Goal** both sides confirm — like distributing a combat intent so every actor executes toward the same outcome. A wrong goal costs more than any bug; do not build until aligned. Scale the alignment effort with risk and ambiguity (trivial → one-line restatement).

### Doubt Resolution

Resolve your own doubts first: read, search, reason to a real conclusion. Escalate only genuine, self-verified blockers grounded in full context — never a reflexive "the process says ask," a model hallucination, or a perfunctory question. Stop short of over-analysis beyond what the decision needs.

### Result-oriented delivery

Deliver a real, root-cause result — never a half-product, scope creep, or show-off code. Apply Occam: the simplest sufficient change. Verify the outcome against the original goal, not just against the diff.

### Stage-wise, model-agnostic delegation

A task's stages (align · plan · execute · review) may run on different models — e.g. a strong model plans, a cheaper model executes — as **examples only, never hardcoded**. The workflow stays model-agnostic; the executor still understands the goal and may surface a better path or a gap missed earlier.
