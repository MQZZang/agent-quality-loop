#!/usr/bin/env node
'use strict';

/**
 * Zero-dependency protocol tests for AQL cursor-hooks gates.
 * Spawns gate scripts with sample stdin payloads and asserts JSON output.
 */

const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const DIR = __dirname;
const AUTHORITY = path.join(DIR, 'aql-authority-gate.js');
const STOP = path.join(DIR, 'aql-stop-gate.js');
const SAMPLE_ENVELOPE = path.join(DIR, 'sample-envelope.json');
const VALIDATOR = path.join(DIR, '../../.cursor/skills/agent-quality-loop/scripts/validate-envelope.js');
const ENVELOPE_WRITER = path.join(DIR, '../../.cursor/skills/agent-quality-loop/scripts/aql-envelope.js');

const {
  baseEnvelope,
  passingGate,
  validateEnvelope,
  validateReleaseActEnvelope,
} = require(VALIDATOR);
const { writeEnvelope: writeEnvelopeCache } = require(ENVELOPE_WRITER);

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

function writeEnvelopeJson(workspace, envelope) {
  const dir = path.join(workspace, '.agent-quality-loop');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, 'envelope.json'),
    JSON.stringify(envelope, null, 2),
    'utf8'
  );
}

function ensurePresentFile(workspace) {
  fs.writeFileSync(path.join(workspace, 'present.txt'), 'ok\n', 'utf8');
}

function buildFullReleaseActEnvelope(workspace, command, overrides) {
  const cmd = command || 'git push origin main';
  const envelope = baseEnvelope();
  envelope.intent = 'release';
  envelope.mode = 'release';
  envelope.phase = 'RELEASE_READY';
  envelope.verdict = 'PASS';
  envelope.action_authority = 'release';
  envelope.release_intent = 'act';
  envelope.next_allowed_phase = 'DEPLOYED';
  envelope.executor_adapter = 'ask-plan-code-qa/embedded';
  envelope.artifact_refs = ['./present.txt'];
  envelope.evidence_refs = ['preflight@evidence'];
  envelope.acceptance_gate = passingGate('acceptance');
  envelope.release_gate = passingGate('release');
  envelope.acceptance_independence = {
    implementer_context_ref: 'implementer-task',
    acceptor_context_ref: 'acceptor-task',
    relation: 'fresh_context',
    separation_evidence_ref: 'source:fresh-acceptor-handoff',
    raw_evidence_before_implementer_narrative: true,
  };
  envelope.release_authorization = releaseAuth(
    workspace,
    cmd,
    overrides && overrides._authOverrides,
    overrides && overrides._planOverrides,
  );
  envelope.side_effect_coverage = {
    command: cmd,
    mode: 'actual_action',
    paths: [
      {
        path: 'remote push',
        effect: 'repository mutation',
        expected_and_authorized: true,
        rollback_ref: 'revert commit',
        evidence_ref: 'source:remote-push',
      },
    ],
    all_paths_accounted_for: true,
    all_external_effects_short_circuited: false,
  };
  if (overrides) {
    const authOverride = overrides._authOverrides;
    const planOverride = overrides._planOverrides;
    delete overrides._authOverrides;
    delete overrides._planOverrides;
    Object.assign(envelope, overrides);
    if (authOverride || planOverride) {
      envelope.release_authorization = releaseAuth(workspace, cmd, authOverride, planOverride);
    }
  }
  return envelope;
}

function writeReleaseEnvelopeChain(workspace, command, overrides) {
  ensurePresentFile(workspace);
  const cmd = command || 'git push origin main';
  const envelope = buildFullReleaseActEnvelope(workspace, cmd, overrides);
  const structural = validateEnvelope(envelope);
  if (structural.length > 0) {
    throw new Error('fixture validateEnvelope failed: ' + structural.join('; '));
  }
  const releaseErrors = validateReleaseActEnvelope(envelope, {
    workspaceRoot: fs.realpathSync(path.resolve(workspace)),
    command: cmd,
    cwdRealpath: fs.realpathSync(path.resolve(workspace)),
    now: Date.now(),
  });
  if (releaseErrors.length > 0) {
    throw new Error('fixture validateReleaseActEnvelope failed: ' + releaseErrors.join('; '));
  }
  writeEnvelopeCache(workspace, envelope);
  return envelope;
}

function releaseActEnvelope(workspace, overrides, command) {
  return buildFullReleaseActEnvelope(workspace, command || 'git push origin main', overrides);
}

function runGate(script, payload, envExtra) {
  return runGateRaw(script, JSON.stringify(payload), envExtra);
}

function runGateRaw(script, input, envExtra) {
  const env = Object.assign({}, process.env);
  // Parent env must not leak into fixtures unless explicitly set.
  delete env.AQL_HOOKS_DISABLE;
  delete env.AQL_HOOKS_TEST_THROW;
  delete env.AQL_HOOKS_EXTERNAL_WRITE_PATTERN;
  delete env.AQL_HOOKS_CONFIG;
  if (envExtra) Object.assign(env, envExtra);
  const result = spawnSync(process.execPath, [script], {
    input: input,
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

function sha256(command) {
  return crypto.createHash('sha256').update(command, 'utf8').digest('hex');
}

function executionPlanFor(workspace, command, overrides) {
  const issued = new Date();
  const expires = new Date(issued.getTime() + 10 * 60 * 1000);
  const cwd = fs.realpathSync(path.resolve(workspace));
  return Object.assign(
    {
      host: 'cursor',
      cwd_realpath: cwd,
      command: command,
      command_sha256: sha256(command),
      issued_at: issued.toISOString(),
      expires_at: expires.toISOString(),
    },
    overrides || {}
  );
}

function releaseAuth(workspace, command, authOverrides, planOverrides) {
  const cmd = command || 'git push origin main';
  return Object.assign(
    {
      authorized_this_turn: true,
      environment: 'production',
      operation: 'push release tag',
      targets: ['origin/main'],
      expected_effects: ['remote branch update'],
      principal_or_role: 'release manager',
      rollback: 'revert the release commit',
      manual_checks: ['confirm deployment'],
      expires_on: 'current turn only',
      execution_plan: executionPlanFor(workspace, cmd, planOverrides),
    },
    authOverrides || {}
  );
}

function assertAsk(r, name) {
  assert(r.status === 0, name + ': exit 0', 'status=' + r.status);
  assert(
    r.json &&
      r.json.permission === 'ask' &&
      r.json.user_message ===
        'AQL release plan matches this exact command. Confirm this external action.' &&
      r.json.agent_message ===
        "Await the user's native confirmation. Do not alter or broaden the command.",
    name + ': permission ask + messages',
    JSON.stringify(r.json)
  );
}

function assertDeny(r, name) {
  assert(r.status === 0, name + ': exit 0', 'status=' + r.status);
  assert(
    r.json && r.json.permission === 'deny',
    name + ': permission deny',
    JSON.stringify(r.json)
  );
}

function assertExit2Deny(r, name) {
  assert(r.status === 2, name + ': exit 2', 'status=' + r.status);
  assert(
    r.json && r.json.permission === 'deny',
    name + ': permission deny',
    JSON.stringify(r.json)
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

// --- non-external -> allow ---
{
  const ws = mkWorkspace('non-external');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git status',
      cwd: ws,
    })
  );
  assert(r.status === 0, 'non-external: exit 0', 'status=' + r.status);
  assert(
    r.json && r.json.permission === 'allow',
    'non-external: permission allow',
    JSON.stringify(r.json)
  );
}

// --- external + no envelope -> deny ---
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
  assertDeny(r, 'external-no-envelope');
}

// --- preToolUse Shell tool_input.command must classify as external ---
{
  const ws = mkWorkspace('noenv-pretool');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'preToolUse',
      tool_name: 'Shell',
      tool_input: { command: 'git push origin main' },
      cwd: ws,
    })
  );
  assertDeny(r, 'external-no-envelope-preToolUse-tool_input');
}

// --- missing hook_event_name + tool_input.command must still deny without envelope ---
{
  const ws = mkWorkspace('noenv-no-event');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      tool_name: 'Shell',
      tool_input: { command: 'git push origin main' },
      cwd: ws,
    })
  );
  assertDeny(r, 'external-no-envelope-missing-hook_event_name');
}

// --- external + malformed envelope -> deny ---
{
  const ws = mkWorkspace('malformed-env');
  const dir = path.join(ws, '.agent-quality-loop');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'envelope.json'), '{not-json', 'utf8');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'external-malformed-envelope');
}

// --- external + schema-invalid -> deny ---
{
  const ws = mkWorkspace('schema-invalid');
  writeEnvelopeJson(ws, {
    schema_version: 'agent-quality-loop/v2',
    action_authority: 123,
    phase: 'RELEASE_READY',
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'external-schema-invalid');
}

// --- 2. read authority rejects git push ---
{
  const ws = mkWorkspace('read-push');
  writeEnvelopeJson(ws, {
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
  assert(
    r.json &&
      typeof r.json.user_message === 'string' &&
      r.json.permission === 'deny',
    'read-deny-push: permission deny for external under read/incomplete envelope',
    r.json && r.json.user_message
  );
}

// --- 3. local_write rejects npm publish ---
{
  const ws = mkWorkspace('lw-publish');
  writeEnvelopeJson(ws, {
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
  assertDeny(r, 'local_write-deny-publish');
}

// --- 4. DISABLE=1 allows push under read ---
{
  const ws = mkWorkspace('disable');
  writeEnvelopeJson(ws, {
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
  writeEnvelopeJson(ws, {
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
    r.json && r.json.permission === 'deny' && /release|authorization|contract_id|schema_version/i.test(r.json.user_message),
    'release-deny-push-without-current-authorization',
    JSON.stringify(r.json)
  );
}

// --- 4aa. external writes require every release-route and authorization invariant ---
for (const [label, overrideFn] of [
  ['wrong-intent', (ws) => ({ intent: 'implement' })],
  ['wrong-mode', (ws) => ({ mode: 'full' })],
  ['wrong-phase', (ws) => ({ phase: 'ACCEPTED' })],
  ['wrong-authority', (ws) => ({ action_authority: 'external_write' })],
  ['wrong-release-intent', (ws) => ({ release_intent: 'preflight' })],
  ['missing-environment', (ws) => ({ _authOverrides: { environment: '' } })],
  ['empty-targets', (ws) => ({ _authOverrides: { targets: [] } })],
  ['empty-manual-checks', (ws) => ({ _authOverrides: { manual_checks: [''] } })],
  ['nested-empty-manual-checks', (ws) => ({
    _authOverrides: { manual_checks: { approval: '' } },
  })],
  ['nested-empty-rollback', (ws) => ({
    _authOverrides: { rollback: { steps: ['  '] } },
  })],
  ['expired-iso', (ws) => ({
    _authOverrides: { expires_on: '2000-01-01T00:00:00.000Z' },
  })],
]) {
  const ws = mkWorkspace('release-' + label);
  ensurePresentFile(ws);
  writeEnvelopeJson(ws, releaseActEnvelope(ws, overrideFn(ws)));
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

// --- exact command + exact cwd + valid plan -> ask ---
{
  const ws = mkWorkspace('release-valid-nested');
  writeReleaseEnvelopeChain(ws, 'git push origin main', {
    _authOverrides: {
      rollback: { steps: ['revert commit'], owner: 'release manager' },
      manual_checks: { approval: 'confirmed', checks: ['reviewed'] },
    },
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertAsk(r, 'release-ask-complete-nested-authorization');
}

{
  const ws = mkWorkspace('release-valid');
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertAsk(r, 'release-ask-complete-explicit-route');
}

// --- same command + different cwd -> deny ---
{
  const ws = mkWorkspace('cwd-a');
  const other = mkWorkspace('cwd-b');
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: other,
    })
  );
  assertDeny(r, 'same-command-different-cwd');
}

// --- different command -> deny ---
{
  const ws = mkWorkspace('diff-cmd');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin develop',
      cwd: ws,
    })
  );
  assertDeny(r, 'different-command');
}

// --- extra whitespace -> deny ---
{
  const ws = mkWorkspace('whitespace');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push  origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'extra-whitespace');
}

// --- different remote -> deny ---
{
  const ws = mkWorkspace('diff-remote');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push upstream main',
      cwd: ws,
    })
  );
  assertDeny(r, 'different-remote');
}

// --- different branch -> deny ---
{
  const ws = mkWorkspace('diff-branch');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin feature',
      cwd: ws,
    })
  );
  assertDeny(r, 'different-branch');
}

// --- git-push auth + npm publish -> deny ---
{
  const ws = mkWorkspace('push-auth-npm');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'npm publish',
      cwd: ws,
    })
  );
  assertDeny(r, 'git-push-auth-npm-publish');
}

// --- git-push auth + aws destructive -> deny ---
{
  const ws = mkWorkspace('push-auth-aws');
  writeReleaseEnvelopeChain(ws, 'git push origin main');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'aws s3 rm s3://bucket --recursive',
      cwd: ws,
    })
  );
  assertDeny(r, 'git-push-auth-aws-destructive');
}

// --- non-ISO expires_at -> deny ---
{
  const ws = mkWorkspace('non-iso-expires');
  ensurePresentFile(ws);
  writeEnvelopeJson(
    ws,
    releaseActEnvelope(ws, {
      _planOverrides: { expires_at: 'current turn only' },
    }),
  );
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'non-ISO-expires_at');
}

// --- expired expires_at -> deny ---
{
  const ws = mkWorkspace('expired-plan');
  const issued = new Date(Date.now() - 20 * 60 * 1000);
  const expires = new Date(Date.now() - 5 * 60 * 1000);
  ensurePresentFile(ws);
  writeEnvelopeJson(
    ws,
    releaseActEnvelope(ws, {
      _planOverrides: {
        issued_at: issued.toISOString(),
        expires_at: expires.toISOString(),
      },
    }),
  );
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'expired-expires_at');
}

// --- expires_at beyond 15m TTL -> deny ---
{
  const ws = mkWorkspace('ttl-over');
  const issued = new Date();
  const expires = new Date(issued.getTime() + 16 * 60 * 1000);
  ensurePresentFile(ws);
  writeEnvelopeJson(
    ws,
    releaseActEnvelope(ws, {
      _planOverrides: {
        issued_at: issued.toISOString(),
        expires_at: expires.toISOString(),
      },
    }),
  );
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'expires_at-beyond-15m-TTL');
}

// --- authorized_this_turn alone -> deny ---
{
  const ws = mkWorkspace('auth-alone');
  writeEnvelopeJson(ws, {
    schema_version: 'agent-quality-loop/v2',
    intent: 'release',
    mode: 'release',
    phase: 'RELEASE_READY',
    action_authority: 'release',
    release_intent: 'act',
    evidence_refs: ['preflight'],
    release_authorization: {
      authorized_this_turn: true,
    },
  });
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    })
  );
  assertDeny(r, 'authorized_this_turn-alone');
}

// --- config missing -> exit 2 ---
{
  const ws = mkWorkspace('config-missing');
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
    { AQL_HOOKS_CONFIG: path.join(fixtureRoot, 'missing-gates-config.json') },
  );
  assertExit2Deny(r, 'config-missing');
}

// --- config malformed -> exit 2 ---
{
  const ws = mkWorkspace('config-malformed');
  const badConfig = path.join(fixtureRoot, 'malformed-gates.config.json');
  fs.writeFileSync(badConfig, '{not-json', 'utf8');
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
    { AQL_HOOKS_CONFIG: badConfig },
  );
  assertExit2Deny(r, 'config-malformed');
}

// --- validator unavailable -> exit 2 ---
{
  const ws = mkWorkspace('validator-unavailable');
  const isolatedDir = path.join(fixtureRoot, 'isolated-hook');
  fs.mkdirSync(isolatedDir, { recursive: true });
  fs.copyFileSync(AUTHORITY, path.join(isolatedDir, 'aql-authority-gate.js'));
  fs.copyFileSync(path.join(DIR, 'gates.config.json'), path.join(isolatedDir, 'gates.config.json'));
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    path.join(isolatedDir, 'aql-authority-gate.js'),
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
  );
  assertExit2Deny(r, 'validator-unavailable');
}

// --- canonical-invalid independence -> deny ---
{
  const ws = mkWorkspace('canonical-invalid');
  ensurePresentFile(ws);
  writeEnvelopeJson(
    ws,
    releaseActEnvelope(ws, {
      acceptance_independence: {
        implementer_context_ref: 'implementer-task',
        acceptor_context_ref: 'acceptor-task',
        relation: 'different_role',
        separation_evidence_ref: 'source:role-switch',
        raw_evidence_before_implementer_narrative: true,
      },
    }),
  );
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
  );
  assertDeny(r, 'canonical-invalid-independence');
}

// --- stale head (current digest != chain head) -> deny ---
{
  const ws = mkWorkspace('stale-head');
  writeReleaseEnvelopeChain(ws);
  const currentPath = path.join(ws, '.agent-quality-loop', 'envelope.json');
  const stale = JSON.parse(fs.readFileSync(currentPath, 'utf8'));
  stale.phase = 'ACCEPTED';
  fs.writeFileSync(currentPath, `${JSON.stringify(stale, null, 2)}\n`, 'utf8');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
  );
  assertDeny(r, 'stale-head');
}

// --- invalid policy regex -> exit 2 ---
{
  const ws = mkWorkspace('bad-regex');
  writeReleaseEnvelopeChain(ws);
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git push origin main',
      cwd: ws,
    }),
    { AQL_HOOKS_EXTERNAL_WRITE_PATTERN: '[invalid' }
  );
  assertExit2Deny(r, 'invalid-policy-regex');
}

// --- invalid stdin JSON -> exit 2 ---
{
  const r = runGateRaw(AUTHORITY, '{not-valid-json', {});
  assertExit2Deny(r, 'invalid-stdin-JSON');
}

// --- unexpected internal exception -> exit 2 ---
{
  const ws = mkWorkspace('throw');
  const r = runGate(
    AUTHORITY,
    basePayload(ws, {
      hook_event_name: 'beforeShellExecution',
      command: 'git status',
      cwd: ws,
    }),
    { AQL_HOOKS_TEST_THROW: '1' }
  );
  assertExit2Deny(r, 'unexpected-internal-exception');
}

// --- 4b. read blocks Write tool via preToolUse ---
{
  const ws = mkWorkspace('read-write-tool');
  writeEnvelopeJson(ws, {
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
  writeEnvelopeJson(ws, {
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
  writeEnvelopeJson(ws, {
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
  writeEnvelopeJson(ws, {
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
  writeEnvelopeJson(ws, {
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
