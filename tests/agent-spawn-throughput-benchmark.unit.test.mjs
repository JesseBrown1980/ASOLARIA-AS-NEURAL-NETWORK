import assert from 'node:assert/strict';
import test from 'node:test';

import {
  emitDefinitionRows,
  runLiveBenchmark,
} from '../tools/behcs/agent-spawn-throughput-benchmark.mjs';

test('spawn throughput definition rows are HBP-only and critic-tagged', () => {
  const rows = emitDefinitionRows();
  assert.ok(rows.length >= 10);
  assert.ok(rows.every((row) => row.endsWith('json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
  assert.ok(rows.some((row) => row.includes('rate=4019265_per_sec')));
  assert.ok(rows.some((row) => row.includes('canonical_acer_measurement=66.1M_per_sec')));
  assert.ok(rows.some((row) => row.includes('never=one-file-per-agent')));
});

test('live benchmark can run tiny deterministic smoke without disk writes', () => {
  const rows = runLiveBenchmark({ iterations: 1000, typedIterations: 1000 });
  assert.equal(rows[0], 'SPAWNBENCHLIVEHDR|iterations=1000|typed_iterations=1000|disk_writes=0|json=0');
  assert.ok(rows.every((row) => row.endsWith('json=0')));
  assert.ok(rows.some((row) => row.includes('tier=A-coordinate-assignment')));
  assert.ok(rows.some((row) => row.includes('tier=UPGRADED-typed-SoA-tier-C')));
});
