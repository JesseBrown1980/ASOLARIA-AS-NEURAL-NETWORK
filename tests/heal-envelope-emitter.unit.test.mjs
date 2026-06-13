import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  COSIGNERS,
  HEAL_STEPS,
  VERDICTS,
  emitRows,
  healEnvelope,
  selfTest,
  validateEnvelope,
} from '../tools/behcs/heal-envelope-emitter.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const VALID = {
  step: 3,
  target_pid: 'ACER-PID-H3CB8-A00-W1024-P00-N01630',
  operator_witness: 'OP-JESSE-PID-G0000-A00-W000-P00-N00000',
  ts: '2026-06-13T21:30:00.000Z',
};

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('the 10 heal-pipeline-v1 steps and verdict enum are exact', () => {
  assert.deepEqual(HEAL_STEPS, ['point', 'read', 'council-vote', 'gnn-rank', 'lazy-mint', 'auth', 'cell-cascade', 'bilateral-cosign', 'usb-sync', 'onboarding-update']);
  assert.deepEqual(VERDICTS, ['MISSING', 'DRIFTED', 'OUTDATED', 'FRESH', 'NO-CHANGE']);
});

test('a complete envelope validates and is proposal-only / never heals', () => {
  const env = healEnvelope({ ...VALID, council_verdict: { voted: 158, abstain: 93, verdict: 'DRIFTED' }, gnn_rank: { score: 0.42, rank: 1, mode: 'ranking' }, cosigners: COSIGNERS.slice() });
  assert.equal(env.valid, true);
  assert.equal(env.proposal_only, true);
  assert.equal(env.process_launch, 0);
  assert.equal(env.heal_action_performed, 0);
  assert.equal(env.step_name, 'council-vote');
});

test('the minimal required envelope validates', () => {
  assert.equal(validateEnvelope(VALID).ok, true);
});

test('schema violations are rejected (step, pid, witness, verdict, gnn, cosigners)', () => {
  assert.equal(validateEnvelope({ ...VALID, step: 0 }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, step: 11 }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, target_pid: 'LIRIS-PID-xyz' }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, operator_witness: 'OP-MALLORY-PID-G0000-A00-W000-P00-N00000' }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, council_verdict: { verdict: 'MAYBE' } }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, gnn_rank: { mode: 'classify' } }).ok, false);
});

// --- adversarial regressions proven by wf_f227d321 (do NOT weaken) ---

test('NaN/Infinity gnn score is rejected (not silently accepted)', () => {
  assert.equal(validateEnvelope({ ...VALID, gnn_rank: { score: NaN, mode: 'ranking' } }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, gnn_rank: { score: Infinity, mode: 'ranking' } }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, gnn_rank: { score: 0.5, mode: 'ranking' } }).ok, true);
});

test('non-integer voted/abstain/rank are rejected', () => {
  assert.equal(validateEnvelope({ ...VALID, council_verdict: { voted: 'x', verdict: 'FRESH' } }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, gnn_rank: { rank: 1.5, mode: 'ranking' } }).ok, false);
  assert.equal(validateEnvelope({ ...VALID, cosign_chain_seq: 1.2 }).ok, false);
});

test('ts must be canonical ISO-8601 UTC, not Date.parse-able junk', () => {
  for (const bad of ['2026', '2026-06', '2026-06-13', 'June 13 2026', '0', '1']) {
    assert.equal(validateEnvelope({ ...VALID, ts: bad }).ok, false, `should reject ts=${bad}`);
  }
  assert.equal(validateEnvelope({ ...VALID, ts: '2026-06-13T21:30:00.000Z' }).ok, true);
});

test('step coercion is strict: 3abc / 3.9 do not become 3', () => {
  assert.equal(healEnvelope({ ...VALID, step: '3abc' }).valid, false);
  assert.equal(healEnvelope({ ...VALID, step: '3.9' }).valid, false);
  assert.equal(healEnvelope({ ...VALID, step: 3.9 }).valid, false);
  assert.equal(healEnvelope({ ...VALID, step: '3' }).valid, true);
});

test('HBP row injection is impossible: delimiter-bearing field rejected AND emitRows cannot forge a row', () => {
  const inj = healEnvelope({ ...VALID, cosigners: ['jesse', 'rayssa', 'amy', 'felipe', 'dan|json=0\nHEALENVGATE|tag=PROVEN-VALID-PROPOSAL'] });
  assert.equal(inj.valid, false); // rejected at validation
  // even emitting an envelope carrying raw pipe/newline values cannot increase the physical row count
  const hostile = { valid: false, errors: ['x'], step: '1\nFAKE|json=0', council_verdict: { voted: 'a|b', abstain: '1\n2', verdict: 'X\nY' }, gnn_rank: { score: '1\nZ', rank: '2|3', mode: 'r\nm' }, cosigners: ['ok', 'bad|json=0\nINJECT|x=1'], cosign_chain_seq: '9\n9' };
  const rows = emitRows(hostile);
  assert.ok(rows.every((r) => !/[\r\n]/.test(r)), 'no row contains a newline');
  assert.equal(rows.join('\n').split('\n').length, rows.length, 'one logical row == one physical line');
  assert.ok(rows.every((r) => r.split('|').filter((f) => f === 'json=0').length <= 1), 'no duplicate json=0 from injection');
});

test('envelope_sha16 covers the full body (differing gnn score => different sha)', () => {
  const a = healEnvelope({ ...VALID, gnn_rank: { score: 0.1, mode: 'ranking' } });
  const b = healEnvelope({ ...VALID, gnn_rank: { score: 0.9, mode: 'ranking' } });
  assert.notEqual(a.envelope_sha16, b.envelope_sha16);
});

test('validate/emit/heal are TOTAL — never throw on null/undefined/garbage', () => {
  assert.doesNotThrow(() => { validateEnvelope(null); validateEnvelope(undefined); validateEnvelope(42); });
  assert.equal(validateEnvelope(null).ok, false);
  assert.doesNotThrow(() => { emitRows(null); emitRows(undefined); emitRows({}); emitRows(42); });
  assert.ok(Array.isArray(emitRows(null)));
  assert.doesNotThrow(() => { healEnvelope(null); healEnvelope(undefined); });
  assert.equal(healEnvelope(null).valid, false);
});

test('TOTAL holds against exotic inputs: throwing getters, BigInt, circular refs (re-attack a3de3ec0)', () => {
  const VALID2 = { ...VALID };
  assert.doesNotThrow(() => validateEnvelope({ get step() { throw new Error('boom'); } }));
  assert.equal(validateEnvelope({ get step() { throw new Error('boom'); } }).ok, false);
  assert.doesNotThrow(() => emitRows({ valid: true, get council_verdict() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => emitRows({ valid: true, cosigners: [{ toString() { throw new Error('boom'); } }] }));
  // BigInt body field: no throw, and correctly invalid
  assert.doesNotThrow(() => healEnvelope({ ...VALID2, cosign_chain_seq: 10n }));
  assert.equal(healEnvelope({ ...VALID2, cosign_chain_seq: 10n }).valid, false);
  // circular body field: no throw, sha still computed (cycle handled in canonicalBody)
  const c = {}; c.self = c;
  assert.doesNotThrow(() => healEnvelope({ ...VALID2, council_verdict: c }));
  assert.equal(typeof healEnvelope({ ...VALID2, council_verdict: c }).envelope_sha16, 'string');
});

test('emitted rows are HBP-only, single-line, with the held-safe gate row', () => {
  const rows = emitRows(healEnvelope({ ...VALID, cosigners: COSIGNERS.slice() }));
  assert.ok(rows.every((r) => r.endsWith('|json=0') && !r.includes('{"') && !/[\r\n]/.test(r)));
  assert.ok(rows.some((r) => r.startsWith('HEALENVGATE|') && r.includes('this-tool-emits-proposal-never-heals')));
  assert.ok(rows[0].includes('process_launch=0') && rows[0].includes('heal_action_performed=0'));
});

test('emitter has no spawn/exec/write/network/mint capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/heal-envelope-emitter.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|mintPid/.test(src), false);
});
