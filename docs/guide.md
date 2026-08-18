# Agent Quality Loop Guide

## Core

AQL 3.1 is one Skill, `agent-quality-loop`. It compiles the request into one Task Contract containing the goal, scope, evidence, assurance, and authority for that task. Natural language remains the normal interface.

```text
request -> Task Contract -> proportionate work/evidence -> optional independent acceptance -> separately authorized release
```

Three boundaries hold: wording never escalates authority; completion claims need current evidence; acceptance is not release authority. A routine result leads with the conclusion and decisive evidence; internal lifecycle detail appears only when it changes the user's decision.

## Profile v2 And Capability Receipts

Profile v2 is a user-controlled optional default layer. `explicit_only` means unexpressed repeated behavior creates no candidate or persistent signal. Current-turn instructions override it, Fresh Mode suppresses it for the current task, and at most two relevant entries may enter the Task Contract's Guided portion. It cannot affect fixed constraints, evidence, authority, acceptance, or release.

The profile file and `node <SKILL_ROOT>/scripts/aql.js` are optional. Missing/unreadable profile data, an unavailable CLI, or no accessible user directory leaves ordinary AQL Core behavior in place. In a Capability Receipt, `profile_access` uses the same observation enum as every capability: `observed_true`, `observed_false`, or `not_run`. The CLI supports explicit profile management, migration, export/import, and a temporary Capability Receipt.

A Capability Receipt is mechanical: every field names an observed installer/host/configuration/probe source and reports `observed_true`, `observed_false`, or `not_run`. It is not profile data, a task truth, or a model self-description.

The profile format is portable only across supported agents that can access the same storage. It does not synchronize devices, cloud agents, containers, or remote workspaces. Use explicit export/import or a host-provided controlled mount.

## Local Profile CLI

The CLI is an optional local control plane. Help is static and read-only, so it works even when no profile or user directory is accessible:

```bash
node <SKILL_ROOT>/scripts/aql.js --help
node <SKILL_ROOT>/scripts/aql.js profile remember --help
```

An explicit memory lifecycle can be inspected and reversed:

```bash
node <SKILL_ROOT>/scripts/aql.js profile init --profile ./profile.json
node <SKILL_ROOT>/scripts/aql.js profile propose --profile ./profile.json --id concise --key result.concise --kind communication --value-text concise --applies-when "the task needs a result" --reference "task:instruction"
node <SKILL_ROOT>/scripts/aql.js profile confirm --profile ./profile.json --id concise --confirmation-ref "task:confirmed" --expected-revision 1
node <SKILL_ROOT>/scripts/aql.js profile enable --profile ./profile.json --expected-revision 2
node <SKILL_ROOT>/scripts/aql.js profile show --profile ./profile.json
node <SKILL_ROOT>/scripts/aql.js profile project --profile ./profile.json --context ./projection-context.json
node <SKILL_ROOT>/scripts/aql.js profile forget --profile ./profile.json --id concise --expected-revision 3
```

Use `remember` for a clear direct save; `propose` followed by `confirm` for an entry that needs confirmation. There is no implicit learning. Transfers are explicit and import should normally be checked first:

```bash
node <SKILL_ROOT>/scripts/aql.js profile export --profile ./profile.json --out ./profile-export.json
node <SKILL_ROOT>/scripts/aql.js profile import --profile ./profile.json --in ./profile-export.json --dry-run
node <SKILL_ROOT>/scripts/aql.js receipt --profile ./profile.json
```

The receipt reports observed capability states and sources; it does not prove task facts or profile application. The bundled [projection context contract](../.cursor/skills/agent-quality-loop/references/profile-projection.md#cli-projection-context) defines the task-local JSON used above. Profile projection affects only the Task Contract's Guided defaults.

## Installation Lifecycle

The AQL 3.1 source candidate lives on the `aql-3.1-candidate` branch and the `v3.1.0`
tag. Use a release tag when you require an immutable published artifact.
Node.js 22 is the tested CI baseline. Install only to the host targets you actually
use; choose `all` only for an intentional multi-host setup.

```bash
node --version
node scripts/install.js install --to agents --dry-run
node scripts/install.js install --to agents
node scripts/install.js status --to agents
node scripts/install.js update --to agents --dry-run
node scripts/install.js uninstall --to agents --dry-run
```

Installations are real-file snapshots. The installer writes an external ownership receipt containing the target, package/version, manifest digest, and file inventory. It refuses to replace or uninstall an unowned target, and blocks update/uninstall on drift. Uninstall never removes profile data.

For package-local controls, invoke `node <SKILL_ROOT>/scripts/aql.js`; there is no `npx aql` interface.

## Evidence

The 3.1 changes were checked by running them on one model and host pair (`cursor-grok-4.5-high-fast`): trigger and silence gates passed 8/8 and 8/8, and the candidate-acceptance gate passed its seven conditions under blind grading. The same suite's ablation returned `NO_LARGE_EFFECT_DETECTED` on goal correctness against a minimal kernel, so the Skill is not claimed to outperform a kernel. Runner-surface caveats stay disclosed in [the experiment records](experiments/aql-3.1/phase-c-results.md).

Historical Profile Projection v1 mechanism evidence is retained for audit. Its v1 A/B/C value control is `INVALID`; it does not support product-value claims. The [preregistered product screening](aql-3.0-product-screening-preregistration.md) and longitudinal-value verdicts remain `NOT_RUN`. Static validation, manifests, and receipts establish only their named mechanics.

External actions require a fresh, explicit current-turn authorization naming the target and operation. Independent acceptance is read-only and requires demonstrable context separation.
