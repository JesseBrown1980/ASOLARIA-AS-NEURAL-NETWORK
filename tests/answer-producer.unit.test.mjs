import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { classifyBhIndex } from '../tools/behcs/token-cube-catalog-binder.mjs';
import {
  ADDRESS_MOD, emitParityRows, loadCorpus, noSourceMarker, produceCandidate, renderRow, selfTest, validateRow,
} from '../tools/behcs/answer-producer.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));
const sha16 = (t) => createHash('sha256').update(t, 'utf8').digest('hex').slice(0, 16);
const CORPUS = loadCorpus('use breath pacing as the first low-risk feedback loop\nrepresent blink motion and line-noise artifacts as explicit events\nwrite bids-like sidecars so provenance does not drift\n');

test('answer-producer self-test passes all checks (incl mutation cases)', () => {
  assert.equal(selfTest().ok, true);
});

test('a valid candidate row passes the read-time validator; lane agrees with binder', () => {
  const r = produceCandidate(0, CORPUS);
  assert.equal(validateRow(r, CORPUS).ok, true);
  assert.equal(r.lane, classifyBhIndex(r.address_index).lane);
  assert.equal(r.address_index, 0);
  assert.equal(produceCandidate(ADDRESS_MOD, CORPUS).address_index, 0); // F1 fold edge
});

// liris-required mutation standard: each MUST fail the validator (enforced, not narrated)
test('MUTATION fabrication: a summary_sha16 not from the corpus is rejected (F2 anti-fabrication)', () => {
  const r = produceCandidate(1, CORPUS);
  const forged = { ...r, summary_sha16: sha16('a fabricated answer never committed to the corpus') };
  assert.equal(validateRow(forged, CORPUS).ok, false);
  assert.ok(validateRow(forged, CORPUS).fail.some((f) => f.includes('FABRICATION')));
});

test('MUTATION source-row hash, lane, and glyph preimage are recomputed at read time', () => {
  const r = produceCandidate(1, CORPUS);
  const sourceForged = validateRow({ ...r, source_row_sha16: '0'.repeat(16) }, CORPUS);
  assert.equal(sourceForged.ok, false);
  assert.ok(sourceForged.fail.includes('source_row_sha16-not-from-corpus-row'));
  assert.ok(sourceForged.fail.includes('glyph_full-preimage-mismatch'));

  assert.equal(validateRow({ ...r, lane: (r.lane + 1) % 3 }, CORPUS).ok, false);
  assert.equal(validateRow({ ...r, address_index: r.address_index + 1 }, CORPUS).ok, false);
  assert.equal(validateRow({ ...r, glyph_full: '0'.repeat(64) }, CORPUS).ok, false);
  assert.equal(validateRow({ ...r, glyph: 'HG256:APROD_CANDIDATE:00000000' }, CORPUS).ok, false);
});

test('MUTATION forbidden field: a real score= leaks past nothing (F4 closed schema)', () => {
  assert.equal(validateRow({ ...produceCandidate(2, CORPUS), score: 0.938 }, CORPUS).ok, false);
  assert.equal(validateRow({ ...produceCandidate(2, CORPUS), controllerPid: 'BH.REAL100B.OMNISPIN.PID.085' }, CORPUS).ok, false);
});

test('MUTATION score_stub format: "-1" (JS default) is rejected; only exact "-1.0" passes (F18)', () => {
  assert.equal(validateRow({ ...produceCandidate(0, CORPUS), score_stub: '-1' }, CORPUS).ok, false);
  assert.equal(validateRow({ ...produceCandidate(0, CORPUS), reverseGain_stub: '-1' }, CORPUS).ok, false);
});

test('MUTATION marker-spoof + safety-off + pid-live-token all fail (F8 / F11 / F17)', () => {
  const ns = produceCandidate(3, loadCorpus(''));
  const spoof = { ...ns, summary_sha16: sha16(noSourceMarker(ns.lane, ns.address_index + 1)) }; // wrong index in marker
  assert.equal(validateRow(spoof, loadCorpus('')).ok, false);
  assert.equal(validateRow({ ...produceCandidate(0, CORPUS), no_mint: 0 }, CORPUS).ok, false);
  assert.equal(validateRow({ ...produceCandidate(0, CORPUS), pid: 'BH.NEWSYS.APROD.CANDIDATE.PID.OPENCODE' }, CORPUS).ok, false);
});

test('empty corpus routes ALL candidates to no-source mode (F14 size-0 guard, no mod-0 NaN)', () => {
  const r = produceCandidate(42, loadCorpus(''));
  assert.equal(r.source, 'DRAFT_NO_SOURCE');
  assert.equal(r.source_index, -1);
  assert.equal(validateRow(r, loadCorpus('')).ok, true);
});

test('corpus byte-canon: a CRLF corpus is rejected by loadCorpus (F10)', () => {
  assert.equal(loadCorpus('a\r\nb\n').ok, false);
  assert.equal(loadCorpus('a\n\nb\n').ok, false); // blank line forbidden
});

test('every rendered row is HBP-only, json=0 terminated, no inlined prose', () => {
  const r = renderRow(produceCandidate(1, CORPUS));
  assert.ok(r.endsWith('|json=0') && r.startsWith('APRODCANDIDATE|'));
  assert.ok(!r.includes('breath pacing')); // F3 summary text NEVER inlined, only summary_sha16
});

test('regenerated parity rows byte-match the sealed baseline (STEP166 pattern)', () => {
  const baseline = readFileSync(join(repo, 'docs/ANSWER-PRODUCER-PARITY-BASELINE-2026-06-12.hbp'), 'utf8');
  assert.equal(emitParityRows().join('\n') + '\n', baseline);
});
