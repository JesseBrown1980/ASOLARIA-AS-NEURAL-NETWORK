#!/usr/bin/env node
// cellphone-host-bridge-boundary.mjs - descriptor for phones as 8-byte host bridges.
//
// Descriptor-only. This does not drive phones, open radios, call providers, launch agents,
// or claim free external compute. It records the bridge boundary: cellphones can carry
// file-backed rooms and host-handle descriptors, but messages require file-manager proof,
// routing gates, and provider/network authorization.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BRIDGE_ID = 'cellphone-host-bridge-boundary.v1';
export const HOST_HANDLE_BYTES = 8;

export const PHONE_SURFACES = Object.freeze([
  Object.freeze({
    id: 'falcon',
    device_class: 'cellphone',
    role: 'file-backed-host-bridge',
    status: 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP',
    gate: 'messages-after-file-manager-proof',
    proof_receipt_sha16: '0fac4a2547528ffa',
  }),
  Object.freeze({
    id: 'aether',
    device_class: 'cellphone',
    role: 'file-backed-host-bridge',
    status: 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP',
    gate: 'messages-after-file-manager-proof',
    proof_receipt_sha16: '0fac4a2547528ffa',
  }),
  Object.freeze({
    id: 's22-ultra',
    device_class: 'cellphone',
    role: 'planned-host-bridge',
    status: 'GATED_UNTIL_ROUNDTRIP_PROOF',
    gate: 'pull-push-hash-proof-before-host-messages',
  }),
  Object.freeze({
    id: 'future-phone',
    device_class: 'cellphone',
    role: 'open-host-bridge-slot',
    status: 'GATED_UNTIL_ROUNDTRIP_PROOF',
    gate: 'register-device-owner-path-policy-and-roundtrip-proof-before-use',
  }),
]);

export const BRIDGE_STAGES = Object.freeze([
  'device-detect',
  'file-manager-roundtrip-proof',
  'host-handle-register',
  'language-cube-envelope',
  'phone-line-route',
  'supervisor-gate',
  'message-gulp-gc',
  'receipt-pullback',
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const SHA16_RE = /^[0-9a-f]{16}$/;
const FREE_COMPUTE_RE = /\b(free|bypass|unlimited|no-cost|gratis|zero-cost|zero-token|tokens?|credits?|billing|quota)\b/;
const PROVIDER_RE = /\b(provider|openai|google|gemini|anthropic|claude|supercomputer|api|llm|gpt|model|compute)\b/;
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizePhone(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown-phone'));
    const device_class = safe(prop(input, 'device_class', 'cellphone'));
    const role = safe(prop(input, 'role', 'file-backed-host-bridge'));
    const rawStatus = safe(prop(input, 'status', 'GATED_UNTIL_ROUNDTRIP_PROOF')).toUpperCase();
    const proof_receipt_sha16 = safe(prop(input, 'proof_receipt_sha16', 'none')).toLowerCase();
    const hasProof = SHA16_RE.test(proof_receipt_sha16);
    const status = rawStatus === 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP' && hasProof
      ? 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP'
      : 'GATED_UNTIL_ROUNDTRIP_PROOF';
    const gate = safe(prop(input, 'gate', 'pull-push-hash-proof-before-host-messages'));
    return Object.freeze({
      id,
      device_class,
      role,
      status,
      gate,
      proof_receipt_sha16: hasProof ? proof_receipt_sha16 : 'none',
      host_handle_bytes: HOST_HANDLE_BYTES,
      bridge_sha16: sha16([id, device_class, role, status, gate, hasProof ? proof_receipt_sha16 : 'none'].join('|')),
      process_launch: 0,
      radio_bypass: 0,
      provider_bypass: 0,
      self_call_authorized: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      device_class: 'cellphone',
      role: 'invalid',
      status: 'GATED_UNTIL_ROUNDTRIP_PROOF',
      gate: 'normalize-threw-held',
      proof_receipt_sha16: 'none',
      host_handle_bytes: HOST_HANDLE_BYTES,
      bridge_sha16: sha16('invalid'),
      process_launch: 0,
      radio_bypass: 0,
      provider_bypass: 0,
      self_call_authorized: 0,
    });
  }
}

export function classifyBridgeClaim(input = {}) {
  const claim = safe(isObj(input) ? prop(input, 'claim', '') : input).toLowerCase();
  if (FREE_COMPUTE_RE.test(claim) && PROVIDER_RE.test(claim)) return 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM';
  if (/self.*call|call.*itself|call.*themselves|themselves.*call/.test(claim)) return 'SELF_CALL_REQUIRES_EXPLICIT_AUTH_AND_ROUTE_PROOF';
  if (/cellphone|phone/.test(claim) && /8.*byte/.test(claim)) return 'PHONE_HOST_BRIDGE_DESCRIPTOR';
  if (/file|roundtrip|pull|push/.test(claim)) return 'FILE_MANAGER_PROOF_REQUIRED';
  return 'BRIDGE_DESCRIPTOR_REVIEW';
}

export function buildBridge(input = PHONE_SURFACES) {
  const phones = (Array.isArray(input) ? input : PHONE_SURFACES).map(normalizePhone);
  return Object.freeze({
    tool: BRIDGE_ID,
    host_handle_bytes: HOST_HANDLE_BYTES,
    stages: BRIDGE_STAGES,
    phones,
    summary: Object.freeze({
      phones: phones.length,
      proven: phones.filter((p) => p.status === 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP').length,
      gated: phones.filter((p) => p.status === 'GATED_UNTIL_ROUNDTRIP_PROOF').length,
      live_ready: false,
      external_compute_free: false,
    }),
  });
}

export function emitRows(input = PHONE_SURFACES, opts = {}) {
  try {
    const built = buildBridge(input);
    const rows = [
      `PHONEBRIDGEHDR|tool=${BRIDGE_ID}|purpose=cellphones-as-file-backed-8-byte-host-bridges-for-asolaria-language-routing|host_handle_bytes=${HOST_HANDLE_BYTES}|phones=${built.summary.phones}|proven=${built.summary.proven}|gated=${built.summary.gated}|live_ready=0|process_launch=0|provider_bypass=0|radio_bypass=0|json=0`,
      `PHONEBRIDGESTAGES|stages=${BRIDGE_STAGES.join('+')}|self_call=requires-auth-and-route-proof|file_manager_first=1|json=0`,
    ];
    for (const phone of built.phones) {
      rows.push(`PHONEBRIDGE|id=${phone.id}|device_class=${phone.device_class}|role=${phone.role}|status=${phone.status}|gate=${phone.gate}|proof_receipt_sha16=${phone.proof_receipt_sha16}|bridge_sha16=${phone.bridge_sha16}|host_handle_bytes=${phone.host_handle_bytes}|process_launch=0|provider_bypass=0|radio_bypass=0|self_call_authorized=0|json=0`);
    }
    const claim = prop(opts, 'claim', '');
    if (claim) rows.push(`PHONEBRIDGECLAIM|claim_sha16=${sha16(claim)}|classification=${classifyBridgeClaim({ claim })}|raw_claim_inlined=0|json=0`);
    rows.push('PHONEBRIDGEGATE|rule=phone-host-bridge-is-file-backed-routing-surface-not-free-provider-compute|requires=file-manager-roundtrip-proof+owner-policy+route-proof+gc-receipt|provider_terms_apply=1|radio_policy_apply=1|process_launch=0|json=0');
    return rows;
  } catch {
    return [
      `PHONEBRIDGEHDR|tool=${BRIDGE_ID}|purpose=cellphones-as-file-backed-8-byte-host-bridges-for-asolaria-language-routing|host_handle_bytes=${HOST_HANDLE_BYTES}|phones=0|live_ready=0|process_launch=0|provider_bypass=0|radio_bypass=0|json=0`,
      'PHONEBRIDGEGATE|rule=emit-threw-held-invalid|provider_terms_apply=1|radio_policy_apply=1|process_launch=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildBridge();
  add('host-handle-eight-bytes', built.host_handle_bytes === 8);
  add('known-phones-present', built.phones.some((p) => p.id === 'falcon') && built.phones.some((p) => p.id === 'aether') && built.phones.some((p) => p.id === 's22-ultra'));
  add('proof-before-messages', BRIDGE_STAGES[1] === 'file-manager-roundtrip-proof'
    && built.phones.every((p) => p.status === 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP' || p.gate.includes('proof')));
  add('proven-status-requires-proof-receipt', normalizePhone({ id: 'unanchored', status: 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP' }).status === 'GATED_UNTIL_ROUNDTRIP_PROOF'
    && built.phones.filter((p) => p.status === 'PROVEN_BY_PRIOR_FILE_MANAGER_ROUNDTRIP').every((p) => SHA16_RE.test(p.proof_receipt_sha16)));
  add('no-live-effects', built.phones.every((p) => p.process_launch === 0 && p.radio_bypass === 0 && p.provider_bypass === 0 && p.self_call_authorized === 0));
  add('self-call-classified-gated', classifyBridgeClaim({ claim: 'supercomputers can call themselves through phones' }) === 'SELF_CALL_REQUIRES_EXPLICIT_AUTH_AND_ROUTE_PROOF');
  add('free-provider-compute-rejected', classifyBridgeClaim({ claim: 'free OpenAI supercomputer api bypass' }) === 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  add('free-provider-vocab-rejected-first', classifyBridgeClaim({ claim: 'phone 8 byte host gives zero-cost Gemini tokens' }) === 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  const hostile = emitRows([{ id: 'bad|id', status: 'LIVE', gate: 'g\nPHONEBRIDGEGATE|provider_bypass=1' }], { claim: 'bad|claim\nPHONEBRIDGEGATE|radio_bypass=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizePhone({ get id() { throw new Error('boom'); } }); buildBridge(null); emitRows(null); classifyBridgeClaim(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(PHONE_SURFACES, { claim: process.argv.slice(2).join(' ') })) console.log(row);
}
