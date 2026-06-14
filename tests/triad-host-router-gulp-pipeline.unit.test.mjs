import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FEEDBACK_STAGES, GULP_MESSAGES, HOST_HANDLE_BYTES, ROUTER_SURFACES, SUPER_GULP_MESSAGES,
  TRIAD_ROLES, buildPipeline, emitRows, normalizeRouter, selfTest, triadForMessage,
} from '../tools/behcs/triad-host-router-gulp-pipeline.mjs';

test('triad host-router pipeline self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('host process doctrine is encoded as an 8-byte descriptor, not a node process per agent', () => {
  const built = buildPipeline();
  assert.equal(HOST_HANDLE_BYTES, 8);
  assert.equal(built.summary.no_node_per_agent, true);
  assert.equal(built.summary.live_ready, false);
  assert.ok(built.routers.every((r) => r.host_handle_bytes === 8 && r.node_per_agent === 0));
});

test('rule of three produces real, self-reflect, and fabric-reflect handles for the supervisor', () => {
  const triad = triadForMessage({ message_id: 'operator-message-1' });
  assert.deepEqual(TRIAD_ROLES.map((r) => r.id), ['real-agent', 'self-reflect-agent', 'fabric-reflect-agent']);
  assert.equal(triad.length, 3);
  assert.equal(new Set(triad.map((r) => r.handle8)).size, 3);
  assert.ok(triad.every((r) => r.process_launch === 0 && r.remote_call === 0));
});

test('gulp and super-gulp GC sizes are fixed and watcher stages are present', () => {
  assert.equal(GULP_MESSAGES, 2000);
  assert.equal(SUPER_GULP_MESSAGES, 50000);
  assert.ok(FEEDBACK_STAGES.includes('message-gulp-gc'));
  assert.ok(FEEDBACK_STAGES.includes('reverse-sieve-gnn-proposal'));
  assert.ok(FEEDBACK_STAGES.includes('omnishannon-novelty'));
  assert.ok(FEEDBACK_STAGES.includes('white-room-review'));
  assert.ok(FEEDBACK_STAGES.includes('cube-catalog-feedback'));
});

test('provider and CLI routers are descriptors with authorization gates', () => {
  const built = buildPipeline();
  assert.ok(built.routers.some((r) => r.id === 'opencode' && r.status === 'REGISTERED_DESCRIPTOR'));
  assert.ok(built.routers.some((r) => r.id === 'openai' && r.gate.includes('billing-apply')));
  assert.ok(built.routers.some((r) => r.id === 'claude' && r.gate.includes('terms-and-quota')));
  assert.ok(built.routers.some((r) => r.id === 'registered-cli' && r.status === 'GATED'));
});

test('hostile router input is gated and HBP-only', () => {
  const router = normalizeRouter({ id: 'x|bad', kind: 'k\nbad', status: 'RUN', gate: 'g\nTRIADROUTGATE|remote_call=1' });
  assert.equal(router.status, 'GATED');
  const rows = emitRows([router], { message_id: 'm|bad\ninject' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('provider_bypass=0')));
  assert.ok(rows.some((row) => row.includes('summary_hash_retention=1')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/triad-host-router-gulp-pipeline.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process/);
  assert.equal(ROUTER_SURFACES.length, 8);
});
