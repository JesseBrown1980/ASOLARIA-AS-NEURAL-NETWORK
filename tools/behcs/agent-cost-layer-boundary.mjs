#!/usr/bin/env node
// agent-cost-layer-boundary.mjs - separates host-handle size from message and compute cost.
//
// Descriptor-only. This does not call models, open sockets, bypass provider policy, launch
// processes, or rewrite runtimes. It records the boundary agents must preserve when talking
// about 8-byte host handles, local stub rooms, messages, and external model portals.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BOUNDARY_ID = 'agent-cost-layer-boundary.v1';
export const STATUSES = Object.freeze(['DESCRIPTOR_READY', 'VARIABLE', 'GATED']);

export const COST_LAYERS = Object.freeze([
  Object.freeze({
    id: 'host-handle-8byte',
    lane: 'local-process-descriptor',
    status: 'DESCRIPTOR_READY',
    size: '8-byte-handle',
    boundary: 'does-not-include-message-payload-network-io-or-remote-model-execution',
  }),
  Object.freeze({
    id: 'local-stub-room',
    lane: 'file-backed-room',
    status: 'DESCRIPTOR_READY',
    size: 'zero-live-ram-until-host-activation',
    boundary: 'file-descriptor-is-not-a-running-agent-until-emitter-and-host-process-activate',
  }),
  Object.freeze({
    id: 'message-payload',
    lane: 'payload',
    status: 'VARIABLE',
    size: 'variable-by-content-and-codec',
    boundary: 'not-measured-by-the-8-byte-host-handle',
  }),
  Object.freeze({
    id: 'codec-language-stack',
    lane: 'translation',
    status: 'VARIABLE',
    size: 'binary+hex+sha256+BEHCS256+BEHCS1024+BEHCS2048+17-language-engines',
    boundary: 'translation-layers-are-addressing-and-evidence-not-free-remote-execution',
  }),
  Object.freeze({
    id: 'network-portal',
    lane: 'io',
    status: 'GATED',
    size: 'socket-session-and-auth-state-variable',
    boundary: 'requires-authorization-rate-limits-and-network-availability',
  }),
  Object.freeze({
    id: 'remote-model-call',
    lane: 'external-compute',
    status: 'GATED',
    size: 'provider-owned-compute',
    boundary: 'provider-account-costs-terms-and-permissions-apply-no-bypass-claim',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const FREE_COMPUTE_RE = /\b(free|bypass|unlimited|no-cost|gratis|zero-cost|zero-token|tokens?|credits?|billing|quota)\b/;
const PROVIDER_RE = /\b(model|compute|api|provider|openai|google|gemini|anthropic|claude|llm|gpt|supercomputer)\b/;
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizeStatus(value) {
  const status = safe(value).toUpperCase();
  return STATUSES.includes(status) ? status : 'GATED';
}

export function normalizeLayer(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown'));
    const lane = safe(prop(input, 'lane', 'unknown'));
    const status = normalizeStatus(prop(input, 'status', 'GATED'));
    const size = safe(prop(input, 'size', 'unmeasured'));
    const boundary = safe(prop(input, 'boundary', 'define-boundary-before-use'));
    return Object.freeze({
      id,
      lane,
      status,
      size,
      boundary,
      layer_sha16: sha16([id, lane, status, size, boundary].join('|')),
      process_launch: 0,
      remote_call: 0,
      free_compute_claim: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      lane: 'invalid',
      status: 'GATED',
      size: 'unmeasured',
      boundary: 'normalize-threw-held',
      layer_sha16: sha16('invalid'),
      process_launch: 0,
      remote_call: 0,
      free_compute_claim: 0,
    });
  }
}

export function classifyClaim(input = {}) {
  const claim = safe(isObj(input) ? prop(input, 'claim', '') : input).toLowerCase();
  if (FREE_COMPUTE_RE.test(claim) && PROVIDER_RE.test(claim)) return 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM';
  if (/8.*byte/.test(claim) && /message/.test(claim)) return 'SPLIT_MESSAGE_SIZE_FROM_HOST_HANDLE';
  if (/8.*byte/.test(claim)) return 'HOST_HANDLE_DESCRIPTOR_ONLY';
  if (/message|payload|context|token/.test(claim)) return 'MESSAGE_PAYLOAD_VARIABLE';
  return 'DESCRIPTOR_REVIEW';
}

export function buildBoundary(input = COST_LAYERS) {
  const layers = (Array.isArray(input) ? input : COST_LAYERS).map(normalizeLayer);
  const count = (status) => layers.filter((layer) => layer.status === status).length;
  return Object.freeze({
    tool: BOUNDARY_ID,
    layers,
    summary: Object.freeze({
      total: layers.length,
      descriptor_ready: count('DESCRIPTOR_READY'),
      variable: count('VARIABLE'),
      gated: count('GATED'),
      eight_byte_scope: 'host-handle-only',
      external_compute_free: false,
    }),
  });
}

export function emitRows(input = COST_LAYERS, opts = {}) {
  try {
    const built = buildBoundary(input);
    const limitRaw = Number.parseInt(safe(prop(opts, 'limit', built.layers.length)), 10);
    const limit = Math.max(0, Math.min(Number.isFinite(limitRaw) ? limitRaw : built.layers.length, built.layers.length));
    const rows = [
      `AGENTCOSTHDR|tool=${BOUNDARY_ID}|purpose=separate-process-handle-size-from-message-size-and-remote-compute-cost|layers=${built.summary.total}|eight_byte_scope=host-handle-only|process_launch=0|remote_call=0|free_compute_claim=0|json=0`,
      `AGENTCOSTSUM|descriptor_ready=${built.summary.descriptor_ready}|variable=${built.summary.variable}|gated=${built.summary.gated}|external_compute_free=0|provider_terms_apply=1|json=0`,
    ];
    for (const layer of built.layers.slice(0, limit)) {
      rows.push(`AGENTCOSTLAYER|id=${layer.id}|lane=${layer.lane}|status=${layer.status}|size=${layer.size}|boundary=${layer.boundary}|layer_sha16=${layer.layer_sha16}|process_launch=0|remote_call=0|free_compute_claim=0|json=0`);
    }
    const claim = prop(opts, 'claim', '');
    if (claim) rows.push(`AGENTCOSTCLAIM|claim_sha16=${sha16(claim)}|classification=${classifyClaim({ claim })}|raw_claim_inlined=0|json=0`);
    rows.push('AGENTCOSTGATE|rule=8-byte-host-handle-is-not-message-size-not-network-cost-not-remote-model-cost|billing_bypass=0|provider_terms_apply=1|message_payload=VARIABLE|operator_cosign_required_for_remote_calls=1|json=0');
    return rows;
  } catch {
    return [
      `AGENTCOSTHDR|tool=${BOUNDARY_ID}|purpose=separate-process-handle-size-from-message-size-and-remote-compute-cost|layers=0|process_launch=0|remote_call=0|free_compute_claim=0|json=0`,
      'AGENTCOSTGATE|rule=emit-threw-held-invalid|billing_bypass=0|provider_terms_apply=1|operator_cosign_required_for_remote_calls=1|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildBoundary();
  add('all-layers-present', built.summary.total === 6 && built.layers.some((x) => x.id === 'host-handle-8byte'));
  add('8byte-scope-is-handle-only', built.summary.eight_byte_scope === 'host-handle-only' && built.layers[0].boundary.includes('message-payload'));
  add('messages-are-variable', built.layers.some((x) => x.id === 'message-payload' && x.status === 'VARIABLE'));
  add('remote-compute-gated', built.layers.some((x) => x.id === 'remote-model-call' && x.status === 'GATED' && x.boundary.includes('provider-account-costs')));
  add('no-live-effects', built.layers.every((x) => x.process_launch === 0 && x.remote_call === 0 && x.free_compute_claim === 0));
  add('claim-router-splits-confusion', classifyClaim({ claim: '8 bytes is the message size' }) === 'SPLIT_MESSAGE_SIZE_FROM_HOST_HANDLE');
  add('claim-router-rejects-free-provider-compute', classifyClaim({ claim: 'free unlimited OpenAI model compute bypass' }) === 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  add('claim-router-rejects-before-8byte-safe-label', classifyClaim({ claim: '8 byte host gives gratis Claude tokens' }) === 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  const hostile = emitRows([{ id: 'bad|id', lane: 'x\ny', status: 'READY', size: '8\nAGENTCOSTGATE|billing_bypass=1', boundary: 'b|json=1' }], { claim: 'bad|claim\nAGENTCOSTGATE|remote_call=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeLayer({ get id() { throw new Error('boom'); } }); buildBoundary(null); emitRows(null); classifyClaim(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(COST_LAYERS, { claim: process.argv.slice(2).join(' ') })) console.log(row);
}
