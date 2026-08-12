#!/usr/bin/env node

"use strict";

const fs = require("fs");
const path = require("path");
const { MANIFEST_VERSION, repoRoot } = require("./gen-manifest");

const CATALOG_PATH = path.join(repoRoot(), "integrations", "route-shims", "routes.json");
const ROUTE_SUITE = "routes";
const ROUTE_SHIMS_DIST = path.join("dist", "route-shims");
const ROUTE_PARENT = "agent-quality-loop";

function routeDistRoot(root = repoRoot(), hostKey = "cursor") {
  return path.join(root, ROUTE_SHIMS_DIST, hostKey);
}

function routeDistHosts() {
  return {
    cursor: routeDistRoot(undefined, "cursor"),
    agents: routeDistRoot(undefined, "agents"),
    plugins: routeDistRoot(undefined, "plugins"),
  };
}

const REQUIRED_ROUTE_FIELDS = ["name", "description", "axes", "permissions", "handoff", "openai"];
const REQUIRED_OPENAI_FIELDS = ["display_name", "short_description", "default_prompt"];

function catalogPath(root = repoRoot()) {
  return path.join(root, "integrations", "route-shims", "routes.json");
}

function loadCatalog(options = {}) {
  const filePath = options.catalogPath || catalogPath(options.catalogRoot);
  if (!fs.existsSync(filePath)) {
    throw new Error(`missing route catalog: ${filePath}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`invalid route catalog JSON: ${error.message}`);
  }
  validateCatalog(parsed);
  return parsed;
}

function validateCatalog(catalog) {
  const errors = [];
  if (!catalog || typeof catalog !== "object") {
    throw new Error("route catalog must be an object");
  }
  if (catalog.suite !== ROUTE_SUITE) {
    errors.push(`catalog suite must be "${ROUTE_SUITE}"`);
  }
  if (!Array.isArray(catalog.routes) || catalog.routes.length === 0) {
    errors.push("catalog routes must be a non-empty array");
  }

  const names = new Set();
  for (const route of catalog.routes || []) {
    errors.push(...validateRoute(route));
    if (route && route.name) {
      if (names.has(route.name)) errors.push(`duplicate route name: ${route.name}`);
      names.add(route.name);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join("; "));
  }
  return catalog;
}

function validateRoute(route) {
  const errors = [];
  if (!route || typeof route !== "object") return ["route entry must be an object"];
  for (const field of REQUIRED_ROUTE_FIELDS) {
    if (!Object.prototype.hasOwnProperty.call(route, field)) {
      errors.push(`${route.name || "<unnamed>"}: missing ${field}`);
    }
  }
  if (typeof route.name !== "string" || !/^aql-[a-z-]+$/.test(route.name)) {
    errors.push(`${route.name || "<unnamed>"}: name must match aql-*`);
  }
  if (route.suite && route.suite !== ROUTE_SUITE) {
    errors.push(`${route.name}: suite must be "${ROUTE_SUITE}" when present`);
  }
  if (!route.axes || typeof route.axes !== "object") {
    errors.push(`${route.name}: axes must be an object`);
  }
  if (!route.permissions || typeof route.permissions !== "object") {
    errors.push(`${route.name}: permissions must be an object`);
  }
  if (typeof route.handoff !== "string" || !route.handoff.trim()) {
    errors.push(`${route.name}: handoff must be a non-empty string`);
  }
  if (!route.openai || typeof route.openai !== "object") {
    errors.push(`${route.name}: openai must be an object`);
  } else {
    for (const field of REQUIRED_OPENAI_FIELDS) {
      if (typeof route.openai[field] !== "string" || !route.openai[field].trim()) {
        errors.push(`${route.name}: openai.${field} must be a non-empty string`);
      }
    }
  }
  return errors;
}

function listRouteNames(catalog) {
  return catalog.routes.map((route) => route.name);
}

function getRoute(catalog, name) {
  const route = catalog.routes.find((entry) => entry.name === name);
  if (!route) throw new Error(`unknown route: ${name}`);
  return route;
}

function routePackageNames(options = {}) {
  return listRouteNames(loadCatalog(options));
}

function isRoutePackageName(name, options = {}) {
  return routePackageNames(options).includes(name);
}

function suitesMap(options = {}) {
  const catalog = loadCatalog(options);
  return {
    routes: listRouteNames(catalog),
  };
}

function routesSuitePackages(options = {}) {
  return [ROUTE_PARENT, ...routePackageNames(options)];
}

module.exports = {
  CATALOG_PATH,
  ROUTE_SUITE,
  ROUTE_SHIMS_DIST,
  ROUTE_PARENT,
  MANIFEST_VERSION,
  routeDistRoot,
  routeDistHosts,
  routesSuitePackages,
  catalogPath,
  loadCatalog,
  validateCatalog,
  validateRoute,
  listRouteNames,
  getRoute,
  routePackageNames,
  isRoutePackageName,
  suitesMap,
  repoRoot,
};
