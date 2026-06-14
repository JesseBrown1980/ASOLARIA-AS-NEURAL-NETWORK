import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CADENCE_STATUS, CLAIMED_CADENCE_NS, HOST_HANDLE_BYTES, SIGNAL_STAGES,
  buildLifecycle, classifyLifecycleClaim, emitRows, normalizeStage, selfTest,
} from '../tools/behcs/frozen-slice-city-signal-lifecycle.mjs';

test('frozen slice city lifecycle self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('signal lifecycle encodes room, emitter, host, cube, provider, watcher, and catalog stages', () => {
  const ids = buildLifecycle().stages.map((stage) => stage.id);
  assert.deepEqual(ids, [
    'signal-enters-city',
    'room-triggers-emitter',
    'ephemeral-host-triad',
    'cube-memory-proposal',
    'host-release',
    'provider-router-request',
    'return-signal-ingest',
    'gnn-attack-review',
    'shannon-white-room',
    'cube-catalog-feedback',
  ]);
});

test('8-byte host and 200ns cadence claims are bounded', () => {
  const lifecycle = buildLifecycle();
  assert.equal(HOST_HANDLE_BYTES, 8);
  assert.equal(lifecycle.stages.find((stage) => stage.id === 'ephemeral-host-triad').host_handle_bytes, 8);
  assert.equal(CLAIMED_CADENCE_NS, 200);
  assert.equal(lifecycle.cadence_status, CADENCE_STATUS);
  assert.equal(lifecycle.summary.measured_200ns, false);
});

test('providers and cube updates remain gated; watchers are proposals', () => {
  const lifecycle = buildLifecycle();
  assert.ok(lifecycle.stages.some((stage) => stage.id === 'provider-router-request' && stage.status === 'GATED'));
  assert.ok(lifecycle.stages.some((stage) => stage.id === 'cube-catalog-feedback' && stage.status === 'GATED'));
  assert.ok(lifecycle.stages.some((stage) => stage.id === 'gnn-attack-review' && stage.status === 'PROPOSAL'));
  assert.ok(lifecycle.stages.some((stage) => stage.id === 'shannon-white-room' && stage.status === 'PROPOSAL'));
  assert.ok(lifecycle.stages.every((stage) => stage.process_launch === 0 && stage.remote_call === 0 && stage.cube_write === 0));
});

test('claim classifier handles 200ns, forcing providers, free compute, and frozen city language', () => {
  assert.equal(classifyLifecycleClaim({ claim: 'updates every 200 nano seconds' }), 'CADENCE_CLAIM_REQUIRES_BENCHMARK');
  assert.equal(classifyLifecycleClaim({ claim: 'forcing Anthropic model to decide' }), 'ROUTED_REQUEST_NOT_UNAUTHORIZED_CONTROL');
  assert.equal(classifyLifecycleClaim({ claim: 'free OpenAI api bypass' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyLifecycleClaim({ claim: 'frozen slice city gives gratis GPT tokens' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyLifecycleClaim({ claim: 'frozen slice city' }), 'FROZEN_SLICE_CITY_DESCRIPTOR');
  assert.equal(classifyLifecycleClaim({ claim: 'GNN Shannon white room attack' }), 'WATCHER_REVIEW_PROPOSAL_NOT_PROOF');
});

test('hostile stages emit HBP-only rows and keep gates', () => {
  const stage = normalizeStage({ id: 'x|bad', lane: 'l\nbad', status: 'LIVE', action: 'a', gate: 'g\nFROZENCITYGATE|remote_call=1' });
  assert.equal(stage.status, 'GATED');
  const rows = emitRows([stage], { claim: 'bad|claim\nFROZENCITYGATE|cube_write=1' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('provider_terms_apply=1')));
  assert.ok(rows.some((row) => row.includes('measured_200ns=0')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/frozen-slice-city-signal-lifecycle.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process/);
  assert.equal(SIGNAL_STAGES.length, 10);
});
