#!/usr/bin/env node
'use strict';

/**
 * AQL authority gate — Cursor hooks (preToolUse / beforeShellExecution).
 * Deterministic enforcement for decidable envelope authority invariants.
 * Undecidable / missing inputs → allow + warning (fail-open in logic).
 */

const fs = require('fs');
const path = require('path');

function readStdin() {
  return new Promise((resolve, reject) => {
    const chunks = [];
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (c) => chunks.push(c));
    process.stdin.on('end', () => resolve(chunks.join('')));
    process.stdin.on('error', reject);
  });
}

function emit(obj) {
  process.stdout.write(JSON.stringify(obj));
}

function allow(extra) {
  emit(Object.assign({ permission: 'allow' }, extra || {}));
}

function deny(message) {
  emit({
    permission: 'deny',
    user_message: message,
    agent_message: message,
  });
}

function loadConfig() {
  const configPath = path.join(__dirname, 'gates.config.json');
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return {
      _loadError: String(err && err.message ? err.message : err),
      writeTools: ['Write', 'Delete', 'EditNotebook', 'StrReplace'],
      externalWriteCommandPattern:
        '(git\\s+push|gh\\s+(pr\\s+create|release)|npm\\s+publish|yarn\\s+publish|pnpm\\s+publish|vercel|netlify|kubectl\\s+apply|terraform\\s+apply|aws\\s+|gcloud\\s+|az\\s+)',
    };
  }
}

function workspaceCandidates(payload) {
  const out = [];
  const roots = payload && payload.workspace_roots;
  if (Array.isArray(roots)) {
    for (const root of roots) {
      if (typeof root === 'string' && root.trim()) out.push(root);
    }
  }
  if (typeof payload.cwd === 'string' && payload.cwd.trim()) {
    out.push(payload.cwd);
  }
  if (
    payload.tool_input &&
    typeof payload.tool_input.working_directory === 'string' &&
    payload.tool_input.working_directory.trim()
  ) {
    out.push(payload.tool_input.working_directory);
  }
  return out;
}

function findEnvelope(payload) {
  const seen = new Set();
  for (const root of workspaceCandidates(payload)) {
    const key = path.resolve(root);
    if (seen.has(key)) continue;
    seen.add(key);
    const envelopePath = path.join(root, '.agent-quality-loop', 'envelope.json');
    if (fs.existsSync(envelopePath)) {
      return { workspace: root, envelopePath };
    }
  }
  return null;
}

function readEnvelope(envelopePath) {
  try {
    return JSON.parse(fs.readFileSync(envelopePath, 'utf8'));
  } catch (err) {
    return { _parseError: String(err && err.message ? err.message : err) };
  }
}

function unlockHint(authority) {
  return (
    'Current envelope action_authority is "' +
    authority +
    '". External write-class operations require current-turn release authorization ' +
    'and an updated envelope with action_authority that permits the side effect ' +
    '(typically "release" after RELEASE_READY preflight).'
  );
}

function nonEmptyAuthorizationValue(value) {
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0 && value.every(nonEmptyAuthorizationValue);
  if (value !== null && typeof value === 'object') {
    const keys = Object.keys(value);
    return keys.length > 0 && keys.every((key) => nonEmptyAuthorizationValue(value[key]));
  }
  return false;
}

function authorizationIsExpired(expiresOn) {
  if (typeof expiresOn !== 'string') return false;
  // Scope descriptors such as "current turn only" are not dates. Only enforce
  // expiry when the value is recognizably ISO-shaped and parseable.
  if (!/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(expiresOn)) {
    return false;
  }
  const parsed = Date.parse(expiresOn);
  return !Number.isNaN(parsed) && parsed < Date.now();
}

function hasCompleteCurrentReleaseAuthorization(envelope) {
  const authorization = envelope.release_authorization;
  if (!authorization || typeof authorization !== 'object' || Array.isArray(authorization)) return false;
  if (authorization.authorized_this_turn !== true) return false;
  const required = [
    'environment',
    'operation',
    'targets',
    'expected_effects',
    'principal_or_role',
    'rollback',
    'manual_checks',
    'expires_on',
  ];
  return required.every((field) => nonEmptyAuthorizationValue(authorization[field])) &&
    !authorizationIsExpired(authorization.expires_on);
}

function isExplicitReleaseActRoute(envelope) {
  return (
    envelope.intent === 'release' &&
    envelope.mode === 'release' &&
    envelope.phase === 'RELEASE_READY' &&
    envelope.action_authority === 'release' &&
    envelope.release_intent === 'act'
  );
}

function extractCommand(payload, eventName) {
  if (eventName === 'beforeShellExecution' && typeof payload.command === 'string') {
    return payload.command;
  }
  if (eventName === 'preToolUse') {
    const input = payload.tool_input;
    if (input && typeof input.command === 'string') return input.command;
  }
  if (typeof payload.command === 'string') return payload.command;
  return null;
}

function extractToolName(payload, eventName) {
  if (typeof payload.tool_name === 'string') return payload.tool_name;
  if (eventName === 'beforeShellExecution') return 'Shell';
  return null;
}

async function main() {
  let raw;
  try {
    raw = await readStdin();
  } catch (err) {
    allow({
      agent_message:
        'AQL authority-gate warning: failed to read stdin (' +
        String(err && err.message ? err.message : err) +
        '); allowing.',
    });
    return;
  }

  if (process.env.AQL_HOOKS_DISABLE === '1') {
    allow();
    return;
  }

  let payload;
  try {
    payload = raw && raw.trim() ? JSON.parse(raw) : {};
  } catch (err) {
    allow({
      agent_message:
        'AQL authority-gate warning: invalid JSON stdin (' +
        String(err && err.message ? err.message : err) +
        '); allowing.',
    });
    return;
  }

  const eventName =
    typeof payload.hook_event_name === 'string' ? payload.hook_event_name : '';

  const located = findEnvelope(payload);
  if (!located) {
    allow();
    return;
  }

  const envelope = readEnvelope(located.envelopePath);
  if (envelope._parseError) {
    allow({
      agent_message:
        'AQL authority-gate warning: envelope unreadable (' +
        envelope._parseError +
        '); allowing.',
    });
    return;
  }

  const authority = envelope.action_authority;
  if (typeof authority !== 'string' || !authority) {
    allow({
      agent_message:
        'AQL authority-gate warning: envelope missing action_authority; allowing.',
    });
    return;
  }

  const config = loadConfig();
  let pattern;
  try {
    pattern = new RegExp(config.externalWriteCommandPattern, 'i');
  } catch (err) {
    allow({
      agent_message:
        'AQL authority-gate warning: invalid externalWriteCommandPattern (' +
        String(err && err.message ? err.message : err) +
        '); allowing.',
    });
    return;
  }

  const command = extractCommand(payload, eventName);
  if (typeof command === 'string' && pattern.test(command)) {
    if (!isExplicitReleaseActRoute(envelope) || !hasCompleteCurrentReleaseAuthorization(envelope)) {
      deny(
        'AQL authority-gate blocked external write-class shell command. It requires the explicit release route (intent=release, mode=release, phase=RELEASE_READY, action_authority=release, release_intent=act) and complete, unexpired current-turn release authorization.'
      );
      return;
    }
  }

  if (authority === 'read') {
    const writeTools = Array.isArray(config.writeTools) ? config.writeTools : [];
    const toolName = extractToolName(payload, eventName);
    if (toolName && writeTools.indexOf(toolName) !== -1) {
      const msg =
        'AQL authority-gate blocked write-class tool "' +
        toolName +
        '" under action_authority "read". ' +
        unlockHint(authority);
      deny(msg);
      return;
    }
  }

  allow();
}

main().catch((err) => {
  allow({
    agent_message:
      'AQL authority-gate warning: unexpected error (' +
      String(err && err.message ? err.message : err) +
      '); allowing.',
  });
});
