import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEFINITION_ROWS,
  runExtreme,
} from '../tools/behcs/logical-extreme-stress.mjs';

test('logical extreme stress definition rows are HBP-only and safe by default', () => {
  assert.ok(DEFINITION_ROWS.length >= 3);
  assert.ok(DEFINITION_ROWS.every((row) => row.endsWith('json=0')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('child_process_spawns=0')));
  assert.ok(DEFINITION_ROWS.some((row) => row.includes('no_live_fabric_mutation=1')));
});

test('logical extreme stress can run a tiny bounded smoke', () => {
  const rows = runExtreme({ seconds: 0.05, batch: 1000, quantMB: 1 });
  assert.equal(rows[0].startsWith('LOGICSTRESSHDR|'), true);
  assert.ok(rows.some((row) => row.startsWith('LOGICSTRESSSPEED|')));
  assert.ok(rows.some((row) => row.startsWith('LOGICSTRESSREDUCTION|') && row.includes('reduction_x=')));
  assert.ok(rows.some((row) => row.startsWith('LOGICSTRESSPROCESS|') && row.includes('child_process_spawns=0')));
  assert.ok(rows.at(-1).includes('status=PASS'));
  assert.ok(rows.every((row) => row.endsWith('json=0')));
});
