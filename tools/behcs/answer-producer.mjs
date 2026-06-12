#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyBhIndex } from './token-cube-catalog-binder.mjs';

// ANSWER-PRODUCER organ-1 (draft-only) -- implements ANSWER-PRODUCER-SPEC v5
// (liris CLEAN_FOR_DRAFT_IMPLEMENTATION_ONLY, sha 5D923F89). Emits 100B-neuro-
// compatible CANDIDATE rows. DRAFT-ONLY: no mint, no live supervisor, no fabric
// call, no Fischer score (organ-2 gated), no minter (organ-3 gated).
//
// C1 PROVENANCE-NOT-TRUTH: a candidate's summary is byte-provably FROM the
// committed corpus (or an explicit no-source marker); SOURCED does NOT mean TRUE.
// F2 anti-fabrication is ENFORCED, not policy: summary_sha16 must equal the
// sha16 of the committed corpus line, else the validator FAILS.

export const APROD_ID = 'answer-producer.v5-draft';
export const ADDRESS_MOD = 1000000;             // F1 binder DOMAIN_MAX+1
export const GLYPH_VER = 'APRODGLYPHv1';         // F5/F13 pinned, decoupled from spec version
const US = '\x1f';                                // F13 0x1F unit-separator, mandatory delim
const SAFETY_SUBSET = Object.freeze(['draft', 'no_mint', 'no_live_supervisor', 'no_fabric_call']);
const SCHEMA = Object.freeze([
  'candidate_index', 'address_index', 'lane', 'corpus_id', 'source', 'source_index',
  'source_row_sha16', 'summary_sha16', 'score_stub', 'reverseGain_stub', 'glyph', 'glyph_full',
  'pid', 'hookwallStatus', 'gnnStatus', 'gcDisposition', 'candidate', 'draft',
  'no_mint', 'no_live_supervisor', 'no_fabric_call', 'json',
]);
const FORBIDDEN = Object.freeze(['score', 'reverseGain', 'controllerPid', 'flywheelPid']);
const PID_RE = /^BH\.NEWSYS\.APROD\.CANDIDATE\.PID\.[0-9]{1,6}$/;
const MARKER_RE = /^DRAFT_NO_SOURCE_LANE_[0-2]_INDEX_[0-9]+$/;
const LIVE_TOKENS = Object.freeze(['OMNISPIN', 'OMNIFLY', 'OMNISPINDLE', 'OPENCODE', 'REAL100B']);
const HEX16_RE = /^[0-9a-f]{16}$/;
const HEX64_RE = /^[0-9a-f]{64}$/;
const STUB = '-1.0';                              // F18 exact string, NOT JS-default "-1"

const sha256hex = (t) => createHash('sha256').update(t, 'utf8').digest('hex'); // lowercase by default
const sha16 = (t) => sha256hex(t).slice(0, 16);
const isNonNegativeInteger = (n) => Number.isInteger(n) && n >= 0;

// F10/F14/C4: parse + validate the committed corpus bytes; corpus_id = sha16(file bytes).
export function loadCorpus(bytes) {
  const text = String(bytes);
  const corpus_id = sha16(text);
  const issues = [];
  if (/\r/.test(text)) issues.push('CRLF-or-CR-present');
  // exactly one trailing LF; split off the final terminator
  if (text.length > 0 && !text.endsWith('\n')) issues.push('file-does-not-end-in-LF');
  const body = text.endsWith('\n') ? text.slice(0, -1) : text;
  const lines = body.length === 0 ? [] : body.split('\n');
  for (const l of lines) {
    if (l.length === 0) issues.push('blank-line-forbidden');
    else if (l !== l.trim()) issues.push('trailing-or-leading-whitespace');
  }
  return { corpus_id, lines, size: lines.length, ok: issues.length === 0, issues };
}

function glyphPreimage(address_index, lane, source_row_sha16, summary_sha16) {
  // F13: fixed-field, 0x1F-joined, decimal-ASCII no-leading-zeros, lowercase hex
  return ['APROD', GLYPH_VER, String(address_index), String(lane), source_row_sha16, summary_sha16].join(US);
}
export function noSourceMarker(lane, address_index) {
  return `DRAFT_NO_SOURCE_LANE_${lane}_INDEX_${address_index}`;
}

// produce ONE candidate row object (closed schema), deterministic + time-free.
export function produceCandidate(candidate_index, corpus) {
  const address_index = candidate_index % ADDRESS_MOD;           // F1 fold
  const lane = classifyBhIndex(address_index).lane;              // address lane via binder
  let source; let source_index; let source_row_sha16; let summary_sha16;
  if (!corpus || corpus.size === 0) {                            // F14 size-0 guard BEFORE mod
    source = 'DRAFT_NO_SOURCE';
    source_index = -1;
    const marker = noSourceMarker(lane, address_index);
    summary_sha16 = sha16(marker);
    source_row_sha16 = sha16(marker);
  } else {
    source = 'CORPUS';
    source_index = candidate_index % corpus.size;               // C2
    const summary = corpus.lines[source_index];
    summary_sha16 = sha16(summary);                             // F2 byte-provable sourcing
    source_row_sha16 = sha16(summary);                          // C3: row IS the summary in v1
  }
  const glyph_full = sha256hex(glyphPreimage(address_index, lane, source_row_sha16, summary_sha16));
  return {
    candidate_index, address_index, lane,
    corpus_id: corpus ? corpus.corpus_id : sha16(''),
    source, source_index, source_row_sha16, summary_sha16,
    score_stub: STUB, reverseGain_stub: STUB,
    glyph: `HG256:APROD_CANDIDATE:${glyph_full.slice(0, 8)}`, glyph_full,
    pid: `BH.NEWSYS.APROD.CANDIDATE.PID.${address_index}`,
    hookwallStatus: 'CANDIDATE_PREGATE', gnnStatus: 'DRAFT_NOT_MARKED', gcDisposition: 'CANDIDATE_UNTRIAGED',
    candidate: 1, draft: 1, no_mint: 1, no_live_supervisor: 1, no_fabric_call: 1, json: 0,
  };
}

export function renderRow(row) {
  return 'APRODCANDIDATE|' + SCHEMA.map((k) => `${k}=${row[k]}`).join('|');
}

// F16 read-time validator + F4/F11/F12/F17/F8/F2/F15 -- the anti-fabrication oracle.
export function validateRow(row, corpus) {
  const fail = [];
  for (const k of SCHEMA) if (!(k in row)) fail.push(`missing:${k}`);
  for (const k of Object.keys(row)) if (!SCHEMA.includes(k)) fail.push(`unknown-or-forbidden:${k}`);
  for (const k of FORBIDDEN) if (k in row) fail.push(`forbidden:${k}`);
  for (const k of SAFETY_SUBSET) if (row[k] !== 1) fail.push(`safety:${k}!=1`);              // F11
  if (row.json !== 0) fail.push('json!=0');
  if (row.score_stub !== STUB || row.reverseGain_stub !== STUB) fail.push('stub-not-exact--1.0'); // F18
  if (!PID_RE.test(String(row.pid))) fail.push('pid-regex');                                 // F17
  if (LIVE_TOKENS.some((t) => String(row.pid).includes(t))) fail.push('pid-live-token');      // F17
  for (const h of [row.corpus_id, row.source_row_sha16, row.summary_sha16]) {
    if (!HEX16_RE.test(String(h))) fail.push('hex16-or-case');                                // F15
  }
  if (!HEX64_RE.test(String(row.glyph_full))) fail.push('glyph_full-hex64-or-case');          // F15
  if (!isNonNegativeInteger(row.candidate_index)) fail.push('candidate_index-not-nonnegative-int');
  if (!isNonNegativeInteger(row.address_index) || row.address_index >= ADDRESS_MOD) fail.push('address_index-out-of-domain');
  else if (isNonNegativeInteger(row.candidate_index) && row.address_index !== row.candidate_index % ADDRESS_MOD) fail.push('address-fold-mismatch'); // F1
  if (![0, 1, 2].includes(row.lane)) fail.push('lane-not-0-1-2');
  else if (isNonNegativeInteger(row.address_index) && row.address_index < ADDRESS_MOD && row.lane !== classifyBhIndex(row.address_index).lane) fail.push('lane-binder-mismatch');
  if (row.source === 'DRAFT_NO_SOURCE') {
    if (row.source_index !== -1) fail.push('no-source-index!=-1');                            // F12 cross-field
    const marker = noSourceMarker(row.lane, row.address_index);
    if (!MARKER_RE.test(marker)) fail.push('marker-shape');                                   // F6
    const markerSha16 = sha16(marker);
    if (markerSha16 !== row.summary_sha16) fail.push('marker-summary_sha16-mismatch');         // F8 cross-field
    if (markerSha16 !== row.source_row_sha16) fail.push('marker-source_row_sha16-mismatch');   // F8/C3 cross-field
  } else if (row.source === 'CORPUS') {
    if (!(row.source_index >= 0)) fail.push('corpus-index<0');                                // F12
    if (!corpus || corpus.size === 0) fail.push('corpus-required-but-empty');
    else {
      if (row.corpus_id !== corpus.corpus_id) fail.push('corpus_id-version-mismatch');        // F16(a)
      if (!(row.source_index < corpus.size)) fail.push('source_index-out-of-bounds');         // F16(c)
      else {
        const corpusRowSha16 = sha16(corpus.lines[row.source_index]);
        if (corpusRowSha16 !== row.summary_sha16) fail.push('FABRICATION-summary_sha16-not-from-corpus'); // F2
        if (corpusRowSha16 !== row.source_row_sha16) fail.push('source_row_sha16-not-from-corpus-row');   // C3
      }
    }
  } else {
    fail.push('source-not-in-closed-enum');                                                   // F12
  }
  if (HEX64_RE.test(String(row.glyph_full)) && HEX16_RE.test(String(row.source_row_sha16)) && HEX16_RE.test(String(row.summary_sha16))) {
    const expectedGlyphFull = sha256hex(glyphPreimage(row.address_index, row.lane, row.source_row_sha16, row.summary_sha16));
    if (row.glyph_full !== expectedGlyphFull) fail.push('glyph_full-preimage-mismatch');       // F5/F13
    if (row.glyph !== `HG256:APROD_CANDIDATE:${expectedGlyphFull.slice(0, 8)}`) fail.push('glyph-short-mismatch');
  }
  return { ok: fail.length === 0, fail };
}

const PARITY_CORPUS = 'use breath pacing as the first low-risk feedback loop\nrepresent blink motion and line-noise artifacts as explicit events\nwrite bids-like sidecars so provenance does not drift\n';
const PARITY_INDICES = Object.freeze([0, 1, 2, 999999, 1000000, 1000001]);

export function emitParityRows() {
  const corpus = loadCorpus(PARITY_CORPUS);
  const empty = loadCorpus('');
  const rows = [`APRODPARITYHDR|id=${APROD_ID}|corpus_id=${corpus.corpus_id}|corpus_size=${corpus.size}|cases=${PARITY_INDICES.length}|glyph_ver=${GLYPH_VER}|json=0`];
  for (const i of PARITY_INDICES) rows.push(renderRow(produceCandidate(i, corpus)));
  rows.push(`APRODPARITYNOSOURCE|empty_corpus_id=${empty.corpus_id}|json=0`);
  rows.push(renderRow(produceCandidate(7, empty)));
  // golden vector: exact glyph preimage bytes -> known sha256 (byte-anchor, F13)
  const gp = glyphPreimage(5, 2, 'a'.repeat(16), 'b'.repeat(16));
  rows.push(`APRODGOLDENGLYPH|preimage_sha256=${sha256hex(gp)}|preimage_len=${gp.length}|json=0`);
  rows.push('APRODPARITYFTR|scope=DRAFT-ONLY-no-mint-no-Fischer-no-minter|provenance_not_truth=SOURCED-does-not-mean-TRUE|json=0');
  return rows;
}

export function selfTest() {
  const corpus = loadCorpus(PARITY_CORPUS);
  const checks = [];
  const add = (n, ok) => checks.push({ name: n, ok });
  const r0 = produceCandidate(0, corpus);
  add('valid-row-passes', validateRow(r0, corpus).ok);
  add('lane-agrees-with-binder', r0.lane === classifyBhIndex(r0.address_index).lane);
  add('address-fold', produceCandidate(1000000, corpus).address_index === 0);
  add('stub-exact-string', r0.score_stub === '-1.0' && r0.reverseGain_stub === '-1.0');
  add('all-hex-lowercase', /^[0-9a-f]{16}$/.test(r0.summary_sha16) && /^[0-9a-f]{64}$/.test(r0.glyph_full));
  add('safety-subset-all-1', SAFETY_SUBSET.every((k) => r0[k] === 1));
  add('pid-matches-regex', PID_RE.test(r0.pid));
  add('empty-corpus-no-source', produceCandidate(3, loadCorpus('')).source === 'DRAFT_NO_SOURCE');
  add('no-source-index--1', produceCandidate(3, loadCorpus('')).source_index === -1);
  // MUTATION (liris-required): each must FAIL the validator
  add('mut-fabrication-fails', !validateRow({ ...r0, summary_sha16: sha16('forged not in corpus') }, corpus).ok);
  add('mut-source-row-hash-fails', !validateRow({ ...r0, source_row_sha16: '0'.repeat(16) }, corpus).ok);
  add('mut-glyph-preimage-fails', !validateRow({ ...r0, glyph_full: '0'.repeat(64) }, corpus).ok);
  add('mut-lane-mismatch-fails', !validateRow({ ...r0, lane: (r0.lane + 1) % 3 }, corpus).ok);
  add('mut-forbidden-field-fails', !validateRow({ ...r0, score: 0.938 }, corpus).ok);
  add('mut-stub-leak-fails', !validateRow({ ...r0, score_stub: '-1' }, corpus).ok);
  add('mut-safety-off-fails', !validateRow({ ...r0, no_mint: 0 }, corpus).ok);
  add('mut-pid-live-token-fails', !validateRow({ ...r0, pid: 'BH.NEWSYS.APROD.CANDIDATE.PID.OMNISPIN' }, corpus).ok);
  add('mut-marker-spoof-fails', !validateRow({ ...produceCandidate(3, loadCorpus('')), summary_sha16: sha16('DRAFT_NO_SOURCE_LANE_2_INDEX_999') }, loadCorpus('')).ok);
  add('determinism', emitParityRows().join('|') === emitParityRows().join('|'));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === '--parity') {
    process.stdout.write(`${emitParityRows().join('\n')}\n`);
  } else {
    process.stdout.write(`APRODSTATUS|id=${APROD_ID}|scope=DRAFT-ONLY|schema_fields=${SCHEMA.length}|safety_subset=${SAFETY_SUBSET.length}|json=0\n`);
  }
}
