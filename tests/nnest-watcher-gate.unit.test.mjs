import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ACTIONS,
  MAX_DEPTH_BOUND,
  emitParityRows,
  gateChain,
  selfTest,
  statusRows,
} from '../tools/behcs/nnest-watcher-gate.mjs';

const sha16 = (s) => createHash('sha256').update(s).digest('hex').slice(0, 16);
const level = (i) => sha16(`nnest-level-${i}`);
const goodChain = (maxDepth) => Array.from({ length: maxDepth + 1 }, (_, i) => ({ depth: i, reported_sha16: level(i), recomputed_sha16: level(i) }));
const GOOD = Object.freeze({ agent: 'AGT-NNEST-PROBE-0001', action: 'report-up', max_depth: 3 });

test('honest complete chain with free action -> CHILD_MAY_ACT, never executable', () => {
  const out = gateChain({ ...GOOD, chain: goodChain(3) });
  assert.equal(out.verdict, 'CHILD_MAY_ACT');
  assert.equal(out.executable, 0);
  assert.equal(out.first_bad_depth, 'none');
  assert.ok(out.row.includes('|executable=0|'));
});

test('OPERATOR INVARIANT: matching hashes are necessary but NOT sufficient', () => {
  // every tuple matches, but the chain is truncated -> HELD on topology
  const truncated = gateChain({ ...GOOD, chain: goodChain(3).slice(0, 3) });
  assert.equal(truncated.verdict, 'CHILD_HELD');
  assert.equal(truncated.gate, 'chain-topology-invalid');
  assert.equal(truncated.first_bad_depth, 3);
});

test('chain topology: truncation, duplicate, skip, reorder all HELD with first_bad_depth', () => {
  const g = goodChain(4);
  const cases = [
    { name: 'truncated', chain: [g[0], g[1], g[2]], expectDepth: 3 },
    { name: 'duplicate', chain: [g[0], g[1], { ...g[1] }, g[3]], expectDepth: 2 },
    { name: 'skipped', chain: [g[0], g[1], g[3], g[4]], expectDepth: 2 },
    { name: 'reordered', chain: [g[0], g[2], g[1], g[3]], expectDepth: 1 },
    { name: 'overlong', chain: [...goodChain(3), g[4]], expectDepth: 4 },
  ];
  for (const c of cases) {
    const out = gateChain({ ...GOOD, chain: c.chain });
    assert.equal(out.verdict, 'CHILD_HELD', c.name);
    assert.equal(out.gate, 'chain-topology-invalid', c.name);
    assert.equal(out.first_bad_depth, c.expectDepth, c.name);
  }
});

test('mismatch-at-depth-k precision: divergence named at the exact level, every k', () => {
  for (let k = 0; k <= 5; k += 1) {
    const chain = goodChain(5);
    chain[k] = { ...chain[k], recomputed_sha16: sha16(`confab-${k}`) };
    const out = gateChain({ ...GOOD, max_depth: 5, chain });
    assert.equal(out.verdict, 'CHILD_HELD', `k=${k}`);
    assert.equal(out.gate, 'hash-divergence', `k=${k}`);
    assert.equal(out.first_bad_depth, k, `k=${k}`);
  }
});

test('forged reported hashes: format spoofs HELD at exact level, never routed past', () => {
  for (const bad of ['NOT-A-HASH', level(1).toUpperCase(), level(1).slice(0, 15), `${level(1)}0`, '']) {
    const chain = goodChain(3);
    chain[1] = { ...chain[1], reported_sha16: bad };
    const out = gateChain({ ...GOOD, chain });
    assert.equal(out.verdict, 'CHILD_HELD', JSON.stringify(bad));
    assert.equal(out.gate, 'hash-format-invalid');
    assert.equal(out.first_bad_depth, 1);
  }
});

test('consent-anchor bypass: every consent action DEFERS even on a perfect chain', () => {
  for (const [action, meta] of Object.entries(ACTIONS)) {
    const out = gateChain({ ...GOOD, action, chain: goodChain(3) });
    if (meta.consent) {
      assert.equal(out.verdict, 'DEFER_TO_OPERATOR', action);
      assert.equal(out.gate, 'consent-anchors-at-apex-T0-only');
    } else {
      assert.equal(out.verdict, 'CHILD_MAY_ACT', action);
    }
    assert.equal(out.executable, 0, action);
  }
  assert.equal(gateChain({ ...GOOD, action: 'rm-rf-everything', chain: goodChain(3) }).gate, 'unknown-action');
});

test('depth spoofing: bound is the proven 16; non-integers and out-of-range HELD', () => {
  assert.equal(gateChain({ ...GOOD, max_depth: 16, chain: goodChain(16) }).verdict, 'CHILD_MAY_ACT');
  for (const max_depth of [17, -1, 3.5, '3', null, NaN]) {
    assert.equal(gateChain({ ...GOOD, max_depth, chain: goodChain(3) }).gate, 'invalid-max-depth', String(max_depth));
  }
  const spoofed = goodChain(3).map((t, i) => ({ ...t, depth: i === 2 ? '2' : t.depth }));
  assert.equal(gateChain({ ...GOOD, chain: spoofed }).gate, 'chain-topology-invalid');
});

test('HBP injection and dirty fields HELD before echo', () => {
  assert.equal(gateChain({ ...GOOD, agent: 'AGT-EVIL|json=1', chain: goodChain(3) }).gate, 'dirty-agent');
  assert.equal(gateChain({ ...GOOD, action: 'report\nup', chain: goodChain(3) }).gate, 'dirty-action');
  const out = gateChain({ ...GOOD, agent: 'AGT-EVIL|json=1', chain: goodChain(3) });
  assert.ok(!out.row.includes('json=1'));
  assert.equal((out.row.match(/json=0/g) ?? []).length, 1);
});

test('HELD rows leak no chain content: level hashes never echoed, only chain_sha16 and first_bad_depth', () => {
  const chain = goodChain(3);
  chain[2] = { ...chain[2], recomputed_sha16: sha16('confab-2') };
  const out = gateChain({ ...GOOD, chain });
  for (const t of chain) {
    assert.ok(!out.row.includes(t.reported_sha16), 'reported hash leaked');
  }
  assert.ok(!out.row.includes(sha16('confab-2')), 'recomputed hash leaked');
  assert.match(out.row, /\|chain_sha16=[0-9a-f]{16}\|/);
  for (const row of [...statusRows(), ...emitParityRows()]) {
    assert.ok(!row.includes('executable=1'));
    assert.ok(!/[\\]|C:|Users|rayss|home\//.test(row), `host leak: ${row}`);
    assert.ok(row.endsWith('json=0') && !row.includes('{"'));
  }
  for (const c of [{ ...GOOD, chain: goodChain(3) }, { ...GOOD, action: 'spawn-child', chain: goodChain(3) }, { ...GOOD, chain: [] }]) {
    assert.ok(['CHILD_MAY_ACT', 'DEFER_TO_OPERATOR', 'CHILD_HELD'].includes(gateChain(c).verdict));
  }
});

// Component-4 parity, STEP|166 pattern: a green pyramid run on liris IS the
// bilateral byte-match. Time-free contract, no clock in any row.
test('component-4 parity: regenerated rows byte-match the sealed baseline', () => {
  const regenerated = emitParityRows().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/NNEST-WATCHER-GATE-PARITY-BASELINE-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline, 'this machine produced different bytes than the sealed baseline');
});

test('gate self-test passes and depth bound is the proven one', () => {
  assert.equal(MAX_DEPTH_BOUND, 16);
  assert.equal(selfTest().ok, true);
});
