#!/usr/bin/env node

"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  MANIFEST_NAME,
  MANIFEST_VERSION,
  checkManifestConsistency,
  writeManifest,
  repoRoot,
} = require("./gen-manifest");

const SUITES = {
  core: ["agent-quality-loop", "review-gate", "ask-plan-code-qa"],
  full: ["agent-quality-loop", "review-gate", "ask-plan-code-qa", "skill-factory"],
};

function parseArgs(argv) {
  const options = {
    suite: "core",
    to: "agents",
    dryRun: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg === "--suite") {
      options.suite = argv[++index];
      continue;
    }
    if (arg.startsWith("--suite=")) {
      options.suite = arg.slice("--suite=".length);
      continue;
    }
    if (arg === "--to") {
      options.to = argv[++index];
      continue;
    }
    if (arg.startsWith("--to=")) {
      options.to = arg.slice("--to=".length);
      continue;
    }
    throw new Error(`Unknown argument: ${arg}`);
  }
  if (!Object.prototype.hasOwnProperty.call(SUITES, options.suite)) {
    throw new Error(`--suite must be one of: ${Object.keys(SUITES).join(", ")}`);
  }
  if (!["agents", "cursor", "both"].includes(options.to)) {
    throw new Error("--to must be one of: agents, cursor, both");
  }
  return options;
}

function targetRoots(to, home = os.homedir()) {
  const roots = [];
  if (to === "agents" || to === "both") {
    roots.push({ label: "agents", root: path.join(home, ".agents", "skills") });
  }
  if (to === "cursor" || to === "both") {
    roots.push({ label: "cursor", root: path.join(home, ".cursor", "skills") });
  }
  return roots;
}

function readManifest(packageDir) {
  const manifestPath = path.join(packageDir, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`missing ${MANIFEST_NAME} in ${packageDir}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, "utf8"));
}

function guardDestination(destinationDir) {
  let stat;
  try {
    stat = fs.lstatSync(destinationDir);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(
      `refusing to replace linked destination ${destinationDir}; remove or repair the symlink/junction manually before installing`,
    );
  }
}

function guardDestinationRoot(destinationRoot) {
  let stat;
  try {
    stat = fs.lstatSync(destinationRoot);
  } catch (error) {
    if (error && error.code === "ENOENT") return;
    throw error;
  }
  if (stat.isSymbolicLink()) {
    throw new Error(`refusing to use linked destination root ${destinationRoot}; repair the symlink/junction manually before installing`);
  }
  if (!stat.isDirectory()) throw new Error(`destination root is not a directory: ${destinationRoot}`);
}

function sourceRootForTarget(root, label) {
  // Cursor is authoritative; Codex/agents consume only the generated mirror.
  return path.join(root, label === "agents" ? ".agents" : ".cursor", "skills");
}

function buildInstallPlan({ root = repoRoot(), packages, destinations }) {
  const plan = [];
  const checkedSources = new Set();
  // Preflight every source and destination before any removal/copy occurs.
  for (const destination of destinations) {
    guardDestinationRoot(destination.root);
    for (const packageName of packages) {
      const sourceDir = path.join(sourceRootForTarget(root, destination.label), packageName);
      const sourceKey = `${destination.label}:${packageName}`;
      if (!checkedSources.has(sourceKey)) {
        if (!fs.existsSync(sourceDir)) throw new Error(`missing ${destination.label} source package: ${packageName}`);
        const errors = checkManifestConsistency(sourceDir);
        if (errors.length > 0) throw new Error(`source preflight ${destination.label}/${packageName}: ${errors.join("; ")}`);
        checkedSources.add(sourceKey);
      }
      const destinationDir = path.join(destination.root, packageName);
      guardDestination(destinationDir);
      plan.push({ packageName, sourceDir, destinationDir, destination });
    }
  }
  return plan;
}

function installPackage(sourceDir, destinationDir, dryRun) {
  const packageName = path.basename(sourceDir);
  const manifest = readManifest(sourceDir);
  if (dryRun) {
    return {
      packageName,
      version: manifest.version || MANIFEST_VERSION,
      destinationDir,
      dryRun: true,
      fileCount: Object.keys(manifest.files || {}).length,
      mismatches: [],
    };
  }

  fs.rmSync(destinationDir, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(destinationDir), { recursive: true });
  fs.cpSync(sourceDir, destinationDir, { recursive: true });

  const installedManifest = readManifest(destinationDir);
  const mismatches = checkManifestConsistency(destinationDir);
  return {
    packageName,
    version: installedManifest.version || MANIFEST_VERSION,
    destinationDir,
    dryRun: false,
    fileCount: Object.keys(installedManifest.files || {}).length,
    mismatches,
  };
}

function runSelfTest() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aql-install-"));
  let failed = false;
  function check(condition, name) {
    console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
    failed ||= !condition;
  }
  try {
    const cursorRoot = path.join(fixtureRoot, ".cursor", "skills");
    const agentsRoot = path.join(fixtureRoot, ".agents", "skills");
    const destinationRoot = path.join(fixtureRoot, "destinations");
    const createSource = (root, name, contents) => {
      const sourceDir = path.join(root, name);
      fs.mkdirSync(sourceDir, { recursive: true });
      fs.writeFileSync(path.join(sourceDir, "SKILL.md"), contents, "utf8");
      writeManifest(sourceDir, { generatedAt: "2000-01-01T00:00:00.000Z" });
      return sourceDir;
    };
    createSource(cursorRoot, "fixture", "cursor source\n");
    createSource(agentsRoot, "fixture", "agents source\n");
    createSource(agentsRoot, "first", "first source\n");
    createSource(agentsRoot, "later-linked", "later source\n");
    fs.mkdirSync(destinationRoot);
    const agentsPlan = buildInstallPlan({
      root: fixtureRoot,
      packages: ["fixture"],
      destinations: [{ label: "agents", root: destinationRoot }],
    });
    const cursorPlan = buildInstallPlan({
      root: fixtureRoot,
      packages: ["fixture"],
      destinations: [{ label: "cursor", root: destinationRoot }],
    });
    check(agentsPlan[0].sourceDir === path.join(agentsRoot, "fixture"), "agents routes from generated .agents source");
    check(cursorPlan[0].sourceDir === path.join(cursorRoot, "fixture"), "cursor routes from authoritative .cursor source");
    const dryRun = installPackage(agentsPlan[0].sourceDir, agentsPlan[0].destinationDir, true);
    check(dryRun.dryRun === true && !fs.existsSync(agentsPlan[0].destinationDir), "dry-run writes no destination files");
    const snapshot = installPackage(agentsPlan[0].sourceDir, agentsPlan[0].destinationDir, false);
    fs.writeFileSync(path.join(agentsRoot, "fixture", "SKILL.md"), "changed source\n", "utf8");
    check(
      snapshot.mismatches.length === 0 &&
        !fs.lstatSync(agentsPlan[0].destinationDir).isSymbolicLink() &&
        fs.readFileSync(path.join(agentsPlan[0].destinationDir, "SKILL.md"), "utf8") === "agents source\n",
      "ordinary destination is a real-file snapshot, not a live link",
    );

    const firstDestination = path.join(destinationRoot, "first");
    const linkedDestination = path.join(destinationRoot, "later-linked");
    fs.mkdirSync(firstDestination);
    fs.writeFileSync(path.join(firstDestination, "sentinel.txt"), "keep", "utf8");
    fs.symlinkSync(firstDestination, linkedDestination, process.platform === "win32" ? "junction" : "dir");
    let rejected = false;
    try {
      buildInstallPlan({
        root: fixtureRoot,
        packages: ["first", "later-linked"],
        destinations: [{ label: "agents", root: destinationRoot }],
      });
    } catch (error) {
      rejected = /linked destination|symlink\/junction/i.test(error.message);
    }
    check(rejected && fs.readFileSync(path.join(firstDestination, "sentinel.txt"), "utf8") === "keep", "later linked destination aborts batch before earlier ordinary destination changes");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

function main(argv = process.argv.slice(2)) {
  if (argv.length === 1 && argv[0] === "--self-test") return runSelfTest();
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(error.message);
    console.error("Usage: node scripts/install.js [--suite core|full] [--to agents|cursor|both] [--dry-run]");
    return 2;
  }

  const root = repoRoot();
  const packages = SUITES[options.suite];
  const destinations = targetRoots(options.to);
  let plan;

  console.log(
    `${options.dryRun ? "Dry-run install" : "Install"} suite=${options.suite} to=${options.to}`,
  );

  try {
    plan = buildInstallPlan({ root, packages, destinations });
  } catch (error) {
    console.error(`FAIL preflight: ${error.message}`);
    return 1;
  }
  for (const entry of plan) {
    const manifest = readManifest(entry.sourceDir);
    console.log(`  PASS source preflight ${entry.destination.label}/${entry.packageName}@${manifest.version} (${Object.keys(manifest.files).length} files hashed)`);
  }

  const reports = [];
  for (const entry of plan) {
    const packageName = entry.packageName;
    const sourceDir = entry.sourceDir;
    const destination = entry.destination;
    const destinationDir = entry.destinationDir;
      console.log(`- ${packageName} → ${destination.label}: ${destinationDir}`);
      try {
        reports.push(installPackage(sourceDir, destinationDir, options.dryRun));
      } catch (error) {
        console.error(`FAIL ${packageName}: ${error.message}`);
        return 1;
      }
  }

  let failed = false;
  console.log("Verification report:");
  for (const report of reports) {
    if (report.dryRun) {
      console.log(
        `  PLAN ${report.packageName}@${report.version} → ${report.destinationDir} (${report.fileCount} files)`,
      );
      continue;
    }
    if (report.mismatches.length > 0) {
      failed = true;
      console.error(`  FAIL ${report.packageName}@${report.version}: ${report.mismatches.join("; ")}`);
    } else {
      console.log(
        `  PASS ${report.packageName}@${report.version} (${report.fileCount} files hashed)`,
      );
    }
  }

  if (failed) return 1;
  if (options.dryRun) {
    console.log("Dry-run complete; no files written");
  } else {
    console.log("Install complete");
  }
  return 0;
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  main,
  runSelfTest,
  buildInstallPlan,
  sourceRootForTarget,
  targetRoots,
};
