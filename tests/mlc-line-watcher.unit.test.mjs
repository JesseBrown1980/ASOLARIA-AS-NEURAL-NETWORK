import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  FISCHER_SCORE_KIND,
  OUTER_WATCHERS,
  distanceBucket,
  emitRows,
  parseStrides,
  runLineWatcher,
  selfTest,
} from '../tools/behcs/mlc-line-watcher.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('definition rows describe an outer watcher fabric, not a duplicate fabric', () => {
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('|json=0')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('not-a-duplicate-fabric=1')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('no_live_fischer=1') && row.includes('process_launch=0')));
});

test('strides parse deterministically and stay bounded', () => {
  assert.deepEqual(parseStrides('3,1,2,2,-1,999'), [1, 2, 3, 64]);
  assert.deepEqual(parseStrides([]), []);
});

test('distance buckets are stable', () => {
  assert.equal(distanceBucket(0), 'collision');
  assert.equal(distanceBucket(4095), 'near');
  assert.equal(distanceBucket(4096), 'local');
  assert.equal(distanceBucket(32768), 'regional');
  assert.equal(distanceBucket(131072), 'far');
});

test('line watcher observes relationships without launching processes', () => {
  const run = runLineWatcher({ nodes: 20, strides: [1, 2] });
  assert.equal(run.lines.length, 19 + 18);
  assert.equal(run.summary.all_observed_no_launch, true);
  assert.ok(run.lines.every((line) => line.process_launch === 0));
  assert.ok(run.lines.every((line) => line.triad_state === 'OBSERVED_NOT_ACTUATED'));
  assert.ok(run.lines.every((line) => OUTER_WATCHERS.includes(line.watcher)));
});

test('Fischer/Mamba/AoT surfaces are proposal handles only', () => {
  const run = runLineWatcher({ nodes: 16, strides: [1, 3] });
  assert.equal(FISCHER_SCORE_KIND, 'DRAFT_STANDIN_NOT_FISCHER');
  assert.ok(run.lines.every((line) => line.sequence_block.startsWith('block_')));
  assert.ok(run.lines.every((line) => ['OBSERVE_NEXT', 'RECURSE_LOCAL', 'DECOMPOSE_PATH', 'HOLD_FOR_SUPERVISOR'].includes(line.aot_step)));
  assert.ok(run.lines.every((line) => line.fischer_move));
});

test('emitted rows are HBP-only and include MLC line fields', () => {
  const rows = emitRows({ nodes: 12, strides: [1, 2] });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !row.includes('{"')));
  assert.ok(rows.some((row) => row.startsWith('MLCLINE|') && row.includes('distance=') && row.includes('score_kind=DRAFT_STANDIN_NOT_FISCHER')));
  assert.ok(rows.some((row) => row.startsWith('MLCSUM|') && row.includes('all_observed_no_launch=1')));
});

test('watcher does not import spawn/write/network/live-engine capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/mlc-line-watcher.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request/.test(src), false);
});
