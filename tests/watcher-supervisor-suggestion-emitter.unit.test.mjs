import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  ACTIONS,
  CONFIDENCE_BANDS,
  REASONS,
  SUPERVISORS,
  WATCHERS,
  emitParityRows,
  emitSuggestion,
  selfTest,
  statusRows,
} from '../tools/behcs/watcher-supervisor-suggestion-emitter.mjs';

const NOW = '2026-06-11T12:00:00.000Z';
const GOOD = Object.freeze({
  watcher: 'WATCH-SELFREFLECT-60S',
  supervisor: 'SUP-OFFICE-705-COUNCIL',
  action: 'draft-correction-row',
  reason: 'correction-needed',
  evidence: 'loop_pending=17-held-stale-envelopes',
  confidence: 80,
  ts: '2026-06-11T11:59:00.000Z',
});

test('clean suggestion is DRAFT_SUGGESTION_READY and never executable', () => {
  const out = emitSuggestion({ ...GOOD }, NOW);
  assert.equal(out.verdict, 'DRAFT_SUGGESTION_READY');
  assert.equal(out.executable, 0);
  assert.ok(out.row.includes('|executable=0|'));
  assert.equal(out.band, 'high');
});

test('action escalation: every live-fabric action caps at DEFER_TO_OPERATOR', () => {
  for (const [action, meta] of Object.entries(ACTIONS)) {
    const out = emitSuggestion({ ...GOOD, action }, NOW);
    if (meta.requires_live_fabric) {
      assert.equal(out.verdict, 'DEFER_TO_OPERATOR', action);
      assert.ok(out.gates.includes('live-fabric-action-requires-operator'));
    } else {
      assert.equal(out.verdict, 'DRAFT_SUGGESTION_READY', action);
    }
    assert.equal(out.executable, 0, `${action} must never be executable`);
  }
});

test('supervisor-id spoofing and unknown ids are blocked, raw input never echoed', () => {
  for (const patch of [
    { watcher: 'WATCH-EVIL' },
    { supervisor: 'SUP-EVIL-SPOOF' },
    { action: 'rm-rf-everything' },
    { reason: 'because-i-said-so' },
  ]) {
    const out = emitSuggestion({ ...GOOD, ...patch }, NOW);
    assert.equal(out.verdict, 'DRAFT_SUGGESTION_BLOCKED', JSON.stringify(patch));
    const field = Object.keys(patch)[0];
    assert.equal(out[field], 'invalid', 'unregistered input must not appear in the row');
    assert.ok(!out.row.includes(Object.values(patch)[0]), 'raw spoof string must not reach the row');
  }
});

test('HBP injection: pipe/CR/LF in any field blocks and sanitizes', () => {
  for (const patch of [
    { watcher: 'WATCH-SELFREFLECT-60S|json=1' },
    { evidence: 'evil|row_hash=00' },
    { ts: '2026-06-11T11:59:00.000Z|x' },
    { reason: 'loop\nstalled' },
  ]) {
    const out = emitSuggestion({ ...GOOD, ...patch }, NOW);
    assert.equal(out.verdict, 'DRAFT_SUGGESTION_BLOCKED');
    assert.ok(out.gates.startsWith('dirty-'));
    assert.ok(!out.row.includes('json=1'), 'injected field must not survive into the row');
    assert.equal((out.row.match(/json=0/g) ?? []).length, 1, 'row carries exactly one json=0 terminator');
  }
});

test('missing evidence blocks; evidence hash is stable and content never inlined', () => {
  for (const evidence of [null, undefined, '']) {
    assert.equal(emitSuggestion({ ...GOOD, evidence }, NOW).gates, 'missing-evidence');
  }
  const a = emitSuggestion({ ...GOOD }, NOW);
  const b = emitSuggestion({ ...GOOD }, NOW);
  assert.equal(a.evidence_sha16, b.evidence_sha16, 'same evidence -> same sha16');
  const c = emitSuggestion({ ...GOOD, evidence: 'different-evidence' }, NOW);
  assert.notEqual(a.evidence_sha16, c.evidence_sha16);
  assert.ok(!a.row.includes(GOOD.evidence), 'evidence content referenced by sha16 only');
});

test('confidence boundaries: 33 low, 34 medium, 66 medium, 67 high; out-of-range blocks', () => {
  assert.equal(emitSuggestion({ ...GOOD, confidence: 33 }, NOW).band, 'low');
  assert.equal(emitSuggestion({ ...GOOD, confidence: 34 }, NOW).band, 'medium');
  assert.equal(emitSuggestion({ ...GOOD, confidence: 66 }, NOW).band, 'medium');
  assert.equal(emitSuggestion({ ...GOOD, confidence: 67 }, NOW).band, 'high');
  assert.equal(emitSuggestion({ ...GOOD, confidence: 0 }, NOW).band, 'low');
  assert.equal(emitSuggestion({ ...GOOD, confidence: 100 }, NOW).band, 'high');
  for (const confidence of [-1, 101, 66.5, '80', NaN, null]) {
    assert.equal(emitSuggestion({ ...GOOD, confidence }, NOW).gates, 'invalid-confidence', String(confidence));
  }
  const covered = CONFIDENCE_BANDS.flatMap((b) => [b.lo, b.hi]);
  assert.deepEqual(covered, [0, 33, 34, 66, 67, 100], 'bands tile 0-100 with no gap or overlap');
});

test('stale, future, and calendar-invalid timestamps block (component-1 ts discipline)', () => {
  assert.equal(emitSuggestion({ ...GOOD, ts: '2026-06-11T09:00:00.000Z' }, NOW).gates, 'stale-ts');
  assert.equal(emitSuggestion({ ...GOOD, ts: '2026-06-11T13:00:00.000Z' }, NOW).gates, 'ts-in-future');
  assert.equal(emitSuggestion({ ...GOOD, ts: '2026-06-31T11:59:00.000Z' }, NOW).gates, 'malformed-ts');
  assert.equal(emitSuggestion({ ...GOOD, ts: null }, NOW).gates, 'malformed-ts');
  assert.equal(emitSuggestion({ ...GOOD }, 'not-a-clock').gates, 'malformed-now');
});

test('route attachment uses component-1 resolver: tight when proven, broadest on conflict, none without tuple', () => {
  const tight = emitSuggestion({ ...GOOD, pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer' }, NOW);
  assert.equal(tight.route, '/dash/acer/pid/ACER-PID-H9E2A-A07-W104-P00-N00000/room/scout00');
  const conflict = emitSuggestion({ ...GOOD, pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'liris' }, NOW);
  assert.equal(conflict.route, '/dash/global/readonly', 'conflict tuple gets broadest route, never a guess');
  const none = emitSuggestion({ ...GOOD }, NOW);
  assert.equal(none.route, 'none');
});

test('no live/executable semantics anywhere: verdict closed-set, no route leakage', () => {
  const allRows = [...statusRows(), ...emitParityRows()];
  for (const row of allRows) {
    assert.ok(!row.includes('executable=1'), row);
    assert.ok(!/[\\]|C:|Users|rayss|home\//.test(row), `host path leaked: ${row}`);
    assert.ok(row.endsWith('json=0') && !row.includes('{"'));
  }
  for (const c of [{ ...GOOD }, { ...GOOD, action: 'dispatch-agent' }, { ...GOOD, watcher: 'nope' }]) {
    const v = emitSuggestion(c, NOW).verdict;
    assert.ok(['DRAFT_SUGGESTION_READY', 'DEFER_TO_OPERATOR', 'DRAFT_SUGGESTION_BLOCKED'].includes(v));
  }
  assert.ok(WATCHERS.length === 3 && SUPERVISORS.length === 4 && REASONS.length === 5, 'registries are closed sets');
});

// Component-5 parity, STEP|166 pattern: a green pyramid run on liris IS the
// bilateral byte-match of the suggestion-row contract.
test('component-5 parity: regenerated rows byte-match the sealed baseline', () => {
  const regenerated = emitParityRows().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/WATCHER-SUPERVISOR-SUGGESTION-PARITY-BASELINE-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline, 'this machine produced different bytes than the sealed baseline');
});

test('emitter self-test passes', () => {
  assert.equal(selfTest().ok, true);
});
