import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  emitCubeFeed,
} from '../tools/behcs/logical-stress-cube-feed.mjs';

test('logical stress cube feed definition rows are safe by default', () => {
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('json=0')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('no_live_cube_mutation=1')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('bindings=token-cube-binder')));
});

test('logical stress receipt emits deterministic draft cube feed rows', () => {
  const rows = emitCubeFeed();
  const again = emitCubeFeed();
  assert.deepEqual(rows, again);
  assert.equal(rows[0].startsWith('LOGICSTRESSCUBEHDR|'), true);
  assert.ok(rows.some((row) => row.startsWith('LOGICSTRESSCUBENODE|id=speed|')));
  assert.ok(rows.some((row) => row.startsWith('LOGICSTRESSGNNEDGE|from=speed|to=zeta|')));
  assert.equal(rows.filter((row) => row.startsWith('TOKCUBEBIND|')).length, 6);
  assert.ok(rows.every((row) => row.endsWith('json=0')));
  assert.ok(rows.every((row) => !row.includes('executable=1')));
  assert.ok(rows.some((row) => row.includes('|verdict=DRAFT_BINDING_READY|')));
});

test('logical stress cube feed baseline byte-matches generated rows', () => {
  const regenerated = emitCubeFeed().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/LOGICAL-EXTREME-STRESS-CUBE-FEED-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline);
  const digest = createHash('sha256').update(regenerated).digest('hex').toUpperCase();
  assert.ok(digest.length === 64);
});
