import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  COST_ENVELOPE, ENGINE_COUNT, HOST_HANDLE_BYTES, LANGUAGE_STACK,
  buildEnvelope, classifyCostClaim, emitRows, normalizeLayer, selfTest,
} from '../tools/behcs/pid-emitter-cost-envelope.mjs';

test('PID emitter cost envelope self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('city phone-line model keeps 8-byte handle separate from total work', () => {
  const built = buildEnvelope();
  assert.equal(HOST_HANDLE_BYTES, 8);
  assert.equal(built.summary.o1_descriptor_layers, 1);
  assert.equal(built.summary.literal_physics_break, false);
  assert.equal(built.summary.provider_compute_free, false);
});

test('language stack covers binary, hex, hash, BEHCS, and 17 engines', () => {
  assert.equal(ENGINE_COUNT, 17);
  assert.ok(LANGUAGE_STACK.includes('binary'));
  assert.ok(LANGUAGE_STACK.includes('hex'));
  assert.ok(LANGUAGE_STACK.includes('sha256'));
  assert.ok(LANGUAGE_STACK.includes('hash256'));
  assert.ok(LANGUAGE_STACK.includes('BEHCS256'));
  assert.ok(LANGUAGE_STACK.includes('BEHCS1024'));
  assert.ok(LANGUAGE_STACK.includes('BEHCS2048'));
});

test('real cost envelope includes emitter spin, planning, cube templating, payload, provider, and GC', () => {
  const built = buildEnvelope();
  for (const id of ['pid-emitter-spin', 'envelope-planning', 'cube-templating', 'message-payload', 'network-provider-router', 'garbage-collection']) {
    assert.ok(built.layers.some((layer) => layer.id === id), id);
  }
  assert.ok(built.layers.every((layer) => layer.process_launch === 0 && layer.remote_call === 0));
});

test('claim classifier blocks literal physics and provider bypass claims', () => {
  assert.equal(classifyCostClaim({ claim: 'breaks physics kind of feel' }), 'METAPHOR_ONLY_REJECT_LITERAL_PHYSICS_BREAK');
  assert.equal(classifyCostClaim({ claim: 'free unlimited OpenAI supercomputer compute bypass' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyCostClaim({ claim: 'O(1) host handle addressing' }), 'O1_SHAPED_ADDRESSING_NOT_TOTAL_WORK');
  assert.equal(classifyCostClaim({ claim: '8 byte host process' }), 'HOST_HANDLE_DESCRIPTOR_ONLY');
});

test('hostile layers emit HBP-only rows and keep the gate', () => {
  const layer = normalizeLayer({ id: 'x|bad', status: 'FREE', cost: 'c\nPIDCOSTGATE|billing_bypass=1', boundary: 'b|json=1' });
  assert.equal(layer.status, 'GATED');
  const rows = emitRows([layer], { claim: 'bad|claim\nPIDCOSTGATE|remote_call=1' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('physics_break=0')));
  assert.ok(rows.some((row) => row.includes('provider_terms_apply=1')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/pid-emitter-cost-envelope.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process/);
  assert.equal(COST_ENVELOPE.length, 8);
});
