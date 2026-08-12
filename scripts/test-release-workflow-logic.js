#!/usr/bin/env node

"use strict";

/**
 * Local simulation helper for release.yml SHA-alignment gate (Simulation D).
 * Does not call GitHub APIs or create releases.
 */

const assert = require("assert");

/**
 * Mirror of the release job's refuse conditions.
 * @param {{
 *   eventName: "push" | "workflow_dispatch",
 *   checkoutSha: string,
 *   tagSha: string,
 *   ubuntuSha: string,
 *   windowsSha: string,
 *   githubSha: string,
 * }} input
 * @returns {{ ok: boolean, reason?: string }}
 */
function evaluateShaAlignment(input) {
  const { eventName, checkoutSha, tagSha, ubuntuSha, windowsSha, githubSha } = input;

  if (!ubuntuSha || !windowsSha) {
    return { ok: false, reason: "Missing platform validation markers" };
  }
  if (ubuntuSha !== windowsSha) {
    return { ok: false, reason: "Ubuntu and Windows validated SHAs differ; refusing release" };
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

  check(
    "aligned tag-push accepts",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaA,
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
      githubSha: shaB,
    }),
    true,
  );

  check(
    "ubuntu/windows mismatch refuses",
    evaluateShaAlignment({
      eventName: "push",
      checkoutSha: shaA,
      tagSha: shaA,
      ubuntuSha: shaA,
      windowsSha: shaB,
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
      githubSha: shaA,
    }),
    false,
  );

  assert.strictEqual(typeof evaluateShaAlignment, "function");
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
