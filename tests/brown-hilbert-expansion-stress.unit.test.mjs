import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  runExpansionStress,
} from '../tools/behcs/brown-hilbert-expansion-stress.mjs';

test('brown hilbert expansion stress definition rows state the non-enumeration scope', () => {
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('json=0')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('does_not_test=enumerating-1eN-agents')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('forced_stability=n-mod-3+n-mod-6')));
});

test('brown hilbert expansion stress can prove beyond 1e200 in a tiny run', () => {
  const rows = runExpansionStress({ seconds: 0.05, exponents: [200, 201] });
  assert.equal(rows[0].startsWith('BHXSTRESSHDR|'), true);
  assert.equal(rows.filter((row) => row.startsWith('BHXSTRESSROW|')).length, 2);
  assert.ok(rows.some((row) => row.includes('exponent=201') && row.includes('decimal_shape_ok=1')));
  assert.ok(rows.at(-1).includes('status=PASS'));
  assert.ok(rows.at(-1).includes('beyond_1e200=1'));
  assert.ok(rows.every((row) => row.endsWith('json=0')));
});
