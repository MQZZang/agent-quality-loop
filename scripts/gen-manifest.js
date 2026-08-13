#!/usr/bin/env node

"use strict";

// Manifest hashes are cross-EOL invariant only for valid UTF-8 recognized text.
// Invalid UTF-8 is hashed byte-for-byte: never turn distinct binary inputs into the
// same replacement-character string.

const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");

const MANIFEST_VERSION = "2.7.0";
const MANIFEST_NAME = "manifest.json";
const TEXT_EXTENSIONS = new Set([".md", ".js", ".mjs", ".json", ".yaml", ".yml", ".mdc", ".txt"]);

function repoRoot() {
  return path.resolve(__dirname, "..");
}

function isTextExtension(absolutePath) {
  return TEXT_EXTENSIONS.has(path.extname(absolutePath).toLowerCase());
}

function utf8ValidityError(absolutePath, contents = fs.readFileSync(absolutePath)) {
  if (!isTextExtension(absolutePath)) return null;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(contents);
    return null;
  } catch (error) {
    return error.message || "invalid UTF-8";
  }
}

function sha256File(absolutePath) {
  const hash = crypto.createHash("sha256");
  const contents = fs.readFileSync(absolutePath);
  let normalized = contents;
  if (isTextExtension(absolutePath)) {
    try {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(contents);
      normalized = Buffer.from(decoded.replace(/\r\n/g, "\n"), "utf8");
    } catch {
      // Keep malformed text-extension files binary-raw — callers that require
      // cross-EOL invariance must reject via utf8ValidityError first.
    }
  }
  hash.update(normalized);
  return hash.digest("hex");
}

function validateManifestPath(relativePath) {
  if (typeof relativePath !== "string" || !relativePath) return "must be a non-empty string";
  if (relativePath.includes("\0")) return "must not contain NUL";
  if (relativePath.includes("\\")) return "must use POSIX forward slashes";
  if (relativePath.startsWith("/") || /^[A-Za-z]:/.test(relativePath)) return "must be relative";
  const segments = relativePath.split("/");
  if (segments.some((segment) => !segment || segment === "." || segment === "..")) {
    return "must not contain empty, . or .. path segments";
  }
  return null;
}

function walkFiles(directory, base = directory) {
  const files = [];
  if (!fs.existsSync(directory)) return files;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`symbolic link is not allowed in skill package: ${path.relative(base, absolute)}`);
    }
    if (entry.isDirectory()) files.push(...walkFiles(absolute, base));
    else if (entry.isFile()) {
      const relativePath = path.relative(base, absolute).replaceAll(path.sep, "/");
      const invalid = validateManifestPath(relativePath);
      if (invalid) throw new Error(`unsafe walked path ${relativePath}: ${invalid}`);
      files.push(relativePath);
    }
  }
  return files.sort();
}

function listPackageSkillDirs(skillsRoot) {
  if (!fs.existsSync(skillsRoot)) return [];
  return fs
    .readdirSync(skillsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(skillsRoot, entry.name))
    .filter((dir) => fs.existsSync(path.join(dir, "SKILL.md")))
    .sort();
}

function buildManifest(packageDir, options = {}) {
  const name = options.name || path.basename(packageDir);
  const generatedAt = options.generatedAt || new Date().toISOString();
  const files = {};
  for (const relativePath of walkFiles(packageDir)) {
    if (relativePath === MANIFEST_NAME) continue;
    files[relativePath] = sha256File(path.join(packageDir, relativePath));
  }
  return {
    name,
    version: MANIFEST_VERSION,
    generated_at: generatedAt,
    files,
  };
}

function writeManifest(packageDir, options = {}) {
  const manifest = buildManifest(packageDir, options);
  const target = path.join(packageDir, MANIFEST_NAME);
  fs.writeFileSync(target, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  return manifest;
}

function checkManifestConsistency(packageDir) {
  const errors = [];
  const manifestPath = path.join(packageDir, MANIFEST_NAME);
  if (!fs.existsSync(manifestPath)) {
    errors.push(`${path.basename(packageDir)}: missing ${MANIFEST_NAME}`);
    return errors;
  }
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (error) {
    errors.push(`${path.basename(packageDir)}: invalid ${MANIFEST_NAME}: ${error.message}`);
    return errors;
  }
  if (!manifest || typeof manifest !== "object") {
    errors.push(`${path.basename(packageDir)}: ${MANIFEST_NAME} must be an object`);
    return errors;
  }
  if (manifest.name !== path.basename(packageDir)) {
    errors.push(`${path.basename(packageDir)}: manifest name mismatch (${manifest.name})`);
  }
  if (manifest.version !== MANIFEST_VERSION) {
    errors.push(`${path.basename(packageDir)}: manifest version must be ${MANIFEST_VERSION}`);
  }
  if (typeof manifest.generated_at !== "string" || !manifest.generated_at.trim()) {
    errors.push(`${path.basename(packageDir)}: manifest generated_at must be a non-empty string`);
  }
  if (!manifest.files || typeof manifest.files !== "object" || Array.isArray(manifest.files)) {
    errors.push(`${path.basename(packageDir)}: manifest files must be an object`);
    return errors;
  }
  if (Object.prototype.hasOwnProperty.call(manifest.files, MANIFEST_NAME)) {
    errors.push(`${path.basename(packageDir)}: manifest files must not include ${MANIFEST_NAME}`);
  }

  let actualFiles;
  try {
    actualFiles = new Set(walkFiles(packageDir).filter((relativePath) => relativePath !== MANIFEST_NAME));
  } catch (error) {
    errors.push(`${path.basename(packageDir)}: unsafe package tree: ${error.message}`);
    return errors;
  }
  const listedFiles = new Set(Object.keys(manifest.files));

  for (const relativePath of listedFiles) {
    const invalid = validateManifestPath(relativePath);
    if (invalid) {
      errors.push(`${path.basename(packageDir)}: unsafe manifest path ${JSON.stringify(relativePath)}: ${invalid}`);
      continue;
    }
    if (!actualFiles.has(relativePath)) {
      errors.push(`${path.basename(packageDir)}: listed path is not a walked package file ${relativePath}`);
      continue;
    }
    const absolute = path.join(packageDir, relativePath);
    const utf8Error = utf8ValidityError(absolute);
    if (utf8Error) {
      errors.push(
        `${path.basename(packageDir)}: invalid UTF-8 in text file ${relativePath} (${utf8Error}); ` +
          "hash falls back to raw bytes and is not cross-EOL safe",
      );
    }
    const actual = sha256File(absolute);
    if (actual !== manifest.files[relativePath]) {
      errors.push(`${path.basename(packageDir)}: sha256 mismatch ${relativePath}`);
    }
  }
  for (const relativePath of actualFiles) {
    if (!listedFiles.has(relativePath)) {
      errors.push(`${path.basename(packageDir)}: file not listed in manifest: ${relativePath}`);
    }
  }
  return errors;
}

function generateForSkillsRoot(skillsRoot, options = {}) {
  const generated = [];
  for (const packageDir of listPackageSkillDirs(skillsRoot)) {
    generated.push({
      packageDir,
      manifest: writeManifest(packageDir, {
        generatedAt: options.generatedAt,
        name: path.basename(packageDir),
      }),
    });
  }
  return generated;
}

function generateAll(options = {}) {
  const root = options.root || repoRoot();
  const generatedAt = options.generatedAt || new Date().toISOString();
  const trees = [
    path.join(root, ".cursor", "skills"),
    path.join(root, ".agents", "skills"),
    path.join(root, "skills"),
  ];
  const results = [];
  for (const skillsRoot of trees) {
    if (!fs.existsSync(skillsRoot)) continue;
    results.push(...generateForSkillsRoot(skillsRoot, { generatedAt }));
  }
  return results;
}

function runSelfTest() {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aql-manifest-"));
  let failed = false;
  function check(condition, name) {
    console.log(`${condition ? "PASS" : "FAIL"} ${name}`);
    failed ||= !condition;
  }
  try {
    const lf = path.join(fixtureRoot, "lf.txt");
    const crlf = path.join(fixtureRoot, "crlf.txt");
    const bad80 = path.join(fixtureRoot, "bad80.txt");
    const bad81 = path.join(fixtureRoot, "bad81.txt");
    fs.writeFileSync(lf, "line\n", "utf8");
    fs.writeFileSync(crlf, "line\r\n", "utf8");
    fs.writeFileSync(bad80, Buffer.from([0x80]));
    fs.writeFileSync(bad81, Buffer.from([0x81]));
    check(!fs.readFileSync(lf).equals(fs.readFileSync(crlf)), "raw LF and CRLF differ");
    check(sha256File(lf) === sha256File(crlf), "valid UTF-8 LF and CRLF share digest");
    check(sha256File(bad80) !== sha256File(bad81), "invalid UTF-8 bytes retain distinct digests");
    check(Boolean(utf8ValidityError(bad80)), "utf8ValidityError flags invalid UTF-8 text");
    check(utf8ValidityError(lf) === null, "utf8ValidityError accepts valid UTF-8 text");

    const packageDir = path.join(fixtureRoot, "package");
    fs.mkdirSync(packageDir);
    fs.writeFileSync(path.join(packageDir, "safe.txt"), "safe\n", "utf8");
    const manifest = buildManifest(packageDir, { generatedAt: "2000-01-01T00:00:00.000Z" });
    for (const unsafePath of ["", "/absolute", "C:/drive", "sub\\file.txt", "sub//file.txt", "./file.txt", "sub/../file.txt", "nul\0file.txt", "missing.txt"]) {
      manifest.files = { [unsafePath]: "0".repeat(64) };
      fs.writeFileSync(path.join(packageDir, MANIFEST_NAME), JSON.stringify(manifest), "utf8");
      const errors = checkManifestConsistency(packageDir);
      check(errors.length > 0, `rejects unsafe or non-walked manifest path ${JSON.stringify(unsafePath)}`);
    }
    const brokenPackage = path.join(fixtureRoot, "broken-utf8");
    fs.mkdirSync(brokenPackage);
    fs.writeFileSync(path.join(brokenPackage, "bad.txt"), Buffer.from([0xe2, 0x80, 0x3f]));
    const brokenManifest = buildManifest(brokenPackage, { generatedAt: "2000-01-01T00:00:00.000Z" });
    fs.writeFileSync(path.join(brokenPackage, MANIFEST_NAME), JSON.stringify(brokenManifest), "utf8");
    const brokenErrors = checkManifestConsistency(brokenPackage);
    check(
      brokenErrors.some((error) => error.includes("invalid UTF-8 in text file")),
      "rejects skill package text files with invalid UTF-8",
    );
    const cleanManifest = buildManifest(packageDir, { generatedAt: "2000-01-01T00:00:00.000Z" });
    fs.writeFileSync(path.join(packageDir, MANIFEST_NAME), JSON.stringify(cleanManifest), "utf8");
    const externalDir = path.join(fixtureRoot, "external");
    fs.mkdirSync(externalDir);
    fs.symlinkSync(externalDir, path.join(packageDir, "linked"), process.platform === "win32" ? "junction" : "dir");
    const symlinkErrors = checkManifestConsistency(packageDir);
    check(symlinkErrors.some((error) => error.includes("unsafe package tree")), "rejects a symlink or junction in package tree");
  } finally {
    fs.rmSync(fixtureRoot, { recursive: true, force: true });
  }
  return failed ? 1 : 0;
}

function main(argv = process.argv.slice(2)) {
  const root = repoRoot();
  if (argv.length === 1 && argv[0] === "--self-test") return runSelfTest();
  if (argv.length === 0) {
    const results = generateAll({ root });
    for (const item of results) {
      console.log(`Wrote ${path.relative(root, path.join(item.packageDir, MANIFEST_NAME)).replaceAll(path.sep, "/")} (${item.manifest.version})`);
    }
    if (results.length === 0) {
      console.error("No skill packages found under .cursor/skills or .agents/skills");
      return 1;
    }
    return 0;
  }

  let exitCode = 0;
  for (const target of argv) {
    const packageDir = path.resolve(process.cwd(), target);
    if (!fs.existsSync(packageDir) || !fs.statSync(packageDir).isDirectory()) {
      console.error(`Not a package directory: ${target}`);
      exitCode = 1;
      continue;
    }
    const manifest = writeManifest(packageDir);
    console.log(`Wrote ${path.join(packageDir, MANIFEST_NAME)} (${manifest.version}, ${Object.keys(manifest.files).length} files)`);
  }
  return exitCode;
}

module.exports = {
  MANIFEST_VERSION,
  MANIFEST_NAME,
  TEXT_EXTENSIONS,
  sha256File,
  utf8ValidityError,
  isTextExtension,
  validateManifestPath,
  walkFiles,
  listPackageSkillDirs,
  buildManifest,
  writeManifest,
  checkManifestConsistency,
  generateForSkillsRoot,
  generateAll,
  runSelfTest,
  repoRoot,
};

if (require.main === module) {
  process.exitCode = main();
}
