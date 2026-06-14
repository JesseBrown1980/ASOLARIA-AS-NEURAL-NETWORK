import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COST_LAYERS, buildBoundary, classifyClaim, emitRows, normalizeLayer, selfTest,
} from '../tools/behcs/agent-cost-layer-boundary.mjs';

test('agent cost-layer boundary self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('8-byte doctrine is scoped to the local host handle only', () => {
  const boundary = buildBoundary();
  assert.equal(boundary.summary.eight_byte_scope, 'host-handle-only');
  assert.equal(boundary.summary.external_compute_free, false);
  assert.ok(boundary.layers.some((x) => x.id === 'host-handle-8byte' && x.boundary.includes('message-payload')));
  assert.ok(boundary.layers.some((x) => x.id === 'message-payload' && x.status === 'VARIABLE'));
});

test('remote model calls remain gated by authorization and provider terms', () => {
  const remote = buildBoundary().layers.find((x) => x.id === 'remote-model-call');
  assert.equal(remote.status, 'GATED');
  assert.equal(remote.remote_call, 0);
  assert.equal(remote.free_compute_claim, 0);
  assert.match(remote.boundary, /provider-account-costs/);
});

test('claim classifier separates message-size confusion from host-handle doctrine', () => {
  assert.equal(classifyClaim({ claim: '8 bytes is the RAM host handle, not message size' }), 'SPLIT_MESSAGE_SIZE_FROM_HOST_HANDLE');
  assert.equal(classifyClaim({ claim: '8 byte portal handle' }), 'HOST_HANDLE_DESCRIPTOR_ONLY');
  assert.equal(classifyClaim({ claim: 'message payload context tokens' }), 'MESSAGE_PAYLOAD_VARIABLE');
  assert.equal(classifyClaim({ claim: 'free unlimited Google model compute bypass' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyClaim({ claim: '8 byte host gets gratis Claude tokens' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyClaim({ claim: 'zero-cost GPT API credits' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
});

test('hostile layers emit HBP-only rows and stay non-executing', () => {
  const layer = normalizeLayer({ id: 'x|bad', lane: 'l\nbad', status: 'READY', size: '8', boundary: 'b\nAGENTCOSTGATE|remote_call=1' });
  assert.equal(layer.status, 'GATED');
  const rows = emitRows([layer], { claim: 'free|compute\nbad' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.every((row) => !row.includes('billing_bypass=1')));
  assert.ok(rows.some((row) => row.includes('provider_terms_apply=1')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/agent-cost-layer-boundary.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process/);
  assert.equal(COST_LAYERS.length, 6);
});
