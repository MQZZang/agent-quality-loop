#!/usr/bin/env node

"use strict";

// Published evidence must be judged from its bytes, never from the identity of
// the machine that happens to verify it. Generation-time redaction remains in
// profile-projection-evidence-utils.js because the v2 manifests bind that file.

const STATIC_UNSAFE_CHECKS = [
  ["windows_absolute_path", /(?:^|[\s"'`([{=:<])(?:\\\\\?\\)?[A-Za-z]:[\\/]/m],
  ["windows_unc_path", /(?:^|[\s"'`([{=:<])\\\\(?![?]\\)[^\\\s"'<>|]+\\[^\\\s"'<>|]+/m],
  ["unix_user_or_temp_path", /(?:^|[\s"'`([{=:<])\/(?:home|Users|private\/tmp|tmp|var\/tmp)(?:\/|$)[^\s"'<>|)\]}]*/m],
  [
    "unix_absolute_local_path",
    /(?:^|[\s"'`([{=:<])\/(?:root|workspace|workspaces|app|data|etc|mnt|opt|srv|usr|var\/(?:lib|log|run))(?=\/|$)[^\s"'<>|)\]}]*/m,
  ],
  ["windows_host_identity", /\bDESKTOP-[A-Z0-9-]+\b/i],
  [
    "unresolved_environment_token",
    /%(?:USERPROFILE|USERNAME|USER|HOME|HOSTNAME|TEMP|TMP)%|\$\{(?:USERPROFILE|USERNAME|USER|HOME|HOSTNAME|TEMP|TMP)\}|\$(?:USERPROFILE|USERNAME|USER|HOME|HOSTNAME|TEMP|TMP)\b/,
  ],
];

function portableEvidenceKinds(value) {
  const text = String(value);
  return STATIC_UNSAFE_CHECKS
    .filter(([, expression]) => expression.test(text))
    .map(([kind]) => kind);
}

function runSelfTest() {
  const ordinary = [
    "root-cause analysis",
    "test runner identity is hash-bound",
    "administrator review",
    "user-facing result",
    "https://example.com/home/alice/guide",
    "https://example.com/tmp/cache",
    "https://example.com/C:/guide",
  ].join("\n");
  const identities = [undefined, "root", "runner", "admin", "Administrator"];
  const original = { USER: process.env.USER, USERNAME: process.env.USERNAME };
  const failures = [];
  try {
    for (const identity of identities) {
      if (identity === undefined) {
        delete process.env.USER;
        delete process.env.USERNAME;
      } else {
        process.env.USER = identity;
        process.env.USERNAME = identity;
      }
      const kinds = portableEvidenceKinds(ordinary);
      if (kinds.length > 0) failures.push(`${identity || "unset"}: ${kinds.join(", ")}`);
    }
  } finally {
    if (original.USER === undefined) delete process.env.USER;
    else process.env.USER = original.USER;
    if (original.USERNAME === undefined) delete process.env.USERNAME;
    else process.env.USERNAME = original.USERNAME;
  }

  for (const [sample, expected] of [
    ["C:\\Users\\alice\\secret.txt", "windows_absolute_path"],
    ["/home/alice/secret.txt", "unix_user_or_temp_path"],
    ["/root/.codex/auth.json", "unix_absolute_local_path"],
    ["cwd=/workspace/repo/file", "unix_absolute_local_path"],
    ["/etc/passwd", "unix_absolute_local_path"],
    ["/usr/local/bin/node", "unix_absolute_local_path"],
    ["/var/lib/data", "unix_absolute_local_path"],
    ["/data/project", "unix_absolute_local_path"],
    ["host DESKTOP-SECRET", "windows_host_identity"],
    ["path is %USERPROFILE%\\secret", "unresolved_environment_token"],
  ]) {
    if (!portableEvidenceKinds(sample).includes(expected)) failures.push(`missed ${expected}`);
  }

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL ${failure}`);
    return 1;
  }
  console.log("PASS portable evidence safety is independent of verifier identity");
  return 0;
}

if (require.main === module) {
  process.exitCode = process.argv.includes("--self-test") ? runSelfTest() : 0;
}

module.exports = { portableEvidenceKinds, runSelfTest };
