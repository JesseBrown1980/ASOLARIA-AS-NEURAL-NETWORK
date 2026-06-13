import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CONSENSUS_STATES,
  DEFINITION_ROWS,
  ROLES,
  buildNest,
  emitRows,
  runTriadNest,
  selfTest,
  triadCell,
} from '../tools/behcs/triad-nest-reference.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('the cell is exactly worker/reflector/witness/supervisor', () => {
  assert.deepEqual(ROLES, ['WORKER', 'REFLECTOR', 'WITNESS', 'SUPERVISOR']);
  assert.deepEqual(CONSENSUS_STATES, ['PASS', 'HOLD', 'PATCH', 'ESCALATE']);
  const c = triadCell('test-cell');
  assert.deepEqual(Object.keys(c.roles).sort(), ['reflector', 'supervisor', 'witness', 'worker']);
});

test('every role is a POTENTIAL position, never a launched process; consensus is HELD not PASS', () => {
  const c = triadCell('held-cell');
  assert.ok(Object.values(c.roles).every((r) => r.triad_state === 'POTENTIAL' && r.process_launch === 0));
  assert.equal(c.consensus, 'HELD_PENDING_REASONING');
  assert.equal(c.process_launch, 0);
});

test('nests recursively (worker work is itself a triad): depth 3 branching 2 = 15 cells', () => {
  const run = runTriadNest({ depth: 3, branching: 2 });
  assert.equal(run.summary.total_cells, 15); // 1+2+4+8
  assert.equal(run.summary.total_agent_positions, 60); // 4 per cell
  assert.equal(run.summary.all_held_safe, true);
});

test('the reference runs ZERO model calls — coordination is free, reasoning is borrowed/gated', () => {
  const run = runTriadNest({ depth: 4, branching: 2 });
  assert.equal(run.summary.model_calls_in_reference, 0);
});

test('emitted rows are HBP-only and declare the held-safe law', () => {
  const rows = emitRows({ depth: 2, branching: 2 });
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('{"')));
  assert.ok(rows.some((r) => r.startsWith('TRIADCELL|') && r.includes('consensus=HELD_PENDING_REASONING') && r.includes('process_launch=0')));
  assert.ok(DEFINITION_ROWS.some((r) => r.includes('witness=READ-ONLY') && r.includes('no-self-fire-INV5')));
  assert.ok(DEFINITION_ROWS.some((r) => r.includes('structure-free-thinking-borrowed')));
});

test('nesting tree shape: each non-leaf has `branching` children', () => {
  const tree = buildNest('ROOT', 2, 3);
  assert.equal(tree.children.length, 3);
  assert.equal(tree.children[0].children.length, 3);
  assert.equal(tree.children[0].children[0].children.length, 0); // leaf at depth 0
});

test('reference imports no spawn/exec/write/network capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/triad-nest-reference.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(/.test(src), false);
});
