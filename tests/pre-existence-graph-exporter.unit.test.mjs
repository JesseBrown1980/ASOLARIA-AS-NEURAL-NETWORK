import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  PRIME_CUBES,
  WATCHER_LANES,
  emitRows,
  preExistenceNode,
  runExporter,
  selfTest,
} from '../tools/behcs/pre-existence-graph-exporter.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('definition rows are HBP-only and declare the pre-existence chain + safety', () => {
  assert.ok(DEFINITION_ROWS.every((r) => r.endsWith('|json=0')));
  assert.ok(DEFINITION_ROWS.every((r) => !r.includes('{"')));
  assert.ok(DEFINITION_ROWS[0].includes('BROWN_HILBERT_POINT') && DEFINITION_ROWS[0].includes('TRIAD_STATE'));
  assert.ok(DEFINITION_ROWS.some((r) => r.includes('no_spawn=1') && r.includes('no_mount=1') && r.includes('no_execute=1')));
});

test('prime-cube anchors are exactly the cubes of the 11 primes 13..131', () => {
  assert.deepEqual(PRIME_CUBES, [13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131].map((p) => p ** 3));
  assert.equal(PRIME_CUBES[0], 2197);     // 13^3
  assert.equal(PRIME_CUBES[10], 2248091); // 131^3
});

test('every node is a POTENTIAL position, never a launched process', () => {
  const run = runExporter({ nodes: 512 });
  assert.equal(run.summary.all_potential_no_launch, true);
  assert.ok(run.nodes.every((n) => n.triad_state === 'POTENTIAL' && n.process_launch === 0));
});

test('nodes are deterministic and land on Brown-Hilbert prime-cube field', () => {
  const a = preExistenceNode('prex-determinism-probe');
  const b = preExistenceNode('prex-determinism-probe');
  assert.equal(a.pid, b.pid);
  assert.equal(a.bh_point, b.bh_point);
  assert.match(a.bh_point, /^BH\.\d+\.[0-2]\.\d+$/);
  assert.ok(WATCHER_LANES.includes(a.watcher_lane));
  assert.ok(PRIME_CUBES.includes(a.prime_cube));
});

test('watcher lanes are observer organs (hookwall/gnn/shannon), not actuators', () => {
  assert.deepEqual(WATCHER_LANES, ['hookwall', 'gnn', 'shannon']);
});

test('emitted rows are HBP-only and contain the full PID→…→TRIAD_STATE chain', () => {
  const rows = emitRows({ nodes: 32 });
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('{"')));
  assert.ok(rows.some((r) => r.startsWith('PREXNODE|') && r.includes('bh_point=BH.') && r.includes('triad_state=POTENTIAL')));
  assert.ok(rows.some((r) => r.startsWith('PREXSUM|') && r.includes('all_potential_no_launch=1')));
});

test('exporter does not import any spawn/mount/execute capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/pre-existence-graph-exporter.mjs'), 'utf8');
  // Capability-precise: real spawn/exec/write/network tokens (NOT the word "mount" in the safety text).
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(/.test(src), false);
});
