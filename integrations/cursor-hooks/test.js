#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency protocol tests for AQL cursor-hooks gates.
 * Spawns gate scripts with sample stdin payloads and asserts JSON output.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const AUTHORITY = path.join(DIR, 'aql-authority-gate.js');
const STOP = path.join(DIR, 'aql-stop-gate.js');
const SAMPLE_ENVELOPE = path.join(DIR, 'sample-envelope.json');

let passed = 0;
let failed = 0;
const failures = [];
let fixtureRoot;

function assert(cond, name, detail) {
  if (cond) {
    passed += 1;
    console.log('PASS  ' + name);
  } else {
    failed += 1;
    failures.push(name + (detail ? ' — ' + detail : ''));
    console.log('FAIL  ' + name + (detail ? ' — ' + detail : ''));
  }
}

function mkWorkspace(label) {
  const root = path.join(fixtureRoot, label);
  fs.mkdirSync(root, { recursive: true });
  return root;
}

function writeEnvelope(workspace, envelope) {
  const dir = path.join(workspace, '.agent-quality-loop');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'envelope.json'),
    JSON.stringify(envelope, null, 2),
    'utf8'
  );
}

function runGate(script, payload, envExtra) {
  const env = Object.assign({}, process.env, envExtra || {});
  // Ensure DISABLE from parent does not leak unless explicitly set.
  if (!envExtra || !Object.prototype.hasOwnProperty.call(envExtra, 'AQL_HOOKS_DISABLE')) {
    delete env.AQL_HOOKS_DISABLE;
  }
  const result = spawnSync(process.execPath, [script], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: env,
    timeout: 15000,
    windowsHide: true,
  });
  let json = null;
  let parseError = null;
  try {
    json = result.stdout && result.stdout.trim() ? JSON.parse(result.stdout) : null;
  } catch (err) {
    parseError = String(err && err.message ? err.message : err);
  }
  return {
    status: result.status,
    stdout: result.stdout || '',
    stderr: result.stderr || '',
    json: json,
    parseError: parseError,
  };
}

function basePayload(workspace, extra) {
  return Object.assign(
    {
      conversation_id: 'test-conv',
      generation_id: 'test-gen',
      model: 'test-model',
      cursor_version: 'test',
      workspace_roots: [workspace],
      user_email: null,
      transcript_path: null,
    },
    extra || {}
  );
}

function releaseActEnvelope(overrides) {
  return Object.assign(
    {
      schema_version: 'agent-quality-loop/v2',
      intent: 'release',
      mode: 'release',
      phase: 'RELEASE_READY',
      action_authority: 'release',
      release_intent: 'act',
      evidence_refs: ['preflight'],
      release_authorization: {
        authorized_this_turn: true,
        environment: 'production',
        operation: 'push release tag',
        targets: ['origin/main'],
        expected_effects: ['remote branch update'],
        principal_or_role: 'release manager',
        rollback: 'revert the release commit',
        manual_checks: ['confirm deployment'],
        expires_on: 'current turn only',
      },
    },
    overrides || {}
  );
}

async function main() {
fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aql-hooks-suite-'));
try {
// --- 0. Fixture labels its intentionally incomplete contract shape ---
{
  const fixture = JSON.parse(fs.readFileSync(SAMPLE_ENVELOPE, 'utf8'));
  assert(
    fixture.schema_version === 'agent-quality-loop/v2' &&
      fixture._fixture_note === 'Hooks-only fixture; not a valid AQL envelope.' &&
      Object.prototype.hasOwnProperty.call(fixture, 'first_principles_goal') &&
      Array.isArray(fixture.scope_allowlist) &&
      !Object.prototype.hasOwnProperty.call(fixture, 'goal') &&
      !Object.prototype.hasOwnProperty.call(fixture, 'scope'),
    'hooks fixture uses canonical field names and declares incompleteness'
  );
}

// --- 1. No envelope → allow ---
{
  const ws = mkWorkspace('noenv');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(r.status === 0, 'no-envelope: exit 0', 'status=' + r.status);
  assert(
    r.json && r.json.permission === 'allow',
    'no-envelope: permission allow',
    JSON.stringify(r.json)
  );
}

// --- 2. read authority rejects git push ---
{
  const ws = mkWorkspace('read-push');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'read',
    phase: 'EVIDENCED',
    evidence_refs: ['x'],
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(r.status === 0, 'read-deny-push: exit 0', 'status=' + r.status);
  assert(
    r.json && r.json.permission === 'deny',
    'read-deny-push: permission deny',
    JSON.stringify(r.json)
  );
  assert(
    r.json &&
      typeof r.json.user_message === 'string' &&
      /action_authority/.test(r.json.user_message) &&
      /release/i.test(r.json.user_message),
    'read-deny-push: deny message mentions authority unlock',
    r.json && r.json.user_message
  );
}

// --- 3. local_write rejects npm publish ---
{
  const ws = mkWorkspace('lw-publish');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'local_write',
    phase: 'BUILT',
    evidence_refs: ['cmd:test'],
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'npm publish',
      cwd: ws,
    })
  );
  assert(
    r.json && r.json.permission === 'deny',
    'local_write-deny-publish: permission deny',
    JSON.stringify(r.json)
  );
}

// --- 4. DISABLE=1 allows push under read ---
{
  const ws = mkWorkspace('disable');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'read',
    phase: 'EVIDENCED',
    evidence_refs: [],
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
    { AQL_HOOKS_DISABLE: '1' }
  );
  assert(
    r.json && r.json.permission === 'allow',
    'disable-env: permission allow',
    JSON.stringify(r.json)
  );
}

// --- 4a. release authority still needs a current-turn authorization ---
{
  const ws = mkWorkspace('release-no-auth');
  writeEnvelope(ws, {
    schema_version: 'agent-quality-loop/v2',
    action_authority: 'release',
    phase: 'RELEASE_READY',
    evidence_refs: ['preflight'],
    release_authorization: null,
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(
    r.json && r.json.permission === 'deny' && /explicit release route/i.test(r.json.user_message),
    'release-deny-push-without-current-authorization',
    JSON.stringify(r.json)
  );
}

// --- 4aa. external writes require every release-route and authorization invariant ---
for (const [label, override] of [
  ['wrong-intent', { intent: 'implement' }],
  ['wrong-mode', { mode: 'full' }],
  ['wrong-phase', { phase: 'ACCEPTED' }],
  ['wrong-authority', { action_authority: 'external_write' }],
  ['wrong-release-intent', { release_intent: 'preflight' }],
  ['missing-environment', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { environment: '' }) }],
  ['empty-targets', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { targets: [] }) }],
  ['empty-manual-checks', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { manual_checks: [''] }) }],
  ['nested-empty-manual-checks', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { manual_checks: { approval: '' } }) }],
  ['nested-empty-rollback', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { rollback: { steps: ['  '] } }) }],
  ['expired-iso', { release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, { expires_on: '2000-01-01T00:00:00.000Z' }) }],
]) {
  const ws = mkWorkspace('release-' + label);
  writeEnvelope(ws, releaseActEnvelope(override));
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(
    r.json && r.json.permission === 'deny',
    'release-deny-' + label,
    JSON.stringify(r.json)
  );
}

{
  const ws = mkWorkspace('release-valid-nested');
  writeEnvelope(ws, releaseActEnvelope({
    release_authorization: Object.assign({}, releaseActEnvelope().release_authorization, {
      rollback: { steps: ['revert commit'], owner: 'release manager' },
      manual_checks: { approval: 'confirmed', checks: ['reviewed'] },
    }),
  }));
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(r.json && r.json.permission === 'allow', 'release-allow-complete-nested-authorization', JSON.stringify(r.json));
}

{
  const ws = mkWorkspace('release-valid');
  writeEnvelope(ws, releaseActEnvelope());
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assert(r.json && r.json.permission === 'allow', 'release-allow-complete-explicit-route', JSON.stringify(r.json));
}

// --- 4b. read blocks Write tool via preToolUse ---
{
  const ws = mkWorkspace('read-write-tool');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'read',
    phase: 'ALIGNED',
    evidence_refs: [],
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'preToolUse',
      tool_name: 'Write',
      tool_input: { path: 'x.txt', contents: 'hi' },
      cwd: ws,
    })
  );
  assert(
    r.json && r.json.permission === 'deny',
    'read-deny-Write-tool: permission deny',
    JSON.stringify(r.json)
  );
}

// --- 4c. local_write allows Write tool ---
{
  const ws = mkWorkspace('lw-write-tool');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'local_write',
    phase: 'BUILT',
    evidence_refs: ['e1'],
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'preToolUse',
      tool_name: 'Write',
      tool_input: { path: 'x.txt', contents: 'hi' },
      cwd: ws,
    })
  );
  assert(
    r.json && r.json.permission === 'allow',
    'local_write-allow-Write-tool: permission allow',
    JSON.stringify(r.json)
  );
}

// --- 5. stop gate bounce when BUILT + empty evidence_refs ---
{
  const ws = mkWorkspace('stop-bounce');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'local_write',
    phase: 'BUILT',
    evidence_refs: [],
  });
  const r = runGate(
    STOP,
    basePayload(ws, {
      hook_event_name: 'stop',
      status: 'completed',
      loop_count: 0,
    })
  );
  assert(r.status === 0, 'stop-bounce: exit 0', 'status=' + r.status);
  assert(
    r.json &&
      r.json.followup_message ===
        'completion claimed without evidence refs in envelope',
    'stop-bounce: followup_message exact',
    JSON.stringify(r.json)
  );
  assert(
    fs.existsSync(path.join(ws, '.agent-quality-loop', '.stop-gate-fired')),
    'stop-bounce: marker file created'
  );
}

// --- 6. stop gate anti-loop ---
{
  const ws = mkWorkspace('stop-loop');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'local_write',
    phase: 'ACCEPTED',
    evidence_refs: [],
  });
  fs.writeFileSync(
    path.join(ws, '.agent-quality-loop', '.stop-gate-fired'),
    'already\n',
    'utf8'
  );
  const r = runGate(
    STOP,
    basePayload(ws, {
      hook_event_name: 'stop',
      status: 'completed',
      loop_count: 1,
    })
  );
  assert(
    r.json &&
      (!r.json.followup_message || r.json.followup_message === ''),
    'stop-anti-loop: no followup bounce',
    JSON.stringify(r.json)
  );
  assert(
    r.json &&
      typeof r.json._aql_note === 'string' &&
      /already fired/i.test(r.json._aql_note),
    'stop-anti-loop: note present',
    JSON.stringify(r.json)
  );
}

// --- 7. BUILT with evidence → allow ---
{
  const ws = mkWorkspace('stop-ok');
  writeEnvelope(ws, {
    schema_version: '1.0.0',
    action_authority: 'local_write',
    phase: 'BUILT',
    evidence_refs: ['integrations/cursor-hooks/test.js#exit0'],
  });
  const r = runGate(
    STOP,
    basePayload(ws, {
      hook_event_name: 'stop',
      status: 'completed',
      loop_count: 0,
    })
  );
  assert(
    r.json &&
      (!r.json.followup_message || r.json.followup_message === ''),
    'stop-with-evidence: allow (no followup)',
    JSON.stringify(r.json)
  );
}

// --- 8. stop with no envelope → allow ---
{
  const ws = mkWorkspace('stop-noenv');
  const r = runGate(
    STOP,
    basePayload(ws, {
      hook_event_name: 'stop',
      status: 'completed',
      loop_count: 0,
    })
  );
  assert(
    r.json &&
      (!r.json.followup_message || r.json.followup_message === ''),
    'stop-no-envelope: allow',
    JSON.stringify(r.json)
  );
}

console.log('');
console.log('Passed: ' + passed + '  Failed: ' + failed);
if (failed > 0) {
  console.log('Failures:');
  for (const f of failures) console.log('  - ' + f);
  process.exitCode = 1;
}
} finally {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
  console.log('Fixture root cleaned: ' + !fs.existsSync(fixtureRoot));
}
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exitCode = 1;
});
