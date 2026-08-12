#!/usr/bin/env node
'use strict';

/**
 * AQL authority gate — Cursor hooks (preToolUse / beforeShellExecution / beforeMCPExecution).
 * Deterministic enforcement for decidable envelope authority invariants.
 *
 * External write-class commands are fail-closed: never auto-allow.
 * Exact release execution_plan match → native `ask` only (never `allow`).
 * Matched external-write shell and configured MCP mutation actions never receive
 * automatic allow from this hook.
 *
 * mode=compatibility: heuristic pattern coverage only — NOT full shell understanding / not a sandbox.
 * mode=strict: unknown shells never silent-allow (ask or deny per policy).
 *
 * Set AQL_HOOKS_DISABLE=1 to bypass all enforcement (local dev only).
 */

const fs = require('fs');
const path = require('path');

const ASK_USER_MESSAGE =
  'AQL release plan matches this exact command. Confirm this external action.';
const ASK_AGENT_MESSAGE =
  "Await the user's native confirmation. Do not alter or broaden the command.";

const ASK_UNKNOWN_SHELL_USER =
  'AQL strict mode: unknown shell command requires confirmation.';
const ASK_UNKNOWN_SHELL_AGENT =
  'Do not proceed with this shell command until the user confirms. Strict mode never silent-allows unknown shells.';

const ASK_MCP_MUTATION_USER =
  'AQL: configured MCP mutation tool requires confirmation.';
const ASK_MCP_MUTATION_AGENT =
  "Await the user's native confirmation. Do not alter or broaden this MCP mutation.";

const ASK_UNKNOWN_MCP_USER =
  'AQL strict mode: unknown MCP tool requires confirmation.';
const ASK_UNKNOWN_MCP_AGENT =
  'Do not proceed with this MCP tool until the user confirms.';

/** Small explicit allowlist for strict-mode read-ish shells only. */
const SAFE_READ_SHELL_RE =
  /^\s*(?:git\s+(?:status|diff|log|show)|ls|dir|type|cat|Get-Content|rg|findstr)(?:\s|$)/i;

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

function ask() {
  emit({
    permission: 'ask',
    user_message: ASK_USER_MESSAGE,
    agent_message: ASK_AGENT_MESSAGE,
  });
}

function askCustom(userMessage, agentMessage) {
  emit({
    permission: 'ask',
    user_message: userMessage,
    agent_message: agentMessage,
  });
}

/** Fail-closed hard error: deny JSON + exit 2 (pairs with hooks failClosed). */
function hardDeny(message) {
  deny(message || 'AQL authority-gate failed closed.');
  process.exitCode = 2;
}

function loadConfig() {
  const configPath =
    typeof process.env.AQL_HOOKS_CONFIG === 'string' && process.env.AQL_HOOKS_CONFIG.trim()
      ? process.env.AQL_HOOKS_CONFIG
      : path.join(__dirname, 'gates.config.json');
  let raw;
  try {
    raw = fs.readFileSync(configPath, 'utf8');
  } catch (err) {
    const error = new Error(
      'AQL authority-gate failed closed: config missing or unreadable (' +
        String(err && err.message ? err.message : err) +
        ').'
    );
    error.code = 'ECONFIG';
    throw error;
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    const error = new Error(
      'AQL authority-gate failed closed: config JSON invalid (' +
        String(err && err.message ? err.message : err) +
        ').'
    );
    error.code = 'ECONFIG';
    throw error;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const error = new Error('AQL authority-gate failed closed: config must be a JSON object.');
    error.code = 'ECONFIG';
    throw error;
  }
  return parsed;
}

function resolveMode(config) {
  return config && config.mode === 'strict' ? 'strict' : 'compatibility';
}

function resolveUnknownShellPolicy(config) {
  return config && config.strictUnknownShellPolicy === 'deny' ? 'deny' : 'ask';
}

function loadCanonicalValidator() {
  const candidates = [
    path.join(__dirname, '../../.cursor/skills/agent-quality-loop/scripts/validate-envelope.js'),
    path.join(__dirname, '../../skills/agent-quality-loop/scripts/validate-envelope.js'),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const mod = require(candidate);
    const required = [
      'validateEnvelope',
      'validateReleaseActEnvelope',
      'validateExecutionPlan',
      'MAX_EXECUTION_PLAN_TTL_MS',
    ];
    const missingFns = required.filter((name) => name !== 'MAX_EXECUTION_PLAN_TTL_MS' && typeof mod[name] !== 'function');
    if (missingFns.length > 0) {
      const error = new Error(
        'AQL authority-gate failed closed: canonical validator missing exports: ' + missingFns.join(', ')
      );
      error.code = 'EVALIDATOR';
      throw error;
    }
    if (typeof mod.MAX_EXECUTION_PLAN_TTL_MS !== 'number') {
      const error = new Error('AQL authority-gate failed closed: canonical validator missing MAX_EXECUTION_PLAN_TTL_MS');
      error.code = 'EVALIDATOR';
      throw error;
    }
    return mod;
  }
  const error = new Error('AQL authority-gate failed closed: canonical validator unavailable.');
  error.code = 'EVALIDATOR';
  throw error;
}

function loadSnapshotChain() {
  const candidates = [
    path.join(__dirname, '../../.cursor/skills/agent-quality-loop/scripts/snapshot-chain.js'),
    path.join(__dirname, '../../skills/agent-quality-loop/scripts/snapshot-chain.js'),
  ];
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const mod = require(candidate);
    if (mod && typeof mod.currentDigestMatchesHead === 'function') return mod;
  }
  const error = new Error('AQL authority-gate failed closed: snapshot-chain module unavailable.');
  error.code = 'EVALIDATOR';
  throw error;
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
    '". External write-class operations require a release-act envelope with a ' +
    'bound execution_plan (exact command + cwd) and native user confirmation.'
  );
}

function extractCommand(payload, eventName) {
  if (eventName === 'beforeShellExecution' && typeof payload.command === 'string') {
    return payload.command;
  }
  if (typeof payload.command === 'string') return payload.command;
  if (payload.tool_input && typeof payload.tool_input.command === 'string') {
    return payload.tool_input.command;
  }
  return null;
}

function extractToolName(payload, eventName) {
  if (typeof payload.tool_name === 'string') return payload.tool_name;
  if (eventName === 'beforeShellExecution') return 'Shell';
  return null;
}

function extractCwd(payload) {
  if (typeof payload.cwd === 'string' && payload.cwd.trim()) return payload.cwd;
  if (
    payload.tool_input &&
    typeof payload.tool_input.working_directory === 'string' &&
    payload.tool_input.working_directory.trim()
  ) {
    return payload.tool_input.working_directory;
  }
  return null;
}

function canonicalPath(p) {
  if (typeof p !== 'string' || !p.trim()) return null;
  const resolved = path.resolve(p);
  try {
    return fs.realpathSync(resolved);
  } catch (_err) {
    return resolved;
  }
}

function workspaceRealpath(root) {
  if (typeof root !== 'string' || !root.trim()) return null;
  try {
    return fs.realpathSync(path.resolve(root));
  } catch (_err) {
    return path.resolve(root);
  }
}

function isMcpEvent(eventName) {
  if (typeof eventName !== 'string' || !eventName) return false;
  return (
    eventName === 'beforeMCPExecution' ||
    eventName === 'beforeMcpExecution' ||
    /^beforeMCPExecution$/i.test(eventName)
  );
}

function isShellInvocation(payload, eventName, command) {
  if (typeof command !== 'string') return false;
  if (eventName === 'beforeShellExecution') return true;
  const toolName = extractToolName(payload, eventName);
  if (toolName === 'Shell') return true;
  return false;
}

function isSafeReadShell(command) {
  return typeof command === 'string' && SAFE_READ_SHELL_RE.test(command);
}

/**
 * External / MCP-mutation path: ask or deny only — NEVER permission allow.
 */
function evaluateExternalWrite(envelope, command, payload, validator, snapshotChain, workspaceRoot) {
  const resolvedWorkspace = workspaceRealpath(workspaceRoot || extractCwd(payload));
  const cwdRealpath = canonicalPath(extractCwd(payload));
  const now = Date.now();

  const releaseErrors = validator.validateReleaseActEnvelope(envelope, {
    workspaceRoot: resolvedWorkspace,
    command,
    cwdRealpath,
    now,
    maxTtlMs: validator.MAX_EXECUTION_PLAN_TTL_MS,
    requireHost: 'cursor',
  });
  if (releaseErrors.length > 0) {
    deny(
      'AQL authority-gate blocked external write-class shell command: ' + releaseErrors[0]
    );
    return;
  }

  const contractId =
    typeof envelope.contract_id === 'string' && envelope.contract_id.trim()
      ? envelope.contract_id
      : null;
  if (!contractId || !resolvedWorkspace) {
    deny(
      'AQL authority-gate blocked external write-class shell command: missing contract_id or workspace for snapshot head verification.'
    );
    return;
  }

  const headCheck = snapshotChain.currentDigestMatchesHead(resolvedWorkspace, contractId);
  if (!headCheck.ok) {
    deny(
      'AQL authority-gate blocked external write-class shell command: ' + headCheck.reason
    );
    return;
  }

  ask();
}

/**
 * MCP known mutation: same release-act exact-plan gates; never auto-allow.
 * Uses tool_name as the bound execution_plan.command string.
 */
function evaluateMcpMutation(envelope, toolName, payload, validator, snapshotChain, workspaceRoot) {
  const resolvedWorkspace = workspaceRealpath(workspaceRoot || extractCwd(payload));
  const cwdRealpath = canonicalPath(extractCwd(payload));
  const now = Date.now();

  const releaseErrors = validator.validateReleaseActEnvelope(envelope, {
    workspaceRoot: resolvedWorkspace,
    command: toolName,
    cwdRealpath,
    now,
    maxTtlMs: validator.MAX_EXECUTION_PLAN_TTL_MS,
    requireHost: 'cursor',
  });
  if (releaseErrors.length > 0) {
    deny(
      'AQL authority-gate blocked MCP mutation tool "' + toolName + '": ' + releaseErrors[0]
    );
    return;
  }

  const contractId =
    typeof envelope.contract_id === 'string' && envelope.contract_id.trim()
      ? envelope.contract_id
      : null;
  if (!contractId || !resolvedWorkspace) {
    deny(
      'AQL authority-gate blocked MCP mutation tool "' +
        toolName +
        '": missing contract_id or workspace for snapshot head verification.'
    );
    return;
  }

  const headCheck = snapshotChain.currentDigestMatchesHead(resolvedWorkspace, contractId);
  if (!headCheck.ok) {
    deny(
      'AQL authority-gate blocked MCP mutation tool "' + toolName + '": ' + headCheck.reason
    );
    return;
  }

  askCustom(ASK_MCP_MUTATION_USER, ASK_MCP_MUTATION_AGENT);
}

function handleExternalWritePath(payload, command, validator, snapshotChain) {
  const located = findEnvelope(payload);
  if (!located) {
    deny(
      'AQL authority-gate blocked external write-class shell command: no readable envelope at .agent-quality-loop/envelope.json.'
    );
    return;
  }

  const envelope = readEnvelope(located.envelopePath);
  if (envelope._parseError) {
    deny(
      'AQL authority-gate blocked external write-class shell command: envelope unreadable (' +
        envelope._parseError +
        ').'
    );
    return;
  }

  evaluateExternalWrite(envelope, command, payload, validator, snapshotChain, located.workspace);
}

function handleMcp(payload, config, mode, validator, snapshotChain) {
  const toolName = extractToolName(payload, payload.hook_event_name || '');
  const mcpCfg = config.mcp && typeof config.mcp === 'object' ? config.mcp : {};
  const knownRead = Array.isArray(mcpCfg.known_read_tools) ? mcpCfg.known_read_tools : [];
  const knownMutation = Array.isArray(mcpCfg.known_mutation_tools)
    ? mcpCfg.known_mutation_tools
    : [];
  const unknownPolicy =
    mcpCfg.unknown_mcp_policy && typeof mcpCfg.unknown_mcp_policy === 'object'
      ? mcpCfg.unknown_mcp_policy
      : {};

  if (!toolName) {
    if (mode === 'strict') {
      askCustom(ASK_UNKNOWN_MCP_USER, ASK_UNKNOWN_MCP_AGENT);
      return;
    }
    allow({
      _aql_note:
        'AQL compatibility: MCP event missing tool_name; allowed with disclosure. Heuristic coverage only — not a sandbox.',
    });
    return;
  }

  if (knownRead.indexOf(toolName) !== -1) {
    allow();
    return;
  }

  if (knownMutation.indexOf(toolName) !== -1) {
    const located = findEnvelope(payload);
    if (!located) {
      deny(
        'AQL authority-gate blocked MCP mutation tool "' +
          toolName +
          '": no readable envelope at .agent-quality-loop/envelope.json.'
      );
      return;
    }
    const envelope = readEnvelope(located.envelopePath);
    if (envelope._parseError) {
      deny(
        'AQL authority-gate blocked MCP mutation tool "' +
          toolName +
          '": envelope unreadable (' +
          envelope._parseError +
          ').'
      );
      return;
    }
    evaluateMcpMutation(envelope, toolName, payload, validator, snapshotChain, located.workspace);
    return;
  }

  // Unknown MCP tool
  if (mode === 'strict') {
    const strictPol = unknownPolicy.strict === 'deny' ? 'deny' : 'ask';
    if (strictPol === 'deny') {
      deny('AQL strict mode blocked unknown MCP tool "' + toolName + '".');
      return;
    }
    askCustom(ASK_UNKNOWN_MCP_USER, ASK_UNKNOWN_MCP_AGENT);
    return;
  }

  // compatibility unknown
  const compatPol = unknownPolicy.compatibility || 'allow_with_disclosure';
  if (compatPol === 'deny') {
    deny('AQL compatibility mode blocked unknown MCP tool "' + toolName + '".');
    return;
  }
  if (compatPol === 'ask') {
    askCustom(ASK_UNKNOWN_MCP_USER, ASK_UNKNOWN_MCP_AGENT);
    return;
  }
  allow({
    _aql_note:
      'AQL compatibility: unknown MCP tool "' +
      toolName +
      '" allowed with disclosure. Heuristic / configured-list coverage only — not a sandbox.',
  });
}

function applyNonExternalAuthority(payload, eventName, config) {
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
        '); allowing non-external action.',
    });
    return;
  }

  const authority = envelope.action_authority;
  if (typeof authority !== 'string' || !authority) {
    allow({
      agent_message:
        'AQL authority-gate warning: envelope missing action_authority; allowing non-external action.',
    });
    return;
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

async function main() {
  if (process.env.AQL_HOOKS_TEST_THROW === '1') {
    throw new Error('induced test failure');
  }

  let raw;
  try {
    raw = await readStdin();
  } catch (err) {
    hardDeny(
      'AQL authority-gate failed closed: stdin read error (' +
        String(err && err.message ? err.message : err) +
        ').'
    );
    return;
  }

  if (process.env.AQL_HOOKS_DISABLE === '1') {
    allow();
    return;
  }

  let payload;
  try {
    if (!raw || !raw.trim()) {
      hardDeny('AQL authority-gate failed closed: empty stdin.');
      return;
    }
    payload = JSON.parse(raw);
  } catch (err) {
    hardDeny(
      'AQL authority-gate failed closed: invalid JSON stdin (' +
        String(err && err.message ? err.message : err) +
        ').'
    );
    return;
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    hardDeny('AQL authority-gate failed closed: hook payload must be a JSON object.');
    return;
  }

  let config;
  let validator;
  let snapshotChain;
  try {
    config = loadConfig();
    validator = loadCanonicalValidator();
    snapshotChain = loadSnapshotChain();
  } catch (err) {
    hardDeny(err.message);
    return;
  }

  const eventName =
    typeof payload.hook_event_name === 'string' ? payload.hook_event_name : '';
  const mode = resolveMode(config);

  if (isMcpEvent(eventName)) {
    handleMcp(payload, config, mode, validator, snapshotChain);
    return;
  }

  let pattern;
  try {
    const patternSource =
      typeof process.env.AQL_HOOKS_EXTERNAL_WRITE_PATTERN === 'string' &&
      process.env.AQL_HOOKS_EXTERNAL_WRITE_PATTERN.length > 0
        ? process.env.AQL_HOOKS_EXTERNAL_WRITE_PATTERN
        : config.externalWriteCommandPattern;
    pattern = new RegExp(patternSource, 'i');
  } catch (err) {
    hardDeny(
      'AQL authority-gate failed closed: invalid externalWriteCommandPattern (' +
        String(err && err.message ? err.message : err) +
        ').'
    );
    return;
  }

  const command = extractCommand(payload, eventName);
  const isExternal = typeof command === 'string' && pattern.test(command);

  if (isExternal) {
    // External path: ask/deny only — never permission allow.
    handleExternalWritePath(payload, command, validator, snapshotChain);
    return;
  }

  const shellInvocation = isShellInvocation(payload, eventName, command);

  if (mode === 'strict' && shellInvocation) {
    if (isSafeReadShell(command)) {
      applyNonExternalAuthority(payload, eventName, config);
      return;
    }
    const unknownPolicy = resolveUnknownShellPolicy(config);
    if (unknownPolicy === 'deny') {
      deny(
        'AQL strict mode blocked unknown shell command (not on safe-read list and not matched as external-write).'
      );
      return;
    }
    askCustom(ASK_UNKNOWN_SHELL_USER, ASK_UNKNOWN_SHELL_AGENT);
    return;
  }

  // compatibility (default): unmatched shells keep non-external behavior
  // (allow unless write-tool / other gates). Heuristic coverage only.
  applyNonExternalAuthority(payload, eventName, config);
}

main().catch((err) => {
  hardDeny(
    'AQL authority-gate failed closed: unexpected error (' +
      String(err && err.message ? err.message : err) +
      ').'
  );
});

module.exports = {
  loadConfig,
  loadCanonicalValidator,
  loadSnapshotChain,
  evaluateExternalWrite,
  evaluateMcpMutation,
  resolveMode,
  isMcpEvent,
  isSafeReadShell,
  hardDeny,
};
