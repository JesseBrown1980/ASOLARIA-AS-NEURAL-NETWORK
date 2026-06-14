import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BRIDGE_STAGES, HOST_HANDLE_BYTES, PHONE_SURFACES,
  buildBridge, classifyBridgeClaim, emitRows, normalizePhone, selfTest,
} from '../tools/behcs/cellphone-host-bridge-boundary.mjs';

test('cellphone host bridge boundary self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('phones are modeled as 8-byte file-backed host bridges, not live execution', () => {
  const bridge = buildBridge();
  assert.equal(HOST_HANDLE_BYTES, 8);
  assert.equal(bridge.summary.live_ready, false);
  assert.equal(bridge.summary.external_compute_free, false);
  assert.ok(bridge.phones.every((p) => p.host_handle_bytes === 8 && p.process_launch === 0));
});

test('known bilateral phone surfaces and future gated slots are present', () => {
  const ids = buildBridge().phones.map((p) => p.id);
  assert.deepEqual(ids, ['falcon', 'aether', 's22-ultra', 'future-phone']);
  assert.equal(buildBridge().summary.proven, 2);
  assert.equal(buildBridge().summary.gated, 2);
});

test('file-manager roundtrip proof precedes messages and self-call routing', () => {
  assert.deepEqual(BRIDGE_STAGES, [
    'device-detect',
    'file-manager-roundtrip-proof',
    'host-handle-register',
    'language-cube-envelope',
    'phone-line-route',
    'supervisor-gate',
    'message-gulp-gc',
    'receipt-pullback',
  ]);
});

test('claim classifier gates self-calls and rejects provider bypass claims', () => {
  assert.equal(classifyBridgeClaim({ claim: 'cellphone 8 byte host handle' }), 'PHONE_HOST_BRIDGE_DESCRIPTOR');
  assert.equal(classifyBridgeClaim({ claim: 'supercomputers call themselves through our language' }), 'SELF_CALL_REQUIRES_EXPLICIT_AUTH_AND_ROUTE_PROOF');
  assert.equal(classifyBridgeClaim({ claim: 'free Google API provider bypass' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyBridgeClaim({ claim: 'pull push file roundtrip' }), 'FILE_MANAGER_PROOF_REQUIRED');
});

test('hostile phone rows stay HBP-only and gated', () => {
  const phone = normalizePhone({ id: 'x|bad', status: 'LIVE', gate: 'g\nPHONEBRIDGEGATE|process_launch=1' });
  assert.equal(phone.status, 'GATED_UNTIL_ROUNDTRIP_PROOF');
  const rows = emitRows([phone], { claim: 'bad|claim\nPHONEBRIDGEGATE|provider_bypass=1' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('provider_terms_apply=1')));
  assert.ok(rows.some((row) => row.includes('radio_policy_apply=1')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/cellphone-host-bridge-boundary.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process/);
  assert.equal(PHONE_SURFACES.length, 4);
});
