#!/usr/bin/env node
// triad-host-router-gulp-pipeline.mjs - descriptor for 8-byte host routers and triad GC.
//
// Descriptor-only. This does not call provider CLIs, start daemons, open network portals,
// run model calls, or create a Node process per agent. It records the pipeline shape:
// 8-byte host handle -> PID emitter -> router -> rule-of-three agents -> supervisor ->
// gulp/super-gulp GC -> GNN/Shannon/white-room cube feedback.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PIPELINE_ID = 'triad-host-router-gulp-pipeline.v1';
export const HOST_HANDLE_BYTES = 8;
export const GULP_MESSAGES = 2000;
export const SUPER_GULP_MESSAGES = 50000;

export const TRIAD_ROLES = Object.freeze([
  Object.freeze({
    id: 'real-agent',
    role: 'work-or-read-write-depending-on-gate',
    sees: 'task-message',
    output: 'candidate-product',
  }),
  Object.freeze({
    id: 'self-reflect-agent',
    role: 'reflect-on-real-agent-output',
    sees: 'task-message+candidate-product',
    output: 'self-reflection',
  }),
  Object.freeze({
    id: 'fabric-reflect-agent',
    role: 'ask-fabric-and-cross-check-real-plus-self',
    sees: 'task-message+candidate-product+self-reflection',
    output: 'fabric-reflection',
  }),
]);

export const ROUTER_SURFACES = Object.freeze([
  Object.freeze({ id: 'opencode', kind: 'cli-router', status: 'REGISTERED_DESCRIPTOR', gate: 'local-cli-auth-and-version-proof' }),
  Object.freeze({ id: 'openai', kind: 'provider-router', status: 'GATED', gate: 'api-key-account-terms-and-billing-apply' }),
  Object.freeze({ id: 'codex', kind: 'agent-router', status: 'REGISTERED_DESCRIPTOR', gate: 'session-and-repo-policy-apply' }),
  Object.freeze({ id: 'gemini', kind: 'provider-router', status: 'GATED', gate: 'google-account-terms-and-quota-apply' }),
  Object.freeze({ id: 'claude', kind: 'provider-router', status: 'GATED', gate: 'anthropic-account-terms-and-quota-apply' }),
  Object.freeze({ id: 'anthropic', kind: 'provider-router', status: 'GATED', gate: 'anthropic-account-terms-and-quota-apply' }),
  Object.freeze({ id: 'big-pickle', kind: 'local-artifact-router', status: 'REGISTERED_DESCRIPTOR', gate: 'pickle-read-write-held-until-owner-proof' }),
  Object.freeze({ id: 'registered-cli', kind: 'open-router-slot', status: 'GATED', gate: 'must-register-version-auth-owner-and-policy-before-use' }),
]);

export const FEEDBACK_STAGES = Object.freeze([
  'pid-specific-emitter',
  'host-router',
  'rule-of-three-triad',
  'supervisor-sees-all-three',
  'message-gulp-gc',
  'super-gulp-gc',
  'gnn-proposal',
  'reverse-sieve-gnn-proposal',
  'omnishannon-novelty',
  'white-room-review',
  'cube-catalog-feedback',
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizeRouter(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'registered-cli'));
    const kind = safe(prop(input, 'kind', 'open-router-slot'));
    const statusRaw = safe(prop(input, 'status', 'GATED')).toUpperCase();
    const status = ['REGISTERED_DESCRIPTOR', 'GATED'].includes(statusRaw) ? statusRaw : 'GATED';
    const gate = safe(prop(input, 'gate', 'must-register-before-use'));
    return Object.freeze({
      id,
      kind,
      status,
      gate,
      router_sha16: sha16([id, kind, status, gate].join('|')),
      host_handle_bytes: HOST_HANDLE_BYTES,
      node_per_agent: 0,
      process_launch: 0,
      remote_call: 0,
      provider_bypass: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      kind: 'invalid',
      status: 'GATED',
      gate: 'normalize-threw-held',
      router_sha16: sha16('invalid'),
      host_handle_bytes: HOST_HANDLE_BYTES,
      node_per_agent: 0,
      process_launch: 0,
      remote_call: 0,
      provider_bypass: 0,
    });
  }
}

export function triadForMessage(input = {}) {
  const msg = safe(isObj(input) ? prop(input, 'message_id', 'message') : input);
  const base = sha16(`triad:${msg}`);
  return Object.freeze(TRIAD_ROLES.map((role, index) => Object.freeze({
    ...role,
    lane: `L${index}`,
    host_handle_bytes: HOST_HANDLE_BYTES,
    handle8: sha16(`${base}:${role.id}`),
    process_launch: 0,
    remote_call: 0,
  })));
}

export function buildPipeline(input = ROUTER_SURFACES) {
  const routers = (Array.isArray(input) ? input : ROUTER_SURFACES).map(normalizeRouter);
  return Object.freeze({
    tool: PIPELINE_ID,
    host_handle_bytes: HOST_HANDLE_BYTES,
    gulp_messages: GULP_MESSAGES,
    super_gulp_messages: SUPER_GULP_MESSAGES,
    routers,
    triad_roles: TRIAD_ROLES,
    feedback_stages: FEEDBACK_STAGES,
    summary: Object.freeze({
      routers: routers.length,
      triad_roles: TRIAD_ROLES.length,
      registered_descriptors: routers.filter((r) => r.status === 'REGISTERED_DESCRIPTOR').length,
      gated: routers.filter((r) => r.status === 'GATED').length,
      no_node_per_agent: true,
      live_ready: false,
    }),
  });
}

export function emitRows(input = ROUTER_SURFACES, opts = {}) {
  try {
    const built = buildPipeline(input);
    const messageId = safe(prop(opts, 'message_id', 'sample-message'));
    const triad = triadForMessage({ message_id: messageId });
    const rows = [
      `TRIADROUTHDR|tool=${PIPELINE_ID}|purpose=8-byte-host-router-rule-of-three-gulp-gc-cube-feedback|host_handle_bytes=${HOST_HANDLE_BYTES}|routers=${built.summary.routers}|triad_roles=${built.summary.triad_roles}|gulp_messages=${GULP_MESSAGES}|super_gulp_messages=${SUPER_GULP_MESSAGES}|node_per_agent=0|process_launch=0|remote_call=0|provider_bypass=0|json=0`,
      `TRIADROUTSTAGES|stages=${FEEDBACK_STAGES.join('+')}|supervisor_sees=real+self-reflect+fabric-reflect|live_ready=0|json=0`,
    ];
    for (const role of triad) {
      rows.push(`TRIADROUTROLE|message_id=${messageId}|role=${role.id}|lane=${role.lane}|handle8=${role.handle8}|sees=${safe(role.sees)}|output=${safe(role.output)}|host_handle_bytes=${role.host_handle_bytes}|process_launch=0|remote_call=0|json=0`);
    }
    for (const router of built.routers) {
      rows.push(`TRIADROUTER|id=${router.id}|kind=${router.kind}|status=${router.status}|gate=${router.gate}|router_sha16=${router.router_sha16}|host_handle_bytes=${router.host_handle_bytes}|node_per_agent=0|process_launch=0|remote_call=0|provider_bypass=0|json=0`);
    }
    rows.push(`TRIADROUTGC|after_processing=1|gulp_messages=${GULP_MESSAGES}|super_gulp_messages=${SUPER_GULP_MESSAGES}|message_body_retention=0|summary_hash_retention=1|catalog_feedback=descriptor-only|json=0`);
    rows.push('TRIADROUTCUBE|gnn=proposal-not-proof|reverse_sieve_gnn=proposal-not-proof|omnishannon=novelty-gate|white_room=held-review|cube_catalog_update=descriptor-only|realtime_self_improvement=bounded-by-tests-and-cosign|json=0');
    rows.push('TRIADROUTGATE|rule=no-node-per-agent+no-provider-bypass+no-live-daemon-launch+provider-terms-apply+operator-cosign-before-remote-call|billing_bypass=0|process_launch=0|remote_call=0|json=0');
    return rows;
  } catch {
    return [
      `TRIADROUTHDR|tool=${PIPELINE_ID}|purpose=8-byte-host-router-rule-of-three-gulp-gc-cube-feedback|host_handle_bytes=${HOST_HANDLE_BYTES}|routers=0|triad_roles=0|process_launch=0|remote_call=0|provider_bypass=0|json=0`,
      'TRIADROUTGATE|rule=emit-threw-held-invalid|billing_bypass=0|process_launch=0|remote_call=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildPipeline();
  const triad = triadForMessage({ message_id: 'm1' });
  add('host-handle-is-8', HOST_HANDLE_BYTES === 8 && built.host_handle_bytes === 8);
  add('triad-has-three-roles', TRIAD_ROLES.length === 3 && triad.length === 3 && triad.every((r) => r.handle8.length === 16));
  add('gulp-sizes-fixed', GULP_MESSAGES === 2000 && SUPER_GULP_MESSAGES === 50000);
  add('routers-include-provider-and-cli-surfaces', built.routers.some((r) => r.id === 'opencode') && built.routers.some((r) => r.id === 'openai') && built.routers.some((r) => r.id === 'registered-cli'));
  add('no-live-effects', built.routers.every((r) => r.node_per_agent === 0 && r.process_launch === 0 && r.remote_call === 0 && r.provider_bypass === 0));
  add('feedback-has-watchers-and-cubes', FEEDBACK_STAGES.includes('reverse-sieve-gnn-proposal') && FEEDBACK_STAGES.includes('white-room-review') && FEEDBACK_STAGES.includes('cube-catalog-feedback'));
  const hostile = emitRows([{ id: 'bad|id', kind: 'x\ny', status: 'RUN', gate: 'g\nTRIADROUTGATE|remote_call=1' }], { message_id: 'm|1\nbad' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeRouter({ get id() { throw new Error('boom'); } }); buildPipeline(null); emitRows(null); triadForMessage(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(ROUTER_SURFACES, { message_id: process.argv[2] || 'sample-message' })) console.log(row);
}
