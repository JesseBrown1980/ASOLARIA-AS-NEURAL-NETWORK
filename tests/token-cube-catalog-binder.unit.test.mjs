import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  CATALOGS,
  DISPUTED_BANDS,
  SCOPES,
  TOKEN_KINDS,
  bindToken,
  emitParityRows,
  selfTest,
  statusRows,
} from '../tools/behcs/token-cube-catalog-binder.mjs';

const GOOD = Object.freeze({
  token_id: 'TOK-GNN-EDGE-0001',
  token_kind: 'sha16-row-hash',
  digest_sha16: '794b8c68ec512f9e',
  cube_bh: 'BH-ACER-754',
  scope: 'read',
  source_catalog: 'atlas-v55',
});

const FULL_SHA256 = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

test('clean reference binding is DRAFT_BINDING_READY and never executable', () => {
  const out = bindToken({ ...GOOD });
  assert.equal(out.verdict, 'DRAFT_BINDING_READY');
  assert.equal(out.executable, 0);
  assert.ok(out.row.includes('|executable=0|'));
  assert.equal(out.gate, 'none');
});

test('secret leakage: material-shaped values are redacted, never echoed', () => {
  const longKey = bindToken({ ...GOOD, token_id: 'BEGIN-PRIVATE-KEY-MATERIAL-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' });
  assert.equal(longKey.verdict, 'DRAFT_BINDING_BLOCKED');
  assert.equal(longKey.token_id, 'redacted');
  assert.ok(longKey.gate.includes('material-not-reference-suspected'));
  assert.ok(!longKey.row.includes('PRIVATE'), 'key-block marker must not reach the row');

  const fullHash = bindToken({ ...GOOD, digest_sha16: FULL_SHA256 });
  assert.equal(fullHash.digest_sha16, 'redacted');
  assert.ok(!fullHash.row.includes(FULL_SHA256), 'full sha256 material must not reach the row');
});

test('hash-length spoofing and digest normalization: exactly 16 lowercase hex or blocked', () => {
  for (const digest of ['794b8c68ec512f9', '794b8c68ec512f9e0', '794B8C68EC512F9E', 'zz4b8c68ec512f9e', '', null]) {
    const out = bindToken({ ...GOOD, digest_sha16: digest });
    assert.equal(out.verdict, 'DRAFT_BINDING_BLOCKED', `digest=${digest}`);
    assert.ok(out.gate.startsWith('malformed-digest') || out.gate.startsWith('dirty-'), out.gate);
  }
  assert.equal(bindToken({ ...GOOD, digest_sha16: FULL_SHA256 }).gate, 'malformed-digest+material-not-reference-suspected');
});

test('HBP injection: pipe/CR/LF in any field blocks before echo', () => {
  for (const patch of [
    { token_id: 'TOK-EVIL|json=1' },
    { cube_bh: 'BH-ACER-754|mutates=1' },
    { source_catalog: 'atlas-v55\nrow' },
    { scope: 'read\r' },
  ]) {
    const out = bindToken({ ...GOOD, ...patch });
    assert.equal(out.verdict, 'DRAFT_BINDING_BLOCKED');
    assert.ok(out.gate.startsWith('dirty-'));
    assert.ok(!out.row.includes('json=1') || !out.row.includes('mutates=1'));
    assert.equal((out.row.match(/json=0/g) ?? []).length, 1, 'row carries exactly one json=0 terminator');
  }
});

test('scope escalation: mint and write cap at DEFER_TO_OPERATOR, never READY', () => {
  for (const [scope, meta] of Object.entries(SCOPES)) {
    const out = bindToken({ ...GOOD, scope });
    if (meta.escalates) {
      assert.equal(out.verdict, 'DEFER_TO_OPERATOR', scope);
      assert.equal(out.gate, 'scope-escalation-requires-operator');
    } else {
      assert.equal(out.verdict, 'DRAFT_BINDING_READY', scope);
    }
    assert.equal(out.executable, 0);
  }
  assert.equal(bindToken({ ...GOOD, scope: 'root' }).gate, 'unknown-scope');
});

test('live-binding semantics: mode=live defers, unknown mode blocks, default is draft', () => {
  assert.equal(bindToken({ ...GOOD, mode: 'live' }).verdict, 'DEFER_TO_OPERATOR');
  assert.equal(bindToken({ ...GOOD, mode: 'live' }).gate, 'live-binding-requires-operator');
  assert.equal(bindToken({ ...GOOD, mode: 'yolo' }).gate, 'unknown-mode');
  assert.equal(bindToken({ ...GOOD }).mode, 'draft');
});

test('cube address ambiguity: vantage qualification required per hilbert-collision canon', () => {
  for (const cube_bh of ['BH-942', 'BH-acer-754', 'BH-OTHER-754', '754', 'BH-ACER-', 'BH-ACER-1234567', null]) {
    const out = bindToken({ ...GOOD, cube_bh });
    assert.equal(out.verdict, 'DRAFT_BINDING_BLOCKED', `cube_bh=${cube_bh}`);
    assert.equal(out.gate, 'missing-or-unqualified-cube-address');
  }
});

test('disputed hilbert band 930-1229 defers regardless of vantage, exact boundaries', () => {
  assert.deepEqual(DISPUTED_BANDS.map((b) => [b.lo, b.hi]), [[930, 1229]]);
  assert.equal(bindToken({ ...GOOD, cube_bh: 'BH-ACER-929' }).verdict, 'DRAFT_BINDING_READY');
  assert.equal(bindToken({ ...GOOD, cube_bh: 'BH-ACER-930' }).verdict, 'DEFER_TO_OPERATOR');
  assert.equal(bindToken({ ...GOOD, cube_bh: 'BH-LIRIS-1229' }).verdict, 'DEFER_TO_OPERATOR');
  assert.equal(bindToken({ ...GOOD, cube_bh: 'BH-LIRIS-1230' }).verdict, 'DRAFT_BINDING_READY');
  assert.equal(bindToken({ ...GOOD, cube_bh: 'BH-SHARED-1000' }).verdict, 'DEFER_TO_OPERATOR', 'SHARED vantage does not bypass the disputed band');
});

test('registry case sensitivity: exact-match only, case-flips rejected', () => {
  assert.equal(bindToken({ ...GOOD, token_kind: 'SHA16-ROW-HASH' }).gate, 'unknown-token-kind');
  assert.equal(bindToken({ ...GOOD, source_catalog: 'ATLAS-V55' }).gate, 'unknown-source-catalog');
  assert.equal(bindToken({ ...GOOD, token_kind: 'jwt-bearer' }).gate, 'unknown-token-kind');
  // hilbert-omni-47D carries its canonical capital D (matches the real
  // fabric artifact name) -- exact bytes pass, case-flips fail.
  assert.ok(CATALOGS.includes('hilbert-omni-47D'));
  assert.equal(bindToken({ ...GOOD, source_catalog: 'hilbert-omni-47D' }).verdict, 'DRAFT_BINDING_READY');
  assert.equal(bindToken({ ...GOOD, source_catalog: 'hilbert-omni-47d' }).gate, 'unknown-source-catalog');
  assert.ok(TOKEN_KINDS.every((k) => k === k.toLowerCase()), 'kinds are all-lowercase by design');
});

test('blocked and deferred rows leak no extra context: closed verdict set, no host paths, no material', () => {
  const allRows = [...statusRows(), ...emitParityRows()];
  for (const row of allRows) {
    assert.ok(!row.includes('executable=1'), row);
    assert.ok(!/[\\]|C:|Users|rayss|home\/|PRIVATE/.test(row), `leak: ${row}`);
    assert.ok(!row.includes(FULL_SHA256), 'material must not appear in any sealed row');
    assert.ok(row.endsWith('json=0') && !row.includes('{"'));
  }
  for (const c of [{ ...GOOD }, { ...GOOD, mode: 'live' }, { ...GOOD, token_kind: 'nope' }]) {
    const v = bindToken(c).verdict;
    assert.ok(['DRAFT_BINDING_READY', 'DEFER_TO_OPERATOR', 'DRAFT_BINDING_BLOCKED'].includes(v));
  }
});

// Component-3 parity, STEP|166 pattern: a green pyramid run on liris IS the
// bilateral byte-match. Contract is time-free, so no clock enters the rows.
test('component-3 parity: regenerated rows byte-match the sealed baseline', () => {
  const regenerated = emitParityRows().join('\n') + '\n';
  const baseline = readFileSync(
    new URL('../docs/TOKEN-CUBE-CATALOG-PARITY-BASELINE-2026-06-11.hbp', import.meta.url),
    'utf8',
  );
  assert.equal(regenerated, baseline, 'this machine produced different bytes than the sealed baseline');
});

test('binder self-test passes', () => {
  assert.equal(selfTest().ok, true);
});
