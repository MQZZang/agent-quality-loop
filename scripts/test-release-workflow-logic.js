#!/usr/bin/env node

"use strict";

/**
 * Local simulation helper for release.yml SHA-alignment gate (Simulation D).
 * Does not call GitHub APIs or create releases.
 */

const assert = require("assert");
const { validateReleaseTag } = require("./release-version");
const { buildAttestation } = require("./gen-release-attestation");

/**
 * Mirror of the release job's refuse conditions.
 * @param {{
 *   eventName: "push" | "workflow_dispatch",
 *   checkoutSha: string,
 *   tagSha: string,
 *   ubuntuSha: string,
 *   windowsSha: string,
 *   macosSha: string,
 *   githubSha: string,
 * }} input
 * @returns {{ ok: boolean, reason?: string }}
 */
function evaluateShaAlignment(input) {
  const { eventName, checkoutSha, tagSha, ubuntuSha, windowsSha, macosSha, githubSha } = input;

  if (!ubuntuSha || !windowsSha || !macosSha) {
    return { ok: false, reason: "Missing platform validation markers" };
  }
  if (ubuntuSha !== windowsSha || ubuntuSha !== macosSha) {
    return { ok: false, reason: "Ubuntu, Windows, and macOS validated SHAs differ; refusing release" };
  }
  if (checkoutSha !== tagSha || checkoutSha !== ubuntuSha) {
    return { ok: false, reason: "Tag / checkout / validated SHA mismatch; refusing release" };
  }
  if (eventName === "push" && checkoutSha !== githubSha) {
    return { ok: false, reason: "GITHUB_SHA does not match validated tag SHA on tag push; refusing release" };
  }
  return { ok: true };
}

function runSelfTest() {
  const shaA = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
  const shaB = "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb";
  let failed = 0;

  function check(label, actual, expectedOk) {
    const pass = actual.ok === expectedOk;
    console.log(`${pass ? "PASS" : "FAIL"} ${label}${actual.reason ? ` (${actual.reason})` : ""}`);
    if (!pass) failed += 1;
  }

  function checkTag(label, tag, expectedOk) {
    let actual;
    try {
      actual = validateReleaseTag(tag);
    } catch (error) {
      actual = { ok: false, reason: error.message };
    }
    check(label, actual, expectedOk);
  }

  checkTag("packaged version tag accepts", "v3.1.1", true);
  checkTag("mismatched package version refuses", "v3.1.2", false);
  checkTag("shell substitution tag refuses", "v3.1.1$(id)", false);
  checkTag("newline tag refuses", "v3.1.1\nextra", false);
  checkTag("whitespace-padded tag refuses", " v3.1.1 ", false);

  try {
    const attestation = buildAttestation({
      tag: "v3.1.1",
      commit: shaA,
      ubuntu: "PASS",
      windows: "PASS",
      macos: "PASS",
    });
    assert.strictEqual(attestation.package_version, "3.1.1");
    assert.strictEqual(attestation.tag, "v3.1.1");
    assert.throws(
      () => buildAttestation({ tag: "v3.1.2", commit: shaA, ubuntu: "PASS", windows: "PASS", macos: "PASS" }),
      /packaged version v3\.1\.1/,
    );
    console.log("PASS attestation binds exact package version tag");
  } catch (error) {
    console.log(`FAIL attestation binds exact package version tag (${error.message})`);
    failed += 1;
  }

  check(
    "aligned tag-push accepts",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaA,
      macosSha: shaA,
      githubSha: shaA,
    }),
    true,
  );

  check(
    "workflow_dispatch accepts when markers match tag even if githubSha differs",
    evaluateShaAlignment({
      eventName: "workflow_dispatch",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaA,
      macosSha: shaA,
      githubSha: shaB,
    }),
    true,
  );

  check(
    "platform mismatch refuses",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaB,
      macosSha: shaA,
      githubSha: shaA,
    }),
    false,
  );

  check(
    "checkout/tag mismatch refuses",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaB,
      ubuntuSha: shaA,
      windowsSha: shaA,
      macosSha: shaA,
      githubSha: shaA,
    }),
    false,
  );

  check(
    "tag-push githubSha mismatch refuses",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaA,
      macosSha: shaA,
      githubSha: shaB,
    }),
    false,
  );

  check(
    "empty marker refuses",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: "",
      windowsSha: shaA,
      macosSha: shaA,
      githubSha: shaA,
    }),
    false,
  );

  assert.strictEqual(typeof evaluateShaAlignment, "function");
  assert.strictEqual(typeof validateReleaseTag, "function");
  return failed === 0 ? 0 : 1;
}

function main() {
  return runSelfTest();
}

if (require.main === module) {
  process.exitCode = main();
}

module.exports = {
  evaluateShaAlignment,
  runSelfTest,
  main,
};
