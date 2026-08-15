#!/usr/bin/env node

"use strict";

/**
 * Read-only diagnostic for AQL install / workspace health.
 *
 * Default: diagnose cwd (or --root). Never mutates history, profile, hooks, or projects.
 * --json: machine-readable report
 * --self-test: cheap smoke that doctor itself runs (safe for validate-all)
 */

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { checkManifestConsistency, listPackageSkillDirs, MANIFEST_VERSION } = require("./gen-manifest");
const { routePackageNames, ROUTE_PARENT, ROUTE_SHIMS_DIST } = require("./package-catalog");

const STATUS = {
  PASS: "PASS",
  WARN: "WARN",
  FAIL: "FAIL",
  NOT_APPLICABLE: "NOT_APPLICABLE",
};

const CORE_HINT = ["agent-quality-loop", "ask-plan-code-qa", "review-gate", "skill-factory"];

function finding(id, status, message, detail = null) {
  const item = { id, status, message };
  if (detail !== null && detail !== undefined) item.detail = detail;
  return item;
}

function resolveWorkspaceRoot(argv) {
  const rootFlag = argv.find((arg) => arg.startsWith("--root="));
  if (rootFlag) return path.resolve(rootFlag.slice("--root=".length));
  const idx = argv.indexOf("--root");
  if (idx >= 0 && argv[idx + 1]) return path.resolve(argv[idx + 1]);
  return process.cwd();
}

function packageRepoRoot() {
  return path.resolve(__dirname, "..");
}

function readJsonSafe(filePath) {
  try {
    return { ok: true, value: JSON.parse(fs.readFileSync(filePath, "utf8")) };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

function findSkillTrees(workspaceRoot) {
  const candidates = [
    path.join(workspaceRoot, ".cursor", "skills"),
    path.join(workspaceRoot, ".agents", "skills"),
    path.join(workspaceRoot, "skills"),
  ];
  return candidates.filter((dir) => fs.existsSync(dir));
}

function checkCorePackageVersions(workspaceRoot) {
  const trees = findSkillTrees(workspaceRoot);
  if (trees.length === 0) {
    return [
      finding(
        "core_versions",
        STATUS.WARN,
        "no .cursor/skills, .agents/skills, or skills/ tree found in workspace",
      ),
    ];
  }

  const findings = [];
  const versions = {};
  for (const tree of trees) {
    const label = path.relative(workspaceRoot, tree) || tree;
    let packages = [];
    try {
      packages = listPackageSkillDirs(tree).map((dir) => path.basename(dir));
    } catch (error) {
      findings.push(finding("core_versions", STATUS.FAIL, `${label}: ${error.message}`));
      continue;
    }
    for (const name of packages) {
      if (!CORE_HINT.includes(name) && !name.startsWith("aql-")) continue;
      const manifestPath = path.join(tree, name, "manifest.json");
      if (!fs.existsSync(manifestPath)) {
        findings.push(finding("core_versions", STATUS.WARN, `${label}/${name}: missing manifest.json`));
        continue;
      }
      const parsed = readJsonSafe(manifestPath);
      if (!parsed.ok) {
        findings.push(finding("core_versions", STATUS.FAIL, `${label}/${name}: invalid manifest (${parsed.error})`));
        continue;
      }
      const version = parsed.value.version;
      versions[`${label}/${name}`] = version;
      if (typeof version !== "string" || !version.trim()) {
        findings.push(finding("core_versions", STATUS.FAIL, `${label}/${name}: manifest.version missing`));
      }
    }
  }

  const coreVersions = Object.entries(versions).filter(([key]) => CORE_HINT.some((n) => key.endsWith(`/${n}`) || key.endsWith(`\\${n}`) || key.includes(`/${n}`)));
  const unique = [...new Set(coreVersions.map(([, v]) => v))];
  if (coreVersions.length === 0) {
    findings.push(finding("core_versions", STATUS.WARN, "no core skill manifests found", { versions }));
  } else if (unique.length > 1) {
    findings.push(
      finding("core_versions", STATUS.WARN, `core skill versions differ: ${unique.join(", ")}`, { versions }),
    );
  } else {
    findings.push(
      finding("core_versions", STATUS.PASS, `core/package versions observed: ${unique[0]}`, { versions }),
    );
  }
  return findings;
}

function checkRouteParentDependencies(workspaceRoot) {
  const distRoot = path.join(workspaceRoot, ROUTE_SHIMS_DIST);
  if (!fs.existsSync(distRoot)) {
    return [
      finding(
        "route_depends_on",
        STATUS.NOT_APPLICABLE,
        `${ROUTE_SHIMS_DIST} not present (consumer install or routes not generated)`,
      ),
    ];
  }

  const findings = [];
  let checked = 0;
  for (const host of ["cursor", "agents", "plugins"]) {
    const hostRoot = path.join(distRoot, host);
    if (!fs.existsSync(hostRoot)) continue;
    for (const name of fs.readdirSync(hostRoot)) {
      const manifestPath = path.join(hostRoot, name, "manifest.json");
      if (!fs.existsSync(manifestPath)) continue;
      checked += 1;
      const parsed = readJsonSafe(manifestPath);
      if (!parsed.ok) {
        findings.push(finding("route_depends_on", STATUS.FAIL, `${host}/${name}: ${parsed.error}`));
        continue;
      }
      const deps = parsed.value.depends_on;
      if (!Array.isArray(deps) || !deps.includes(ROUTE_PARENT)) {
        findings.push(
          finding(
            "route_depends_on",
            STATUS.FAIL,
            `${host}/${name}: depends_on must include ${ROUTE_PARENT}`,
            { depends_on: deps || null },
          ),
        );
      }
    }
  }

  if (checked === 0) {
    return [finding("route_depends_on", STATUS.WARN, "dist/route-shims present but no route manifests found")];
  }
  if (findings.length === 0) {
    findings.push(
      finding("route_depends_on", STATUS.PASS, `route manifests declare depends_on ${ROUTE_PARENT} (${checked} checked)`),
    );
  }
  return findings;
}

function checkManifestHelpers(workspaceRoot) {
  const trees = findSkillTrees(workspaceRoot);
  if (trees.length === 0) {
    return [finding("manifest_consistency", STATUS.NOT_APPLICABLE, "no skill trees to hash-check")];
  }

  const errors = [];
  for (const tree of trees) {
    let packages = [];
    try {
      packages = listPackageSkillDirs(tree);
    } catch (error) {
      errors.push(`${tree}: ${error.message}`);
      continue;
    }
    for (const pkgDir of packages) {
      if (!fs.existsSync(path.join(pkgDir, "manifest.json"))) continue;
      errors.push(...checkManifestConsistency(pkgDir).map((e) => `${path.basename(pkgDir)}: ${e}`));
    }
  }

  if (errors.length > 0) {
    return [finding("manifest_consistency", STATUS.FAIL, "manifest hash mismatches", { errors })];
  }
  return [finding("manifest_consistency", STATUS.PASS, "manifest hashes consistent where manifests exist")];
}

function checkHooksAndGates(workspaceRoot) {
  const findings = [];
  const templateHooks = path.join(packageRepoRoot(), "integrations", "cursor-hooks", "hooks.json");
  const projectHooks = path.join(workspaceRoot, ".cursor", "hooks.json");
  const gatesPath = path.join(workspaceRoot, "integrations", "cursor-hooks", "gates.config.json");
  const templateGates = path.join(packageRepoRoot(), "integrations", "cursor-hooks", "gates.config.json");

  if (fs.existsSync(projectHooks)) {
    const parsed = readJsonSafe(projectHooks);
    if (!parsed.ok) {
      findings.push(finding("hooks_json", STATUS.FAIL, `.cursor/hooks.json unreadable: ${parsed.error}`));
    } else {
      const events = parsed.value.hooks && typeof parsed.value.hooks === "object" ? Object.keys(parsed.value.hooks) : [];
      findings.push(
        finding("hooks_json", STATUS.PASS, "project .cursor/hooks.json present", { events }),
      );
    }
  } else if (workspaceRoot === packageRepoRoot() && fs.existsSync(templateHooks)) {
    findings.push(
      finding(
        "hooks_json",
        STATUS.WARN,
        "package ships integrations/cursor-hooks/hooks.json template; project .cursor/hooks.json not enabled (opt-in)",
      ),
    );
  } else {
    findings.push(
      finding("hooks_json", STATUS.NOT_APPLICABLE, "no project .cursor/hooks.json (hooks remain opt-in)"),
    );
  }

  const gatesFile = fs.existsSync(gatesPath) ? gatesPath : templateGates;
  if (fs.existsSync(gatesFile)) {
    const parsed = readJsonSafe(gatesFile);
    if (!parsed.ok) {
      findings.push(finding("gates_config", STATUS.FAIL, `gates.config.json invalid: ${parsed.error}`));
    } else {
      const mode = {
        writeTools: Array.isArray(parsed.value.writeTools) ? parsed.value.writeTools.length : 0,
        hasExternalWritePattern: typeof parsed.value.externalWriteCommandPattern === "string",
        source: path.relative(workspaceRoot, gatesFile) || gatesFile,
      };
      findings.push(finding("gates_config", STATUS.PASS, "gates.config.json readable", mode));
    }
  } else {
    findings.push(finding("gates_config", STATUS.NOT_APPLICABLE, "gates.config.json not found"));
  }

  return findings;
}

function checkMcpPolicyCoverage(workspaceRoot) {
  // Hooks writeTools list does not cover MCP/Tab/network tools — disclose honestly.
  const gatesCandidates = [
    path.join(workspaceRoot, "integrations", "cursor-hooks", "gates.config.json"),
    path.join(packageRepoRoot(), "integrations", "cursor-hooks", "gates.config.json"),
  ];
  const gatesFile = gatesCandidates.find((p) => fs.existsSync(p));
  if (!gatesFile) {
    return [finding("mcp_policy", STATUS.NOT_APPLICABLE, "no gates.config.json to summarize MCP coverage")];
  }
  const parsed = readJsonSafe(gatesFile);
  if (!parsed.ok) {
    return [finding("mcp_policy", STATUS.FAIL, `cannot read gates for MCP summary: ${parsed.error}`)];
  }
  const writeTools = Array.isArray(parsed.value.writeTools) ? parsed.value.writeTools : [];
  const mcpNamed = writeTools.filter((t) => /mcp/i.test(String(t)));
  return [
    finding(
      "mcp_policy",
      STATUS.WARN,
      "MCP / Tab / network tools outside writeTools are not covered by the authority gate (by design)",
      {
        writeToolsCount: writeTools.length,
        mcpNamedInWriteTools: mcpNamed,
        coverage: "partial — explicit write-tool list only",
      },
    ),
  ];
}

function checkUserProfileOptIn() {
  const homeKnowledge = path.join(os.homedir(), ".ai", "knowledge");
  if (fs.existsSync(homeKnowledge)) {
    return [
      finding(
        "user_profile_opt_in",
        STATUS.WARN,
        "~/.ai/knowledge exists (user-level opt-in path present); doctor did not read or modify it",
        { path: homeKnowledge },
      ),
    ];
  }
  return [
    finding(
      "user_profile_opt_in",
      STATUS.NOT_APPLICABLE,
      "~/.ai/knowledge absent (installer never seeds user-level knowledge; opt-in only)",
    ),
  ];
}

function checkProjectProfileCarrier(workspaceRoot) {
  const profilePath = path.join(workspaceRoot, ".ai", "knowledge", "collaboration-profile.md");
  if (!fs.existsSync(profilePath)) {
    return [finding("project_profile_carrier", STATUS.NOT_APPLICABLE, "project collaboration profile not present")];
  }
  const validators = [
    path.join(workspaceRoot, ".cursor", "skills", "agent-quality-loop", "scripts", "validate-profile.js"),
    path.join(workspaceRoot, "skills", "agent-quality-loop", "scripts", "validate-profile.js"),
    path.join(workspaceRoot, ".agents", "skills", "agent-quality-loop", "scripts", "validate-profile.js"),
    path.join(packageRepoRoot(), ".cursor", "skills", "agent-quality-loop", "scripts", "validate-profile.js"),
  ];
  const validatorPath = validators.find((candidate) => fs.existsSync(candidate));
  if (!validatorPath) {
    return [finding("project_profile_carrier", STATUS.FAIL, "project profile exists but validate-profile.js was not found")];
  }
  try {
    const { readProfile } = require(validatorPath);
    const result = readProfile(profilePath);
    if (result.errors.length > 0) {
      return [finding("project_profile_carrier", STATUS.FAIL, "project profile has invalid canonical entries", { errors: result.errors })];
    }
    const status = result.legacy.length > 0 ? STATUS.WARN : STATUS.PASS;
    return [finding(
      "project_profile_carrier",
      status,
      `project profile readable: ${result.projectable.length} active projectable, ${result.inactive.length} complete inactive, ${result.legacy.length} legacy/incomplete`,
    )];
  } catch (error) {
    return [finding("project_profile_carrier", STATUS.FAIL, `cannot validate project profile: ${error.message}`)];
  }
}

function checkEnvelopeChain(workspaceRoot) {
  const aqlDir = path.join(workspaceRoot, ".agent-quality-loop");
  if (!fs.existsSync(aqlDir)) {
    return [
      finding(
        "envelope_chain",
        STATUS.NOT_APPLICABLE,
        "no .agent-quality-loop directory (no local envelope chain to validate)",
      ),
    ];
  }

  let snapshotChain;
  const skillCandidates = [
    path.join(workspaceRoot, ".cursor", "skills", "agent-quality-loop", "scripts", "snapshot-chain.js"),
    path.join(workspaceRoot, "skills", "agent-quality-loop", "scripts", "snapshot-chain.js"),
    path.join(workspaceRoot, ".agents", "skills", "agent-quality-loop", "scripts", "snapshot-chain.js"),
    path.join(packageRepoRoot(), ".cursor", "skills", "agent-quality-loop", "scripts", "snapshot-chain.js"),
  ];
  const modulePath = skillCandidates.find((p) => fs.existsSync(p));
  if (!modulePath) {
    return [finding("envelope_chain", STATUS.FAIL, ".agent-quality-loop present but snapshot-chain.js not found")];
  }

  try {
    snapshotChain = require(modulePath);
  } catch (error) {
    return [finding("envelope_chain", STATUS.FAIL, `cannot load snapshot-chain: ${error.message}`)];
  }

  const contractIds = new Set();
  const currentPath = path.join(aqlDir, "envelope.json");
  if (fs.existsSync(currentPath)) {
    const parsed = readJsonSafe(currentPath);
    if (parsed.ok && typeof parsed.value.contract_id === "string") {
      contractIds.add(parsed.value.contract_id);
    }
  }
  const historyDir = path.join(aqlDir, "history");
  if (fs.existsSync(historyDir)) {
    for (const name of fs.readdirSync(historyDir)) {
      if (!name.endsWith(".json")) continue;
      const parsed = readJsonSafe(path.join(historyDir, name));
      if (parsed.ok && typeof parsed.value.contract_id === "string") {
        contractIds.add(parsed.value.contract_id);
      }
    }
  }

  if (contractIds.size === 0) {
    return [
      finding("envelope_chain", STATUS.WARN, ".agent-quality-loop exists but no contract_id could be parsed"),
    ];
  }

  const findings = [];
  const repairPlan = [];
  for (const contractId of [...contractIds].sort()) {
    let chain;
    try {
      chain = snapshotChain.loadWorkspaceSnapshots(workspaceRoot, contractId);
    } catch (error) {
      findings.push(
        finding("envelope_chain", STATUS.FAIL, `contract ${contractId}: ${error.message}`),
      );
      continue;
    }

    const polluted = chain.pollutedFiles || [];
    const errors = chain.errors || [];
    const hasGap = errors.some((e) => /gap/i.test(e));
    const hasFork = errors.some((e) => /duplicate sequence|multiple sequence/i.test(e));
    const legacy = chain.status === "legacy_unordered";

    if (polluted.length > 0) {
      findings.push(
        finding("envelope_chain", STATUS.FAIL, `contract ${contractId}: polluted snapshots`, {
          pollutedFiles: polluted,
          status: chain.status,
        }),
      );
      repairPlan.push(
        `Inspect/quarantine polluted files for ${contractId} (do not auto-delete): ${polluted.join("; ")}`,
      );
    } else if (legacy) {
      findings.push(
        finding("envelope_chain", STATUS.WARN, `contract ${contractId}: legacy unordered snapshots`, {
          status: chain.status,
          errors,
        }),
      );
      repairPlan.push(
        `Re-emit snapshots via aql-envelope writer for ${contractId} to establish ordered chain metadata`,
      );
    } else if (chain.status !== "valid") {
      const kind = hasGap ? "gap" : hasFork ? "fork/duplicate" : "invalid";
      findings.push(
        finding("envelope_chain", STATUS.FAIL, `contract ${contractId}: chain ${kind}`, {
          status: chain.status,
          errors,
        }),
      );
      repairPlan.push(
        `Manual chain repair for ${contractId}: review history ordering (${kind}); doctor will not rewrite history`,
      );
    } else {
      findings.push(
        finding("envelope_chain", STATUS.PASS, `contract ${contractId}: ordered chain valid`, {
          nextSequence: chain.nextSequence,
          entries: (chain.entries || []).length,
        }),
      );
    }
  }

  if (repairPlan.length > 0) {
    findings.push(
      finding("envelope_chain_repair_plan", STATUS.WARN, "suggested repair plan (manual only)", {
        plan: repairPlan,
      }),
    );
  }
  return findings;
}

function aggregateStatus(findings) {
  if (findings.some((f) => f.status === STATUS.FAIL)) return STATUS.FAIL;
  if (findings.some((f) => f.status === STATUS.WARN)) return STATUS.WARN;
  if (findings.every((f) => f.status === STATUS.NOT_APPLICABLE)) return STATUS.NOT_APPLICABLE;
  return STATUS.PASS;
}

function runDoctor(workspaceRoot) {
  const findings = [
    ...checkCorePackageVersions(workspaceRoot),
    ...checkRouteParentDependencies(workspaceRoot),
    ...checkManifestHelpers(workspaceRoot),
    ...checkHooksAndGates(workspaceRoot),
    ...checkMcpPolicyCoverage(workspaceRoot),
    ...checkProjectProfileCarrier(workspaceRoot),
    ...checkUserProfileOptIn(),
    ...checkEnvelopeChain(workspaceRoot),
  ];

  return {
    tool: "aql-doctor",
    read_only: true,
    workspace: path.resolve(workspaceRoot),
    package_manifest_version: MANIFEST_VERSION,
    status: aggregateStatus(findings),
    findings,
    notes: [
      "Doctor never deletes history, modifies profile, enables hooks, escalates authority, or auto-fixes projects.",
      "Repair plan text is advisory only.",
    ],
  };
}

function runSelfTest() {
  // Cheap smoke: doctor module loads, report shape is valid, and diagnosing the
  // package repo does not throw. Full FAIL findings on dirty consumer projects
  // must not fail this self-test (so validate-all stays green).
  const report = runDoctor(packageRepoRoot());
  const errors = [];
  if (!report || typeof report !== "object") errors.push("report missing");
  if (report.tool !== "aql-doctor") errors.push("tool id mismatch");
  if (report.read_only !== true) errors.push("read_only must be true");
  if (!Array.isArray(report.findings) || report.findings.length === 0) {
    errors.push("expected non-empty findings");
  }
  for (const item of report.findings) {
    if (!item.id || !item.status || !item.message) {
      errors.push(`malformed finding: ${JSON.stringify(item)}`);
    }
    if (![STATUS.PASS, STATUS.WARN, STATUS.FAIL, STATUS.NOT_APPLICABLE].includes(item.status)) {
      errors.push(`invalid status ${item.status} on ${item.id}`);
    }
  }

  // Invoke CLI --json once to ensure argv path works.
  const cli = spawnSync(process.execPath, [__filename, "--json", "--root", packageRepoRoot()], {
    encoding: "utf8",
    shell: false,
  });
  if (cli.error) errors.push(`cli spawn error: ${cli.error.message}`);
  // Exit may be 1 if package has FAIL findings; self-test only requires JSON parse + shape.
  try {
    const parsed = JSON.parse(cli.stdout || "{}");
    if (parsed.tool !== "aql-doctor") errors.push("cli --json tool mismatch");
  } catch (error) {
    errors.push(`cli --json not parseable (exit ${cli.status}): ${error.message}`);
  }

  if (errors.length > 0) {
    for (const err of errors) console.error(`FAIL ${err}`);
    return 1;
  }
  console.log("PASS aql-doctor --self-test");
  return 0;
}

function printHuman(report) {
  console.log(`aql-doctor: ${report.status} (${report.workspace})`);
  console.log(`read_only=${report.read_only} package_manifest_version=${report.package_manifest_version}`);
  console.log("");
  for (const item of report.findings) {
    console.log(`${item.status} [${item.id}] ${item.message}`);
    if (item.detail) {
      const text = typeof item.detail === "string" ? item.detail : JSON.stringify(item.detail);
      console.log(`  detail: ${text}`);
    }
  }
  console.log("");
  for (const note of report.notes) console.log(`note: ${note}`);
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log("Usage: node scripts/aql-doctor.js [--json] [--root <dir>] | --self-test");
    console.log("Read-only diagnostics. Never mutates hooks, profile, envelope history, or projects.");
    return 0;
  }
  if (argv.includes("--self-test")) {
    return runSelfTest();
  }

  const workspaceRoot = resolveWorkspaceRoot(argv.filter((a) => a !== "--json"));
  const report = runDoctor(workspaceRoot);
  if (argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printHuman(report);
  }
  return report.status === STATUS.FAIL ? 1 : 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  runDoctor,
  runSelfTest,
  STATUS,
};
