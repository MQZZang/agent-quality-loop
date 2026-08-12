#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { loadCatalog, getRoute, listRouteNames, routePackageNames, MANIFEST_VERSION, repoRoot } = require("./package-catalog");
const { writeManifest, walkFiles, checkManifestConsistency, buildManifest } = require("./gen-manifest");

const ROUTE_SHIMS_DIST = path.join("dist", "route-shims");
const ROUTE_PARENT = "agent-quality-loop";

const HOST_TARGETS = [
  { key: "cursor", distSubdir: "cursor", variant: "cursor" },
  { key: "agents", distSubdir: "agents", variant: "codex" },
  { key: "plugins", distSubdir: "plugins", variant: "codex" },
];

const LEGACY_SKILLS_ROOTS = [
  path.join(".cursor", "skills"),
  path.join(".agents", "skills"),
  "skills",
];

const LIFECYCLE_DUMP_PATTERN = /RAW\s*->\s*ALIGNED\s*->\s*EVIDENCED/i;
const MAX_BODY_LINES = 40;

/** Normalize CRLF → LF so Windows autocrlf checkouts compare equal to LF generator output. */
function normalizeEol(text) {
  return String(text).replace(/\r\n/g, "\n");
}

function distRootForHost(outputRoot, host) {
  return path.join(outputRoot, ROUTE_SHIMS_DIST, host.distSubdir);
}

function formatAxes(route) {
  return Object.entries(route.axes)
    .map(([key, value]) => `- \`${key}\`: \`${value}\``)
    .join("\n");
}

function formatPermissions(route) {
  const lines = [];
  for (const [key, value] of Object.entries(route.permissions)) {
    if (value === false) {
      if (key === "local_implementation_writes") lines.push("- Do not perform local implementation writes.");
      else if (key === "repair") lines.push("- Do not repair, edit, or rewrite artifacts under review.");
      else if (key === "release_act") lines.push("- Do not publish, deploy, upload, or otherwise perform a release act.");
      else if (key === "inherit_elevated_authority") {
        lines.push("- Do not inherit prior external, destructive, or release authority from an earlier session.");
      } else if (key === "fresh_acceptor_context") {
        lines.push("- Require a fresh acceptor context; do not reuse the implementer's narrative as proof.");
      } else {
        lines.push(`- \`${key}\` is forbidden for this route.`);
      }
    } else if (value === true) {
      if (key === "fresh_acceptor_context") {
        lines.push("- Require a fresh acceptor context; do not reuse the implementer's narrative as proof.");
      } else {
        lines.push(`- \`${key}\` is required for this route.`);
      }
    } else {
      lines.push(`- \`${key}\`: \`${value}\``);
    }
  }
  return lines.join("\n");
}

function buildAcceptIndependenceSection() {
  return `## Independence

This route **requires** independent acceptance — it does not claim the current context is already independent.

- If the host can spawn a fresh subagent or fork, use it for the review.
- Otherwise emit an actionable handoff for a distinct acceptor; do not self-approve.
- Same context or unprovable separation → \`verdict: PENDING\` or \`NOT_RUN\`; keep the prior legal phase; **never** \`ACCEPTED\`.
- Renaming the role (\`different_role\` text alone) is not fresh-context evidence.
- \`/aql-accept\` (or \`$aql-accept\`) does not by itself create independence on every host.`;
}

function buildSkillBody(route) {
  const title = route.name
    .replace(/^aql-/, "")
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const sections = [
    `# AQL ${title}`,
    "## Route Axes",
    formatAxes(route),
    "## Permissions",
    formatPermissions(route),
  ];
  if (route.name === "aql-accept") {
    sections.push(buildAcceptIndependenceSection());
  }
  sections.push(
    "## Handoff",
    route.handoff,
    "## Contract",
    `Follow the \`${ROUTE_PARENT}\` task contract, mode router, and evidence rules in its SKILL.md and \`references/contracts.md\`. This route is explicit-only packaging; it does not restate lifecycle phases or duplicate parent summaries.`,
  );
  return sections.join("\n\n").trim();
}

function buildFrontmatter(route, variant) {
  const lines = [
    "---",
    `name: ${route.name}`,
    "description: >-",
    `  ${route.description}`,
    "license: MIT",
  ];
  if (variant === "cursor") {
    lines.push("disable-model-invocation: true");
  }
  lines.push(
    "metadata:",
    "  author: MQZZang",
    `  version: "${MANIFEST_VERSION}"`,
    "---",
    "",
  );
  return lines.join("\n");
}

function buildSkillMarkdown(route, variant) {
  return `${buildFrontmatter(route, variant)}${buildSkillBody(route)}\n`;
}

function buildOpenAiYaml(route) {
  return `interface:
  display_name: "${route.openai.display_name}"
  short_description: "${route.openai.short_description}"
  default_prompt: "${route.openai.default_prompt.replace(/"/g, '\\"')}"
policy:
  allow_implicit_invocation: false
`;
}

function writeRouteManifest(packageDir, route, generatedAt) {
  const manifest = buildManifest(packageDir, { generatedAt, name: route.name });
  manifest.depends_on = [ROUTE_PARENT];
  const target = path.join(packageDir, "manifest.json");
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function writeRoutePackage(packageDir, route, variant, generatedAt) {
  fs.mkdirSync(path.join(packageDir, "agents"), { recursive: true });
  fs.writeFileSync(path.join(packageDir, "SKILL.md"), buildSkillMarkdown(route, variant), "utf8");
  fs.writeFileSync(path.join(packageDir, "agents", "openai.yaml"), buildOpenAiYaml(route), "utf8");
  writeRouteManifest(packageDir, route, generatedAt);
}

function removeLegacyRoutePackages(outputRoot = repoRoot()) {
  const routeNames = new Set(routePackageNames({ root: outputRoot }));
  const removed = [];
  for (const skillsSubdir of LEGACY_SKILLS_ROOTS) {
    const skillsRoot = path.join(outputRoot, skillsSubdir);
    if (!fs.existsSync(skillsRoot)) continue;
    for (const entry of fs.readdirSync(skillsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || !routeNames.has(entry.name)) continue;
      const packageDir = path.join(skillsRoot, entry.name);
      fs.rmSync(packageDir, { recursive: true, force: true });
      removed.push(path.relative(outputRoot, packageDir));
    }
  }
  return removed;
}

function generateAll(options = {}) {
  const outputRoot = options.root || repoRoot();
  const catalog = loadCatalog(options);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const outputs = [];

  for (const host of HOST_TARGETS) {
    const distRoot = distRootForHost(outputRoot, host);
    fs.mkdirSync(distRoot, { recursive: true });
    for (const routeName of listRouteNames(catalog)) {
      const route = getRoute(catalog, routeName);
      const packageDir = path.join(distRoot, routeName);
      writeRoutePackage(packageDir, route, host.variant, generatedAt);
      outputs.push({ host: host.key, packageDir, route: routeName, variant: host.variant });
    }
  }

  if (!options.skipLegacyCleanup) {
    const removed = removeLegacyRoutePackages(outputRoot);
    for (const relativePath of removed) {
      outputs.push({ host: "cleanup", packageDir: relativePath, route: path.basename(relativePath), variant: "removed" });
    }
  }

  return outputs;
}

function readBodyLineCount(skillMarkdown) {
  const match = skillMarkdown.match(/^---\n[\s\S]*?\n---\n([\s\S]*)$/);
  const body = match ? match[1] : skillMarkdown;
  return body.split("\n").filter((line) => line.trim().length > 0).length;
}

function validateManifestDependency(packageDir, routeName) {
  const errors = [];
  const manifestPath = path.join(packageDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${routeName}: missing manifest.json in ${packageDir}`);
    return errors;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`${routeName}: invalid manifest.json: ${error.message}`);
    return errors;
  }
  if (!Array.isArray(manifest.depends_on) || !manifest.depends_on.includes(ROUTE_PARENT)) {
    errors.push(`${routeName}: manifest must declare depends_on including ${ROUTE_PARENT}`);
  }
  errors.push(...checkManifestConsistency(packageDir));
  return errors;
}

function validateGeneratedPackage(packageDir, route, variant) {
  const errors = [];
  const skillPath = path.join(packageDir, "SKILL.md");
  const openaiPath = path.join(packageDir, "agents", "openai.yaml");
  if (!fs.existsSync(skillPath)) errors.push(`${route.name}: missing SKILL.md in ${packageDir}`);
  if (!fs.existsSync(openaiPath)) errors.push(`${route.name}: missing agents/openai.yaml in ${packageDir}`);
  if (errors.length > 0) return errors;

  const skillMarkdown = normalizeEol(fs.readFileSync(skillPath, "utf8"));
  const hasDisable = /^disable-model-invocation:\s*true\s*$/m.test(skillMarkdown);
  if (variant === "cursor" && !hasDisable) {
    errors.push(`${route.name}: Cursor variant must include disable-model-invocation: true`);
  }
  if (variant === "codex" && hasDisable) {
    errors.push(`${route.name}: Codex/generic variant must not include disable-model-invocation`);
  }
  if (readBodyLineCount(skillMarkdown) > MAX_BODY_LINES) {
    errors.push(`${route.name}: body exceeds ${MAX_BODY_LINES} non-empty lines excluding frontmatter`);
  }
  if (LIFECYCLE_DUMP_PATTERN.test(skillMarkdown)) {
    errors.push(`${route.name}: must not duplicate lifecycle chain text`);
  }

  const openaiYaml = normalizeEol(fs.readFileSync(openaiPath, "utf8"));
  if (!/allow_implicit_invocation:\s*false\b/.test(openaiYaml)) {
    errors.push(`${route.name}: openai.yaml must set allow_implicit_invocation: false`);
  }

  const expectedSkill = normalizeEol(buildSkillMarkdown(route, variant));
  const expectedOpenai = normalizeEol(buildOpenAiYaml(route));
  if (skillMarkdown !== expectedSkill) errors.push(`${route.name}: SKILL.md drift in ${packageDir}`);
  if (openaiYaml !== expectedOpenai) errors.push(`${route.name}: agents/openai.yaml drift in ${packageDir}`);

  if (route.name === "aql-accept") {
    if (!/does not by itself create independence on every host/.test(skillMarkdown)) {
      errors.push("aql-accept: must disclose that the route does not create independence on every host");
    }
    if (!/different_role.*is not fresh-context evidence/i.test(skillMarkdown)) {
      errors.push("aql-accept: must state that different_role text alone is not fresh-context evidence");
    }
  }

  if (route.name === "aql-diagnose" && route.permissions.local_implementation_writes !== false) {
    errors.push("aql-diagnose: catalog must forbid local implementation writes");
  }
  if (route.name === "aql-accept" && route.permissions.repair !== false) {
    errors.push("aql-accept: catalog must forbid repair");
  }
  if (route.name === "aql-release-check" && route.permissions.release_act !== false) {
    errors.push("aql-release-check: catalog must forbid release act");
  }
  if (route.name === "aql-resume" && route.permissions.inherit_elevated_authority !== false) {
    errors.push("aql-resume: catalog must forbid inherited elevated authority");
  }

  errors.push(...validateManifestDependency(packageDir, route.name));

  const expectedFiles = new Set(["SKILL.md", "agents/openai.yaml", "manifest.json"]);
  for (const relativePath of walkFiles(packageDir)) {
    if (!expectedFiles.has(relativePath)) {
      errors.push(`${route.name}: unexpected generated file ${relativePath}`);
    }
  }

  return errors;
}

function checkGenerated(options = {}) {
  const outputRoot = options.root || repoRoot();
  const catalog = loadCatalog(options);
  const errors = [];

  for (const host of HOST_TARGETS) {
    const distRoot = distRootForHost(outputRoot, host);
    for (const routeName of listRouteNames(catalog)) {
      const route = getRoute(catalog, routeName);
      const packageDir = path.join(distRoot, routeName);
      if (!fs.existsSync(packageDir)) {
        errors.push(`missing generated route package: ${path.relative(outputRoot, packageDir)}`);
        continue;
      }
      errors.push(...validateGeneratedPackage(packageDir, route, host.variant));
    }
  }

  for (const skillsSubdir of LEGACY_SKILLS_ROOTS) {
    const skillsRoot = path.join(outputRoot, skillsSubdir);
    if (!fs.existsSync(skillsRoot)) continue;
    for (const routeName of listRouteNames(catalog)) {
      const legacyDir = path.join(skillsRoot, routeName);
      if (fs.existsSync(legacyDir)) {
        errors.push(`legacy route package must not remain in discovery tree: ${path.relative(outputRoot, legacyDir)}`);
      }
    }
  }

  return errors;
}

function main(argv = process.argv.slice(2)) {
  if (argv.some((arg) => arg !== "--check")) {
    console.error("Usage: node scripts/gen-route-shims.js [--check]");
    return 2;
  }

  const checkOnly = argv.includes("--check");
  if (checkOnly) {
    const errors = checkGenerated();
    if (errors.length > 0) {
      for (const error of errors) console.error(`FAIL ${error}`);
      return 1;
    }
    console.log("PASS route shim generation matches catalog");
    return 0;
  }

  const outputs = generateAll();
  console.log(`Generated ${outputs.filter((item) => item.host !== "cleanup").length} route packages (${routePackageNames().length} routes × ${HOST_TARGETS.length} hosts)`);
  for (const item of outputs) {
    if (item.host === "cleanup") {
      console.log(`  removed legacy ${item.packageDir}`);
      continue;
    }
    console.log(`  ${item.host}/${item.route} (${item.variant})`);
  }

  const errors = checkGenerated();
  if (errors.length > 0) {
    for (const error of errors) console.error(`FAIL post-generate check: ${error}`);
    return 1;
  }
  console.log("Route shim check: OK");
  return 0;
}

module.exports = {
  HOST_TARGETS,
  ROUTE_SHIMS_DIST,
  ROUTE_PARENT,
  LEGACY_SKILLS_ROOTS,
  MAX_BODY_LINES,
  LIFECYCLE_DUMP_PATTERN,
  buildSkillBody,
  buildSkillMarkdown,
  buildOpenAiYaml,
  buildAcceptIndependenceSection,
  distRootForHost,
  generateAll,
  checkGenerated,
  validateGeneratedPackage,
  validateManifestDependency,
  removeLegacyRoutePackages,
  readBodyLineCount,
  normalizeEol,
  writeRouteManifest,
};

if (require.main === module) {
  process.exitCode = main();
}
