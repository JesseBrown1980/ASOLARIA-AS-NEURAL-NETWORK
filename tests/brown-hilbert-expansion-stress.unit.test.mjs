import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  isDecimalPowerString,
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

test('decimal power proof rejects nonzero tail digits, not just second ones', () => {
  assert.equal(isDecimalPowerString(`1${'0'.repeat(200)}`, 200), true);
  assert.equal(isDecimalPowerString(`1${'0'.repeat(99)}7${'0'.repeat(100)}`, 200), false);
  assert.equal(isDecimalPowerString(`1${'0'.repeat(99)}1${'0'.repeat(100)}`, 200), false);
  assert.equal(isDecimalPowerString(`1${'0'.repeat(199)}`, 200), false);
});

// acer catch-33 boundary extension: the single-pass scan must reject a stray
// digit at the LAST position (guards against an i<len-1 off-by-one that the
// mid-tail case above would not catch) and a wrong LEADING digit (guards the
// s[0]==='1' check, which no other case here exercises).
test('decimal power proof guards the tail-last-position and leading-digit boundaries', () => {
  assert.equal(isDecimalPowerString(`1${'0'.repeat(199)}9`, 201), false); // stray 9 at the final index
  assert.equal(isDecimalPowerString(`1${'0'.repeat(200)}1`, 201), false); // stray 1 at the final index
  assert.equal(isDecimalPowerString(`2${'0'.repeat(200)}`, 200), false);  // wrong leading digit
  assert.equal(isDecimalPowerString(`0${'0'.repeat(200)}`, 200), false);  // leading zero
  assert.equal(isDecimalPowerString(`1${'0'.repeat(201)}9`, 201), false); // correct last char but wrong length
});
