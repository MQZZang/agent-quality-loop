"use strict";

const fs = require("fs");
const path = require("path");

const MANIFEST_PATH = path.join(
  path.resolve(__dirname, ".."),
  ".cursor",
  "skills",
  "agent-quality-loop",
  "manifest.json",
);

function packageVersion() {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (!manifest || typeof manifest.version !== "string" || !/^\d+\.\d+\.\d+$/.test(manifest.version)) {
    throw new Error("skill manifest version must be semver-like major.minor.patch");
  }
  return manifest.version;
}

function validateReleaseTag(tag) {
  const value = typeof tag === "string" ? tag : "";
  if (!/^v\d+\.\d+\.\d+$/.test(value)) {
    return { ok: false, reason: "release tag must match v<major>.<minor>.<patch>" };
  }
  const expectedTag = `v${packageVersion()}`;
  if (value !== expectedTag) {
    return { ok: false, reason: `release tag must match packaged version ${expectedTag}` };
  }
  return { ok: true, tag: value, expectedTag };
}

function main(argv = process.argv.slice(2)) {
  const result = validateReleaseTag(argv[0]);
  if (!result.ok) {
    console.error(`FAIL ${result.reason}`);
    return 1;
  }
  console.log(`PASS ${result.tag}`);
  return 0;
}

if (require.main === module) process.exitCode = main();

module.exports = { MANIFEST_PATH, packageVersion, validateReleaseTag, main };
