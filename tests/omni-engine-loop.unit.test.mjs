import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  DEFAULT_MAX_RESIDENT,
  ENGINES,
  emitLoopRows,
  gulpCycle,
  omniEngineLoopCycle,
  omniFlywheelVerdict,
  omniQuantScore,
  selfTest,
} from '../tools/behcs/omni-engine-loop.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('never-explode: resident set is GC-bounded regardless of input volume', () => {
  const big = gulpCycle(1_000_000, DEFAULT_MAX_RESIDENT);
  assert.equal(big.resident, DEFAULT_MAX_RESIDENT);
  assert.equal(big.gc_released, 1_000_000 - DEFAULT_MAX_RESIDENT);
  assert.equal(big.bounded, true);
});

test('omniquant is a pure-integer deterministic score 0..1000 (no float drift)', () => {
  assert.equal(omniQuantScore('x'), omniQuantScore('x'));
  const s = omniQuantScore('slice-engine');
  assert.ok(Number.isInteger(s) && s >= 0 && s <= 1000);
});

test('omniflywheel verdicts gate extract/hold/gc', () => {
  assert.equal(omniFlywheelVerdict(800), 'EXTRACT');
  assert.equal(omniFlywheelVerdict(500), 'HOLD');
  assert.equal(omniFlywheelVerdict(100), 'GC');
});

test('a loop cycle conserves the resident set and never launches a process', () => {
  const c = omniEngineLoopCycle({ rows: Array.from({ length: 5000 }, (_, i) => 'row-' + i), maxResident: 2000 });
  assert.equal(c.cycle_resident, 2000);
  assert.equal(c.gulp_gc_released, 3000);
  assert.equal(c.extracted + c.held + c.gc, 2000);
  assert.equal(c.process_launch, 0);
});

test('emitted rows are HBP-only and the pool launch stays operator-gated', () => {
  const rows = emitLoopRows();
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('{"')));
  assert.ok(rows.some((r) => r.includes('RUN_HERMES_SPINDLE-operator-gated')));
});

test('the five omni engines are named', () => {
  assert.deepEqual(ENGINES, ['omnispindle', 'omniflywheel', 'omniquant', 'omniprism', 'omnidispatcher']);
});

test('engine-loop module has no spawn/exec/write/network capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/omni-engine-loop.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(/.test(src), false);
});
