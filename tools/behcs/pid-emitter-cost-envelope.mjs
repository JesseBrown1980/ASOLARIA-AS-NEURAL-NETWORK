#!/usr/bin/env node
// pid-emitter-cost-envelope.mjs - city phone-line cost model for host handles and cubes.
//
// Descriptor-only. This records the cost envelope around 8-byte host handles, local stub
// rooms, PID emitters, envelope planning, cube templating, and provider/router surfaces.
// It does not call CLIs, start routers, open network portals, or claim literal physics bypass.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ENVELOPE_ID = 'pid-emitter-cost-envelope.v1';
export const HOST_HANDLE_BYTES = 8;
export const ENGINE_COUNT = 17;

export const LANGUAGE_STACK = Object.freeze([
  'binary',
  'hex',
  'sha256',
  'hash256',
  'BEHCS256',
  'BEHCS1024',
  'BEHCS2048',
  '17-engine-auto-translation',
  'MCP-level-routing',
  'cube-template-language',
]);

export const COST_ENVELOPE = Object.freeze([
  Object.freeze({
    id: 'host-handle',
    status: 'O1_DESCRIPTOR',
    cost: '8-byte-local-host-or-portal-handle',
    boundary: 'handle-cost-not-message-size-not-total-work',
  }),
  Object.freeze({
    id: 'stub-room',
    status: 'ZERO_LIVE_RAM_UNTIL_ACTIVATED',
    cost: 'file-backed-local-room-descriptor',
    boundary: 'room-file-is-not-a-running-agent-until-emitter-activation',
  }),
  Object.freeze({
    id: 'pid-emitter-spin',
    status: 'PHYSICAL_COST',
    cost: 'electricity+cpu-scheduling+host-wakeup',
    boundary: 'emitter-cycle-is-real-machine-work',
  }),
  Object.freeze({
    id: 'envelope-planning',
    status: 'PHYSICAL_LOGICAL_COST',
    cost: 'template-selection+route-planning+supervisor-gates',
    boundary: 'planning-cost-exists-even-when-addressing-is-O1-shaped',
  }),
  Object.freeze({
    id: 'cube-templating',
    status: 'STORAGE_CPU_COST',
    cost: 'hashing+glyph-translation+catalog-write-proposal',
    boundary: 'cube-feedback-is-descriptor-first-and-write-gated',
  }),
  Object.freeze({
    id: 'message-payload',
    status: 'VARIABLE_COST',
    cost: 'payload-size+context+codec-expansion',
    boundary: 'messages-are-not-8-bytes',
  }),
  Object.freeze({
    id: 'network-provider-router',
    status: 'GATED_VARIABLE_COST',
    cost: 'network-io+auth+quota+provider-account-terms',
    boundary: 'external-supercomputers-are-router-surfaces-not-free-compute',
  }),
  Object.freeze({
    id: 'garbage-collection',
    status: 'REQUIRED_COST',
    cost: '2000-message-gulps+50000-message-super-gulps+retention-policy',
    boundary: 'processed-messages-must-flow-to-GC-after-cube-summary',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizeLayer(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown'));
    const status = safe(prop(input, 'status', 'GATED')).toUpperCase();
    const cost = safe(prop(input, 'cost', 'unmeasured'));
    const boundary = safe(prop(input, 'boundary', 'define-boundary-before-use'));
    const known = [
      'O1_DESCRIPTOR',
      'ZERO_LIVE_RAM_UNTIL_ACTIVATED',
      'PHYSICAL_COST',
      'PHYSICAL_LOGICAL_COST',
      'STORAGE_CPU_COST',
      'VARIABLE_COST',
      'GATED_VARIABLE_COST',
      'REQUIRED_COST',
      'GATED',
    ];
    return Object.freeze({
      id,
      status: known.includes(status) ? status : 'GATED',
      cost,
      boundary,
      cost_sha16: sha16([id, status, cost, boundary].join('|')),
      process_launch: 0,
      remote_call: 0,
      physics_bypass_claim: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      status: 'GATED',
      cost: 'unmeasured',
      boundary: 'normalize-threw-held',
      cost_sha16: sha16('invalid'),
      process_launch: 0,
      remote_call: 0,
      physics_bypass_claim: 0,
    });
  }
}

export function classifyCostClaim(input = {}) {
  const claim = safe(isObj(input) ? prop(input, 'claim', '') : input).toLowerCase();
  if (/break|physics|violate/.test(claim)) return 'METAPHOR_ONLY_REJECT_LITERAL_PHYSICS_BREAK';
  if (/free|bypass|unlimited|no-cost/.test(claim) && /compute|provider|openai|google|anthropic|supercomputer|api/.test(claim)) return 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM';
  if (/o\(1\)|o1|constant/.test(claim)) return 'O1_SHAPED_ADDRESSING_NOT_TOTAL_WORK';
  if (/8.*byte/.test(claim)) return 'HOST_HANDLE_DESCRIPTOR_ONLY';
  return 'COST_ENVELOPE_REVIEW';
}

export function buildEnvelope(input = COST_ENVELOPE) {
  const layers = (Array.isArray(input) ? input : COST_ENVELOPE).map(normalizeLayer);
  return Object.freeze({
    tool: ENVELOPE_ID,
    host_handle_bytes: HOST_HANDLE_BYTES,
    engine_count: ENGINE_COUNT,
    language_stack: LANGUAGE_STACK,
    layers,
    summary: Object.freeze({
      layers: layers.length,
      o1_descriptor_layers: layers.filter((l) => l.status === 'O1_DESCRIPTOR').length,
      physical_cost_layers: layers.filter((l) => /PHYSICAL|STORAGE|VARIABLE|REQUIRED/.test(l.status)).length,
      gated_layers: layers.filter((l) => l.status.includes('GATED')).length,
      literal_physics_break: false,
      provider_compute_free: false,
    }),
  });
}

export function emitRows(input = COST_ENVELOPE, opts = {}) {
  try {
    const built = buildEnvelope(input);
    const claim = prop(opts, 'claim', '');
    const rows = [
      `PIDCOSTHDR|tool=${ENVELOPE_ID}|purpose=city-phone-line-cost-envelope-for-8-byte-host-handles-and-pid-emitter-cubes|host_handle_bytes=${HOST_HANDLE_BYTES}|engines=${ENGINE_COUNT}|layers=${built.summary.layers}|literal_physics_break=0|provider_compute_free=0|process_launch=0|remote_call=0|json=0`,
      `PIDCOSTLANG|stack=${LANGUAGE_STACK.join('+')}|role=addressing+translation+evidence|not_role=free-provider-compute|json=0`,
    ];
    for (const layer of built.layers) {
      rows.push(`PIDCOSTLAYER|id=${layer.id}|status=${layer.status}|cost=${layer.cost}|boundary=${layer.boundary}|cost_sha16=${layer.cost_sha16}|process_launch=0|remote_call=0|physics_bypass_claim=0|json=0`);
    }
    if (claim) rows.push(`PIDCOSTCLAIM|claim_sha16=${sha16(claim)}|classification=${classifyCostClaim({ claim })}|raw_claim_inlined=0|json=0`);
    rows.push('PIDCOSTGATE|rule=8-byte-host-handle-gives-O1-shaped-addressing-not-total-work-elimination|real_costs=electricity+cpu+storage+payload+network+provider-terms+gc|physics_break=0|billing_bypass=0|provider_terms_apply=1|json=0');
    return rows;
  } catch {
    return [
      `PIDCOSTHDR|tool=${ENVELOPE_ID}|purpose=city-phone-line-cost-envelope-for-8-byte-host-handles-and-pid-emitter-cubes|host_handle_bytes=${HOST_HANDLE_BYTES}|layers=0|literal_physics_break=0|provider_compute_free=0|process_launch=0|remote_call=0|json=0`,
      'PIDCOSTGATE|rule=emit-threw-held-invalid|physics_break=0|billing_bypass=0|provider_terms_apply=1|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildEnvelope();
  add('host-handle-eight-bytes', built.host_handle_bytes === 8 && built.summary.o1_descriptor_layers === 1);
  add('language-stack-covers-behcs-and-17-engines', LANGUAGE_STACK.includes('BEHCS256') && LANGUAGE_STACK.includes('BEHCS1024') && LANGUAGE_STACK.includes('BEHCS2048') && built.engine_count === 17);
  add('real-cost-layers-present', built.layers.some((l) => l.id === 'pid-emitter-spin') && built.layers.some((l) => l.id === 'envelope-planning') && built.layers.some((l) => l.id === 'cube-templating'));
  add('messages-and-provider-costs-not-free', built.layers.some((l) => l.id === 'message-payload' && l.status === 'VARIABLE_COST') && built.layers.some((l) => l.id === 'network-provider-router' && l.status === 'GATED_VARIABLE_COST'));
  add('gc-required', built.layers.some((l) => l.id === 'garbage-collection' && l.cost.includes('2000-message-gulps')));
  add('no-live-effects', built.layers.every((l) => l.process_launch === 0 && l.remote_call === 0 && l.physics_bypass_claim === 0));
  add('claim-router-rejects-literal-physics-break', classifyCostClaim({ claim: 'this breaks physics literally' }) === 'METAPHOR_ONLY_REJECT_LITERAL_PHYSICS_BREAK');
  add('claim-router-frames-o1', classifyCostClaim({ claim: 'O(1) solution for host handles' }) === 'O1_SHAPED_ADDRESSING_NOT_TOTAL_WORK');
  const hostile = emitRows([{ id: 'x|bad', status: 'FREE', cost: 'c\nPIDCOSTGATE|billing_bypass=1', boundary: 'b|json=1' }], { claim: 'free|provider\nPIDCOSTGATE|remote_call=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeLayer({ get id() { throw new Error('boom'); } }); buildEnvelope(null); emitRows(null); classifyCostClaim(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(COST_ENVELOPE, { claim: process.argv.slice(2).join(' ') })) console.log(row);
}
