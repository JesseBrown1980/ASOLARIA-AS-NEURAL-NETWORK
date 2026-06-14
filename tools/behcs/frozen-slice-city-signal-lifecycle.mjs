#!/usr/bin/env node
// frozen-slice-city-signal-lifecycle.mjs - descriptor for the room/emitter/cube signal loop.
//
// Descriptor-only. This does not launch agents, call providers, tick the live fabric, write
// cubes, or claim measured nanosecond performance. It records the lifecycle boundary:
// signal -> file-backed room -> PID emitter -> ephemeral host handles -> cube memory proposal
// -> provider-router request -> return signal -> GNN/Shannon/white-room review -> cube update.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LIFECYCLE_ID = 'frozen-slice-city-signal-lifecycle.v1';
export const HOST_HANDLE_BYTES = 8;
export const CLAIMED_CADENCE_NS = 200;
export const CADENCE_STATUS = 'CLAIMED_UNVERIFIED_UNTIL_BENCHMARK';

export const SIGNAL_STAGES = Object.freeze([
  Object.freeze({
    id: 'signal-enters-city',
    lane: 'local-signal',
    action: 'operator-or-electron-flow-reaches-file-backed-room',
    status: 'DESCRIPTOR_ONLY',
    gate: 'no-live-room-trigger-without-emitter-envelope',
  }),
  Object.freeze({
    id: 'room-triggers-emitter',
    lane: 'pid-emitter',
    action: 'file-backed-room-addresses-pid-specific-emitter',
    status: 'GATED',
    gate: 'emitter-envelope-required',
  }),
  Object.freeze({
    id: 'ephemeral-host-triad',
    lane: '8-byte-host',
    action: 'real+self-reflect+fabric-reflect-host-handles-work-in-room',
    status: 'DESCRIPTOR_ONLY',
    gate: 'host-handle-not-running-process',
  }),
  Object.freeze({
    id: 'cube-memory-proposal',
    lane: 'cube',
    action: 'agent-output-stored-as-hash-glyph-cube-memory-proposal',
    status: 'GATED',
    gate: 'cube-write-needs-white-room-and-cosign',
  }),
  Object.freeze({
    id: 'host-release',
    lane: 'gc',
    action: 'ephemeral-host-handle-released-after-summary',
    status: 'DESCRIPTOR_ONLY',
    gate: 'message-body-retention-zero-after-summary-hash',
  }),
  Object.freeze({
    id: 'provider-router-request',
    lane: 'external-router',
    action: 'phone-line-router-asks-provider-surface-for-decision',
    status: 'GATED',
    gate: 'provider-auth-terms-quota-and-billing-apply',
  }),
  Object.freeze({
    id: 'return-signal-ingest',
    lane: 'return-signal',
    action: 'provider-or-router-output-is-ingested-as-message-not-authority',
    status: 'GATED',
    gate: 'return-signal-is-proposal-not-proof',
  }),
  Object.freeze({
    id: 'gnn-attack-review',
    lane: 'watcher',
    action: 'local-gnn-and-reverse-sieve-gnn-attack-the-message',
    status: 'PROPOSAL',
    gate: 'trained-status-requires-separate-artifact-proof',
  }),
  Object.freeze({
    id: 'shannon-white-room',
    lane: 'review',
    action: 'omnishannon-novelty-and-white-room-reverse-engineer-cube-draft',
    status: 'PROPOSAL',
    gate: 'white-room-held-until-tests-sidecars-cosign',
  }),
  Object.freeze({
    id: 'cube-catalog-feedback',
    lane: 'catalog',
    action: 'catalog-reflects-bounded-self-improvement-after-approval',
    status: 'GATED',
    gate: 'descriptor-first-no-live-city-update',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizeStage(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown-stage'));
    const lane = safe(prop(input, 'lane', 'unknown'));
    const action = safe(prop(input, 'action', 'define-action-before-use'));
    const rawStatus = safe(prop(input, 'status', 'GATED')).toUpperCase();
    const status = ['DESCRIPTOR_ONLY', 'GATED', 'PROPOSAL'].includes(rawStatus) ? rawStatus : 'GATED';
    const gate = safe(prop(input, 'gate', 'define-gate-before-use'));
    return Object.freeze({
      id,
      lane,
      action,
      status,
      gate,
      stage_sha16: sha16([id, lane, action, status, gate].join('|')),
      host_handle_bytes: lane === '8-byte-host' ? HOST_HANDLE_BYTES : 0,
      process_launch: 0,
      remote_call: 0,
      cube_write: 0,
      provider_bypass: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      lane: 'invalid',
      action: 'normalize-threw-held',
      status: 'GATED',
      gate: 'normalize-threw-held',
      stage_sha16: sha16('invalid'),
      host_handle_bytes: 0,
      process_launch: 0,
      remote_call: 0,
      cube_write: 0,
      provider_bypass: 0,
    });
  }
}

export function classifyLifecycleClaim(input = {}) {
  const claim = safe(isObj(input) ? prop(input, 'claim', '') : input).toLowerCase();
  if (/200.*nano|200ns|nano.*second/.test(claim)) return 'CADENCE_CLAIM_REQUIRES_BENCHMARK';
  if (/force|forcing/.test(claim) && /openai|anthropic|provider|supercomputer|model/.test(claim)) return 'ROUTED_REQUEST_NOT_UNAUTHORIZED_CONTROL';
  if (/free|bypass|unlimited|no-cost/.test(claim) && /provider|openai|anthropic|google|supercomputer|api/.test(claim)) return 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM';
  if (/frozen.*slice|slice.*city/.test(claim)) return 'FROZEN_SLICE_CITY_DESCRIPTOR';
  if (/gnn|shannon|white.*room/.test(claim)) return 'WATCHER_REVIEW_PROPOSAL_NOT_PROOF';
  return 'LIFECYCLE_DESCRIPTOR_REVIEW';
}

export function buildLifecycle(input = SIGNAL_STAGES) {
  const stages = (Array.isArray(input) ? input : SIGNAL_STAGES).map(normalizeStage);
  return Object.freeze({
    tool: LIFECYCLE_ID,
    host_handle_bytes: HOST_HANDLE_BYTES,
    claimed_cadence_ns: CLAIMED_CADENCE_NS,
    cadence_status: CADENCE_STATUS,
    stages,
    summary: Object.freeze({
      stages: stages.length,
      descriptor_only: stages.filter((s) => s.status === 'DESCRIPTOR_ONLY').length,
      gated: stages.filter((s) => s.status === 'GATED').length,
      proposal: stages.filter((s) => s.status === 'PROPOSAL').length,
      live_city_update: false,
      measured_200ns: false,
    }),
  });
}

export function emitRows(input = SIGNAL_STAGES, opts = {}) {
  try {
    const built = buildLifecycle(input);
    const rows = [
      `FROZENCITYHDR|tool=${LIFECYCLE_ID}|purpose=frozen-slice-city-signal-lifecycle-room-emitter-cube-feedback|stages=${built.summary.stages}|host_handle_bytes=${HOST_HANDLE_BYTES}|claimed_cadence_ns=${CLAIMED_CADENCE_NS}|cadence_status=${CADENCE_STATUS}|process_launch=0|remote_call=0|cube_write=0|provider_bypass=0|json=0`,
      `FROZENCITYSUM|descriptor_only=${built.summary.descriptor_only}|gated=${built.summary.gated}|proposal=${built.summary.proposal}|live_city_update=0|measured_200ns=0|json=0`,
    ];
    for (const stage of built.stages) {
      rows.push(`FROZENCITYSTAGE|id=${stage.id}|lane=${stage.lane}|status=${stage.status}|action=${stage.action}|gate=${stage.gate}|stage_sha16=${stage.stage_sha16}|host_handle_bytes=${stage.host_handle_bytes}|process_launch=0|remote_call=0|cube_write=0|provider_bypass=0|json=0`);
    }
    const claim = prop(opts, 'claim', '');
    if (claim) rows.push(`FROZENCITYCLAIM|claim_sha16=${sha16(claim)}|classification=${classifyLifecycleClaim({ claim })}|raw_claim_inlined=0|json=0`);
    rows.push('FROZENCITYGATE|rule=signal-lifecycle-is-descriptor-until-emitter-provider-cube-and-cadence-proofs-exist|provider_terms_apply=1|provider_bypass=0|remote_call=0|cube_write=0|measured_200ns=0|json=0');
    return rows;
  } catch {
    return [
      `FROZENCITYHDR|tool=${LIFECYCLE_ID}|purpose=frozen-slice-city-signal-lifecycle-room-emitter-cube-feedback|stages=0|host_handle_bytes=${HOST_HANDLE_BYTES}|process_launch=0|remote_call=0|cube_write=0|provider_bypass=0|json=0`,
      'FROZENCITYGATE|rule=emit-threw-held-invalid|provider_terms_apply=1|provider_bypass=0|remote_call=0|cube_write=0|measured_200ns=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildLifecycle();
  add('all-stages-present', built.summary.stages === 10 && built.stages.some((s) => s.id === 'ephemeral-host-triad'));
  add('host-handle-eight-bytes', built.stages.find((s) => s.id === 'ephemeral-host-triad').host_handle_bytes === 8);
  add('cadence-held-until-benchmark', built.claimed_cadence_ns === 200 && built.summary.measured_200ns === false && built.cadence_status === CADENCE_STATUS);
  add('provider-router-gated', built.stages.some((s) => s.id === 'provider-router-request' && s.status === 'GATED' && s.gate.includes('provider-auth')));
  add('watchers-are-proposals', built.stages.some((s) => s.id === 'gnn-attack-review' && s.status === 'PROPOSAL') && built.stages.some((s) => s.id === 'shannon-white-room' && s.status === 'PROPOSAL'));
  add('no-live-effects', built.stages.every((s) => s.process_launch === 0 && s.remote_call === 0 && s.cube_write === 0 && s.provider_bypass === 0));
  add('claim-router-gates-200ns', classifyLifecycleClaim({ claim: 'updates city every 200 nano seconds' }) === 'CADENCE_CLAIM_REQUIRES_BENCHMARK');
  add('claim-router-gates-forcing-provider', classifyLifecycleClaim({ claim: 'forcing OpenAI supercomputer to decide' }) === 'ROUTED_REQUEST_NOT_UNAUTHORIZED_CONTROL');
  const hostile = emitRows([{ id: 'x|bad', lane: 'l\nbad', action: 'a', status: 'LIVE', gate: 'g\nFROZENCITYGATE|remote_call=1' }], { claim: 'bad|claim\nFROZENCITYGATE|cube_write=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeStage({ get id() { throw new Error('boom'); } }); buildLifecycle(null); emitRows(null); classifyLifecycleClaim(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(SIGNAL_STAGES, { claim: process.argv.slice(2).join(' ') })) console.log(row);
}
