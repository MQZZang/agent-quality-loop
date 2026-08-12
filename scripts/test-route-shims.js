#!/usr/bin/env node



"use strict";



const fs = require("fs");

const os = require("os");

const path = require("path");

const { spawnSync } = require("child_process");

const {

  loadCatalog,

  getRoute,

  routePackageNames,

  validateRoute,

  ROUTE_PARENT,

  ROUTE_SHIMS_DIST,

} = require("./package-catalog");

const {

  generateAll,

  checkGenerated,

  buildSkillMarkdown,

  validateGeneratedPackage,

  distRootForHost,

  HOST_TARGETS,

} = require("./gen-route-shims");

const { buildInstallPlan, SUITES } = require("./install");

const { compareTrees } = require("./sync-skills");

const { checkManifestConsistency, repoRoot } = require("./gen-manifest");



function runCheck(label, condition) {

  console.log(`${condition ? "PASS" : "FAIL"} ${label}`);

  return condition ? 0 : 1;

}



function tamperManifestEntryDeleted(packageDir) {

  const manifestPath = path.join(packageDir, "manifest.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  delete manifest.files["agents/openai.yaml"];

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return checkManifestConsistency(packageDir).some((error) => /listed path is not a walked package file|sha256 mismatch|file not listed in manifest/i.test(error));

}



function tamperManifestHashOnly(packageDir) {

  const manifestPath = path.join(packageDir, "manifest.json");

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

  manifest.files["SKILL.md"] = "0".repeat(64);

  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  return checkManifestConsistency(packageDir).some((error) => error.includes("sha256 mismatch SKILL.md"));

}



function tamperSkillOnly(packageDir, route, variant) {

  const skillPath = path.join(packageDir, "SKILL.md");

  fs.appendFileSync(skillPath, "\n<!-- tampered -->\n", "utf8");

  return validateGeneratedPackage(packageDir, route, variant).some((error) => error.includes("SKILL.md drift"));

}



function main() {

  let failed = 0;

  const root = repoRoot();

  const catalog = loadCatalog({ root });

  const routes = routePackageNames({ root });



  failed |= runCheck("catalog exposes exactly four routes", routes.length === 4);

  failed |= runCheck(

    "catalog route names match expected bindings",

    routes.join(",") === "aql-diagnose,aql-accept,aql-release-check,aql-resume",

  );



  for (const routeName of routes) {

    const route = getRoute(catalog, routeName);

    failed |= runCheck(`${routeName} catalog validates`, validateRoute(route).length === 0);

  }



  const diagnose = getRoute(catalog, "aql-diagnose");

  failed |= runCheck("aql-diagnose forbids local implementation writes", diagnose.permissions.local_implementation_writes === false);

  failed |= runCheck("aql-diagnose terminal ceiling is EVIDENCED", diagnose.axes.terminal_ceiling === "EVIDENCED");



  const accept = getRoute(catalog, "aql-accept");

  failed |= runCheck("aql-accept forbids repair", accept.permissions.repair === false);

  failed |= runCheck("aql-accept requires fresh acceptor context", accept.permissions.fresh_acceptor_context === true);



  const releaseCheck = getRoute(catalog, "aql-release-check");

  failed |= runCheck("aql-release-check forbids release act", releaseCheck.permissions.release_act === false);

  failed |= runCheck("aql-release-check release_intent is preflight", releaseCheck.axes.release_intent === "preflight");



  const resume = getRoute(catalog, "aql-resume");

  failed |= runCheck("aql-resume forbids inherited elevated authority", resume.permissions.inherit_elevated_authority === false);

  failed |= runCheck("aql-resume initial authority is read", resume.axes.initial_action_authority === "read");



  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aql-route-shims-"));

  try {

    generateAll({ root: fixtureRoot, generatedAt: "2000-01-01T00:00:00.000Z" });

    failed |= runCheck("generated fixture passes checkGenerated", checkGenerated({ root: fixtureRoot }).length === 0);



    for (const routeName of routes) {

      const route = getRoute(catalog, routeName);

      const cursorDir = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", routeName);

      const agentsDir = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "agents", routeName);

      failed |= runCheck(

        `${routeName} Cursor variant includes disable-model-invocation`,

        validateGeneratedPackage(cursorDir, route, "cursor").length === 0,

      );

      failed |= runCheck(

        `${routeName} Codex variant excludes disable-model-invocation`,

        validateGeneratedPackage(agentsDir, route, "codex").length === 0,

      );

    }



    const acceptCursorDir = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-accept");

    const acceptSkill = fs.readFileSync(path.join(acceptCursorDir, "SKILL.md"), "utf8");

    failed |= runCheck(

      "aql-accept discloses independence is not automatic",

      /does not by itself create independence on every host/.test(acceptSkill),

    );

    failed |= runCheck(

      "aql-accept rejects different_role as fresh-context evidence",

      /different_role.*is not fresh-context evidence/i.test(acceptSkill),

    );



    const driftDir = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose");

    fs.writeFileSync(path.join(driftDir, "SKILL.md"), "drift\n", "utf8");

    failed |= runCheck("--check detects SKILL.md drift", checkGenerated({ root: fixtureRoot }).some((error) => error.includes("SKILL.md drift")));



    generateAll({ root: fixtureRoot, generatedAt: "2000-01-01T00:00:00.000Z" });

    const tamperDir = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose");

    failed |= runCheck(

      "manifest check detects deleted manifest entry",

      tamperManifestEntryDeleted(tamperDir),

    );

    generateAll({ root: fixtureRoot, generatedAt: "2000-01-01T00:00:00.000Z" });

    failed |= runCheck(

      "manifest check detects tampered manifest hash only",

      tamperManifestHashOnly(path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose")),

    );

    generateAll({ root: fixtureRoot, generatedAt: "2000-01-01T00:00:00.000Z" });

    failed |= runCheck(

      "package check detects SKILL.md tamper",

      tamperSkillOnly(

        path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose"),

        getRoute(catalog, "aql-diagnose"),

        "cursor",

      ),

    );

    generateAll({ root: fixtureRoot, generatedAt: "2000-01-01T00:00:00.000Z" });

    const extraPath = path.join(fixtureRoot, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose", "extra.txt");

    fs.writeFileSync(extraPath, "extra\n", "utf8");

    failed |= runCheck(

      "--check detects extra generated file",

      checkGenerated({ root: fixtureRoot }).some((error) => error.includes("unexpected generated file")),

    );



    const cursorSkill = buildSkillMarkdown(getRoute(catalog, "aql-diagnose"), "cursor");

    failed |= runCheck("Cursor generated body stays within line cap", cursorSkill.split("\n").length < 80);

    failed |= runCheck("generated body avoids lifecycle dump", !/RAW\s*->\s*ALIGNED/i.test(cursorSkill));

  } finally {

    fs.rmSync(fixtureRoot, { recursive: true, force: true });

  }



  const mirrorErrors = compareTrees(

    path.join(root, ".cursor", "skills"),

    path.join(root, ".agents", "skills"),

    { root, excludePackages: routes },

  );

  failed |= runCheck(

    "core mirror check ignores route packages",

    mirrorErrors.every((error) => !/aql-(diagnose|accept|release-check|resume)/.test(error)),

  );



  for (const host of HOST_TARGETS) {

    const distRoot = distRootForHost(root, host);

    for (const routeName of routes) {

      const packageDir = path.join(distRoot, routeName);

      failed |= runCheck(

        `dist route package exists ${host.key}/${routeName}`,

        fs.existsSync(path.join(packageDir, "SKILL.md")),

      );

    }

  }



  const cursorDiagnose = fs.readFileSync(path.join(root, ROUTE_SHIMS_DIST, "cursor", "aql-diagnose", "SKILL.md"), "utf8");

  const agentsDiagnose = fs.readFileSync(path.join(root, ROUTE_SHIMS_DIST, "agents", "aql-diagnose", "SKILL.md"), "utf8");

  failed |= runCheck(

    "route host variants differ between Cursor and Codex dist trees",

    cursorDiagnose !== agentsDiagnose &&

      /disable-model-invocation:\s*true/.test(cursorDiagnose) &&

      !/disable-model-invocation:/.test(agentsDiagnose),

  );



  for (const skillsSubdir of [".cursor/skills", ".agents/skills", "skills"]) {

    for (const routeName of routes) {

      failed |= runCheck(

        `no legacy route package under ${skillsSubdir}/${routeName}`,

        !fs.existsSync(path.join(root, skillsSubdir, routeName)),

      );

    }

  }



  const agentsPlan = buildInstallPlan({

    root,

    suite: "routes",

    packages: SUITES.routes,

    destinations: [{ label: "agents", root: path.join(root, "__dest__") }],

  });

  const cursorPlan = buildInstallPlan({

    root,

    suite: "routes",

    packages: SUITES.routes,

    destinations: [{ label: "cursor", root: path.join(root, "__dest__") }],

  });

  const claudePlan = buildInstallPlan({

    root,

    suite: "routes",

    packages: SUITES.routes,

    destinations: [{ label: "claude", root: path.join(root, "__dest__") }],

  });

  failed |= runCheck(

    "routes install agents sources from dist/route-shims/agents",

    agentsPlan.filter((entry) => entry.packageName !== ROUTE_PARENT).every((entry) =>

      entry.sourceDir.includes(`${path.sep}dist${path.sep}route-shims${path.sep}agents${path.sep}`),

    ),

  );

  failed |= runCheck(

    "routes install cursor sources from dist/route-shims/cursor",

    cursorPlan.filter((entry) => entry.packageName !== ROUTE_PARENT).every((entry) =>

      entry.sourceDir.includes(`${path.sep}dist${path.sep}route-shims${path.sep}cursor${path.sep}`),

    ),

  );

  failed |= runCheck(

    "routes install claude route sources from dist/route-shims/cursor variant",

    claudePlan.filter((entry) => entry.packageName !== ROUTE_PARENT).every((entry) =>

      entry.sourceDir.includes(`${path.sep}dist${path.sep}route-shims${path.sep}cursor${path.sep}`),

    ),

  );

  failed |= runCheck(

    "routes suite auto-includes agent-quality-loop parent",

    SUITES.routes.includes(ROUTE_PARENT) && SUITES.routes.length === routes.length + 1,

  );

  failed |= runCheck(

    "routes install plan includes parent for agents destination",

    agentsPlan.some((entry) => entry.packageName === ROUTE_PARENT),

  );



  failed |= runCheck("core suite excludes route packages", SUITES.core.every((name) => !routes.includes(name)));

  failed |= runCheck("full suite excludes route packages", SUITES.full.every((name) => !routes.includes(name)));



  const tempHome = fs.mkdtempSync(path.join(os.tmpdir(), "aql-install-home-"));

  try {

    const tempHomePlan = buildInstallPlan({

      root,

      suite: "routes",

      packages: SUITES.routes,

      destinations: targetRootsFromHome(tempHome),

    });

    const plannedNames = new Set(tempHomePlan.map((entry) => entry.packageName));

    failed |= runCheck(

      "temp HOME routes plan includes parent and four routes",

      plannedNames.has(ROUTE_PARENT) &&

        routes.every((name) => plannedNames.has(name)) &&

        plannedNames.size === routes.length + 1,

    );

  } finally {

    fs.rmSync(tempHome, { recursive: true, force: true });

  }



  const tempHomeDry = fs.mkdtempSync(path.join(os.tmpdir(), "aql-install-dry-"));

  try {

    const dryRun = spawnSync(

      process.execPath,

      ["scripts/install.js", "--suite", "routes", "--to", "all", "--dry-run", "--home", tempHomeDry],

      { cwd: root, encoding: "utf8" },

    );

    failed |= runCheck("install routes dry-run exits 0", dryRun.status === 0);

    failed |= runCheck(

      "install routes dry-run plans agent-quality-loop parent",

      /PLAN agent-quality-loop@/.test(dryRun.stdout),

    );

    failed |= runCheck(

      "install routes dry-run plans all four route packages per destination",

      (dryRun.stdout.match(/PLAN aql-/g) || []).length === 12,

    );

  } finally {

    fs.rmSync(tempHomeDry, { recursive: true, force: true });

  }



  const genCheck = spawnSync(process.execPath, ["scripts/gen-route-shims.js", "--check"], {

    cwd: root,

    encoding: "utf8",

  });

  failed |= runCheck("gen-route-shims --check exits 0 on repo tree", genCheck.status === 0);



  return failed ? 1 : 0;

}



function targetRootsFromHome(home) {

  return [

    { label: "agents", root: path.join(home, ".agents", "skills") },

    { label: "cursor", root: path.join(home, ".cursor", "skills") },

    { label: "claude", root: path.join(home, ".claude", "skills") },

  ];

}



if (require.main === module) {

  process.exitCode = main();

}



module.exports = { main, targetRootsFromHome };

