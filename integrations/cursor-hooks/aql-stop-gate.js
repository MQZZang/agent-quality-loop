#!/usr/bin/env node
'use strict';

/**
 * AQL stop gate — Cursor hooks (stop).
 * When envelope claims a completion-class phase without evidence_refs, bounce once
 * per stop cycle using host loop_count / loop_limit (no workspace marker).
 */

const fs = require('fs');
const path = require('path');

const COMPLETION_PHASES = new Set(['BUILT', 'ACCEPTED', 'RELEASE_READY']);
const BOUNCE_MESSAGE = 'completion claimed without evidence refs in envelope';
const ALREADY_BOUNCED_NOTE =
  'AQL stop-gate already bounced once this stop cycle (loop_count >= loop_limit); allowing completion to avoid loop.';
const MISSING_LOOP_FIELDS_NOTE =
  'AQL stop-gate warning: loop_count/loop_limit missing or non-numeric in stop payload; allowing to avoid infinite stop loop.';

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

function allow(note) {
  // stop output protocol: omit/empty followup_message to let the agent finish.
  // Optional note is for humans/tests; Cursor ignores unknown fields.
  if (note) {
    emit({ followup_message: '', _aql_note: note });
  } else {
    emit({});
  }
}

function bounce(message) {
  emit({ followup_message: message });
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

function nonNegativeNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

async function main() {
  let raw;
  try {
    raw = await readStdin();
  } catch (err) {
    allow(
      'AQL stop-gate warning: failed to read stdin (' +
        String(err && err.message ? err.message : err) +
        '); allowing.'
    );
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
    allow(
      'AQL stop-gate warning: invalid JSON stdin (' +
        String(err && err.message ? err.message : err) +
        '); allowing.'
    );
    return;
  }

  const located = findEnvelope(payload);
  if (!located) {
    allow();
    return;
  }

  let envelope;
  try {
    envelope = JSON.parse(fs.readFileSync(located.envelopePath, 'utf8'));
  } catch (err) {
    allow(
      'AQL stop-gate warning: envelope unreadable (' +
        String(err && err.message ? err.message : err) +
        '); allowing.'
    );
    return;
  }

  const phase = envelope.phase;
  const refs = envelope.evidence_refs;
  const shouldBounce =
    typeof phase === 'string' &&
    COMPLETION_PHASES.has(phase) &&
    Array.isArray(refs) &&
    refs.length === 0;

  if (!shouldBounce) {
    allow();
    return;
  }

  const loopCount = payload.loop_count;
  const loopLimit = payload.loop_limit;
  if (!nonNegativeNumber(loopCount) || !nonNegativeNumber(loopLimit)) {
    // Missing host loop fields → allow with disclosure (never invent workspace writes).
    allow(MISSING_LOOP_FIELDS_NOTE);
    return;
  }

  // Host already bounced this stop cycle (or at/above configured limit).
  if (loopCount >= loopLimit) {
    allow(ALREADY_BOUNCED_NOTE);
    return;
  }

  bounce(BOUNCE_MESSAGE);
}

main().catch((err) => {
  allow(
    'AQL stop-gate warning: unexpected error (' +
      String(err && err.message ? err.message : err) +
      '); allowing.'
  );
});
