import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  PIPELINE, SURFACES, buildMap, emitRows, normalizeSurface, selfTest,
} from '../tools/behcs/program-cube-ingestion-map.mjs';

test('program cube ingestion self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('map classifies owned, external, device, cloud, and gated surfaces', () => {
  const map = buildMap();
  assert.equal(map.summary.total, 9);
  assert.equal(map.summary.owned, 2);
  assert.equal(map.summary.external_read_only, 3);
  assert.equal(map.summary.device_waiting, 2);
  assert.equal(map.summary.cloud_copy, 1);
  assert.equal(map.summary.gated, 1);
  assert.equal(map.summary.ready_for_live_patch, false);
  assert.ok(map.surfaces.some((s) => s.id === 'falcon-aether-phone-hosts' && s.status === 'GATED'));
});

test('pipeline forces all program updates through watcher and promotion gates', () => {
  assert.deepEqual(PIPELINE, [
    'census',
    'map3',
    'cube3',
    'hookwall',
    'gnn',
    'omnishannon',
    'white-room',
    'gc',
    'promotion-gate',
  ]);
  assert.ok(buildMap().surfaces.every((s) => s.process_launch === 0 && s.live_patch === 0 && s.raw_write === 0));
});

test('unknown or hostile surfaces are normalized into gated HBP rows', () => {
  const unknown = normalizeSurface({ id: 'x|bad', lane: 'external\nbad', status: 'RUN', evidence: 'e\njson=1' });
  assert.equal(unknown.status, 'GATED');
  assert.equal(unknown.process_launch, 0);
  const rows = emitRows([unknown]);
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('blind_mutation=0')));
  assert.ok(rows.some((row) => row.includes('external_program_patch=0')));
});

test('tool remains descriptor-only and does not import live mutation capabilities', () => {
  const source = readFileSync(new URL('../tools/behcs/program-cube-ingestion-map.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /node:fs|child_process|exec|spawn|Invoke-WebRequest|Get-Process|Stop-Process|Remove-Item/);
  assert.equal(SURFACES.length, 9);
});
