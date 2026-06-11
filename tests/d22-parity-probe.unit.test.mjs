import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { emitParityRows } from '../tools/behcs/d22-parity-probe.mjs';

// STEP|166 live cross-machine byte-compare: the baseline was generated and
// sealed on acer; every machine that runs this pyramid regenerates the rows
// from its own local execution and byte-compares against the sealed bytes.
// A pass on liris IS the bilateral byte-match the plan step requires.
test('STEP|166: regenerated parity rows byte-match the sealed baseline', () => {
  const regenerated = emitParityRows().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/D22-PARITY-BASELINE-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline, 'this machine produced different bytes than the sealed baseline');
});

test('parity rows stay HBP-only and host-free', () => {
  const rows = emitParityRows();
  assert.ok(rows.every((row) => row.endsWith('json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
  assert.ok(rows.every((row) => !/host=|\d{4}-\d{2}-\d{2}T/.test(row)), 'rows must carry no host or timestamp');
});
