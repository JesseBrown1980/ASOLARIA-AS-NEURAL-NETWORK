import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEVICES,
  FRESH_WINDOW_S,
  ROOM_BANDS,
  emitParityRows,
  resolveDashboard,
  selfTest,
  statusRows,
} from '../tools/behcs/dashboard-resolver.mjs';

const NOW = '2026-06-11T12:00:00.000Z';
const FRESH = '2026-06-11T11:59:00.000Z';
const GOOD_PID = 'ACER-PID-H9E2A-A07-W104-P00-N00000';

test('full proven tuple resolves AGENT_TIGHT with room band, eyes, and gated hands', () => {
  const out = resolveDashboard(GOOD_PID, 'acer', FRESH, NOW);
  assert.equal(out.state, 'AGENT_TIGHT');
  assert.equal(out.scope, 'AGENT');
  assert.equal(out.route, `/dash/acer/pid/${GOOD_PID}/room/scout00`);
  assert.equal(out.eyes, `${out.route}/hbp`);
  assert.equal(out.hands.gate, 'gated-POST-operator-cosign');
  assert.deepEqual(out.gates, []);
});

test('demotion ladder: missing or invalid pid -> DEVICE_SCOPE, never AGENT', () => {
  for (const pid of [null, undefined, '', 'NOT-A-REAL-PID', 'acer-pid-h9e2a-a07-w104-p00-n00000']) {
    const out = resolveDashboard(pid, 'acer', FRESH, NOW);
    assert.equal(out.state, 'DEVICE_SCOPE', `pid=${pid}`);
    assert.equal(out.route, '/dash/acer');
    assert.ok(out.gates.includes('invalid-or-missing-pid'));
  }
});

test('demotion ladder: unknown device -> GLOBAL_READONLY with null hands', () => {
  for (const device of ['toaster', null, '', 'ACER ']) {
    const out = resolveDashboard(GOOD_PID, device, FRESH, NOW);
    assert.equal(out.state, 'GLOBAL_READONLY', `device=${device}`);
    assert.equal(out.route, '/dash/global/readonly');
    assert.equal(out.hands, null, 'global scope must never expose hands');
  }
});

test('demotion ladder: stale, malformed, and future timestamps -> DEVICE_SCOPE', () => {
  const stale = resolveDashboard(GOOD_PID, 'acer', '2026-06-11T09:00:00.000Z', NOW);
  assert.ok(stale.gates.includes('stale-ts'));
  const boundary = resolveDashboard(GOOD_PID, 'acer', '2026-06-11T11:00:00.000Z', NOW);
  assert.equal(boundary.state, 'AGENT_TIGHT', `exactly ${FRESH_WINDOW_S}s old is still fresh`);
  for (const ts of ['yesterday-ish', '2026-06-11 11:59:00', '2026-06-11T11:59:00', '', null]) {
    assert.equal(resolveDashboard(GOOD_PID, 'acer', ts, NOW).state, 'DEVICE_SCOPE', `ts=${ts}`);
  }
  const future = resolveDashboard(GOOD_PID, 'acer', '2026-06-11T13:00:00.000Z', NOW);
  assert.ok(future.gates.includes('ts-in-future'));
  const badNow = resolveDashboard(GOOD_PID, 'acer', FRESH, 'not-a-clock');
  assert.ok(badNow.gates.includes('malformed-now'));
});

test('conflicting pid/device demotes to GLOBAL_READONLY, never guesses a side', () => {
  const out = resolveDashboard(GOOD_PID, 'liris', FRESH, NOW);
  assert.equal(out.state, 'GLOBAL_READONLY');
  assert.ok(out.gates[0].startsWith('pid-device-conflict:acer-vs-liris'));
  const op = resolveDashboard('OP-JESSE-PID-G0000-A00-W000-P00-N00000', 'falcon', FRESH, NOW);
  assert.equal(op.state, 'AGENT_TIGHT', 'operator PIDs are apex: valid on any device');
});

test('broad vs tight: out-of-band plane stays AGENT but takes no room sub-route', () => {
  const out = resolveDashboard('ACER-PID-H9E2A-A07-W104-P24-N00000', 'acer', FRESH, NOW);
  assert.equal(out.state, 'AGENT_TIGHT');
  assert.equal(out.room_band, 'none');
  assert.ok(!out.route.includes('/room/'));
  assert.ok(ROOM_BANDS.every((band) => 24 < band.lo || 24 > band.hi));
});

test('HBP injection: pipe/CR/LF in any input is rejected before routing', () => {
  for (const args of [
    ['EVIL-PID|json=1', 'acer', FRESH],
    [GOOD_PID, 'acer|liris', FRESH],
    [GOOD_PID, 'acer', `${FRESH}|json=1`],
    ['EVIL\nPID', 'acer', FRESH],
  ]) {
    const out = resolveDashboard(args[0], args[1], args[2], NOW);
    assert.equal(out.state, 'INVALID_INPUT');
    assert.equal(out.route, null, 'dirty input must never produce a route');
  }
});

test('no host-specific path leakage in any route or parity row', () => {
  const rows = emitParityRows();
  for (const row of rows) {
    assert.ok(!/[\\]|C:|Users|rayss|home\//.test(row), `host path leaked: ${row}`);
  }
  const out = resolveDashboard(GOOD_PID, 'acer', FRESH, NOW);
  assert.match(out.route, /^\/dash\//);
});

test('status rows are HBP-only and device table is closed', () => {
  const rows = statusRows();
  assert.ok(rows.every((row) => row.endsWith('json=0') && !row.includes('{"')));
  assert.deepEqual(Object.keys(DEVICES), ['acer', 'liris', 'falcon']);
  assert.equal(selfTest().ok, true);
});

// Component-1 parity, STEP|166 pattern: regenerate locally, byte-compare to
// the acer-sealed baseline. A green run on liris IS the bilateral byte-match.
test('component-1 parity: regenerated rows byte-match the sealed baseline', () => {
  const regenerated = emitParityRows().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/DASHBOARD-RESOLVER-PARITY-BASELINE-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline, 'this machine produced different bytes than the sealed baseline');
});

test('parity rows stay HBP-only and carry no host or wall-clock fields', () => {
  const rows = emitParityRows();
  assert.ok(rows.every((row) => row.endsWith('json=0') && !row.includes('{"')));
  assert.ok(rows.every((row) => !/host=/.test(row)));
});
