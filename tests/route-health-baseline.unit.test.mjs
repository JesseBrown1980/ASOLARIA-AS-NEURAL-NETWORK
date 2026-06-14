import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  ROUTE_TARGETS,
  emitRows,
  normalizeProbe,
  probeTarget,
  routeHealthBaseline,
  selfTest,
} from '../tools/behcs/route-health-baseline.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('the three core route targets are fixed and ordered', () => {
  assert.deepEqual(ROUTE_TARGETS.map((t) => `${t.id}:${new URL(t.base).port}`), [
    'liris_mirror_4944:4944',
    'behcs_bus_4947:4947',
    'acer_fabric_4949:4949',
  ]);
});

test('probe states classify UP, route boundary, degraded, down, timeout, and unprobed', () => {
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944', ok: true, http_status: 200 }).state, 'UP');
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944', http_status: 404 }).state, 'ROUTE_BOUNDARY');
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944', http_status: 503 }).state, 'HTTP_DEGRADED');
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944', error: 'ECONNREFUSED' }).state, 'DOWN');
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944', error: 'timeout' }).state, 'TIMEOUT');
  assert.equal(normalizeProbe({ id: 'liris_mirror_4944' }).state, 'UNPROBED');
});

test('baseline fills missing targets and summarizes answered/up counts', () => {
  const b = routeHealthBaseline([
    { id: 'liris_mirror_4944', ok: true, http_status: 200 },
    { id: 'acer_fabric_4949', http_status: 404 },
  ], { ts: '2026-06-13T23:00:00.000Z' });
  assert.equal(b.results.length, 3);
  assert.equal(b.summary.up, 1);
  assert.equal(b.summary.route_boundary, 1);
  assert.equal(b.summary.unprobed, 1);
  assert.equal(b.summary.answered, 2);
  assert.equal(b.summary.all_core_answered, false);
});

test('emitted rows are HBP-only, single-line, and read-only gated', () => {
  const rows = emitRows(routeHealthBaseline([
    { id: 'liris_mirror_4944', ok: true, http_status: 200, error: 'x|json=0\nFAKE|x=1' },
  ]));
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !/[\r\n]/.test(r) && !r.includes('{"')));
  assert.ok(rows.some((r) => r.startsWith('RHBGATE|') && r.includes('no_spawn=1') && r.includes('no_restart=1')));
});

test('body_sha16 is preserved when normalized baselines are emitted', () => {
  const b = routeHealthBaseline([{ id: 'liris_mirror_4944', ok: true, http_status: 200, body: 'route-health-proof-body' }]);
  const hash = b.results[0].body_sha16;
  assert.notEqual(hash, 'E3B0C44298FC1C14');
  assert.ok(emitRows(b).some((r) => r.includes(`body_sha16=${hash}`)));
});

test('probeTarget supports injected read-only fetchers', async () => {
  const target = ROUTE_TARGETS[0];
  const result = await probeTarget(target, {
    timeoutMs: 100,
    fetcher: async (url, opts) => {
      assert.equal(url, 'http://127.0.0.1:4944/health');
      assert.equal(opts.method, 'GET');
      return { ok: true, status: 200, text: async () => '{"ok":true}' };
    },
  });
  assert.equal(result.state, 'UP');
  assert.equal(result.source, 'live-fetch');
});

test('probeTarget turns fetch failures into DOWN/TIMEOUT observations, not throws', async () => {
  const down = await probeTarget(ROUTE_TARGETS[0], { fetcher: async () => { throw new Error('ECONNREFUSED'); } });
  assert.equal(down.state, 'DOWN');
  const timeout = await probeTarget(ROUTE_TARGETS[0], { fetcher: async () => { const e = new Error('abort'); e.name = 'AbortError'; throw e; } });
  assert.equal(timeout.state, 'TIMEOUT');
});

test('tool has no spawn/exec/write/mint/restart capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/route-health-baseline.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|mintPid|Start-Process|Stop-Process/.test(src), false);
});
