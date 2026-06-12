import assert from 'node:assert/strict';
import test from 'node:test';

import {
  KINDS, ROLES, SECTORS, emitRegistrationRows, mintPid, mintTriad, selfTest,
} from '../tools/behcs/github-pid-register.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('mints the LIVE fabric PID format (matches :4949 AgentTerms lanes)', () => {
  const p = mintPid({ role: 'AGT', name: 'shannon', tier: 4, prime: 1 });
  assert.match(p.pid, /^AGT-SHANNON-PID-H[0-9A-F]{4}-A04-W1024-P01-N00001$/);
  assert.equal(p.hex.endsWith('C'), true); // AGT -> C suffix (live)
});

test('deterministic + stateless: same name mints byte-identical PID (bilateral parity)', () => {
  assert.equal(mintPid({ role: 'SUP', name: 'LAW-STUB-AND-RUN' }).pid, mintPid({ role: 'SUP', name: 'law stub and run' }).pid);
});

test('divisions: yin/yang mod-2, prime-lane mod-3, quad mod-4, sector mod-113', () => {
  const p = mintPid({ role: 'AGT', name: 'x', kind: 'real' });
  assert.ok(KINDS.includes(p.yin_yang));
  assert.ok([0, 1, 2].includes(p.lane));
  assert.ok([0, 1, 2, 3].includes(p.quad));
  assert.ok(p.sector >= 0 && p.sector < SECTORS);
});

test('triad shares hex base, role suffixes C/A/B (AGT/SUP/PROF)', () => {
  const t = mintTriad({ name: 'LAW-STUB-AND-RUN' });
  const base = t.AGT.hex.slice(0, 4);
  assert.equal(t.SUP.hex.slice(0, 4), base);
  assert.equal(t.PROF.hex.slice(0, 4), base);
  assert.equal(t.AGT.hex.at(-1), ROLES.AGT);
  assert.equal(t.SUP.hex.at(-1), ROLES.SUP);
  assert.equal(t.PROF.hex.at(-1), ROLES.PROF);
});

test('registration rows are HBP-only, json=0 terminated, no inlined newlines', () => {
  const rows = emitRegistrationRows(mintPid({ role: 'AGT', name: 'x' }));
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('\n')));
});
