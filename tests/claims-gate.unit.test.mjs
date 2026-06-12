import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import { CLAIM_TOKENS, TAGLAW_TAGS, emitParityRows, scanText, selfTest } from '../tools/behcs/claims-gate.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('claims-gate self-test passes all checks', () => {
  assert.equal(selfTest().ok, true);
});

test('untagged extraordinary claim flags; tagged passes (the not-canon-until-hashed rule)', () => {
  assert.equal(scanText('10^290 agents').verdict, 'FLAGS');
  assert.equal(scanText('10^290 agents [ASPIRATIONAL]').verdict, 'CLEAN');
  assert.equal(scanText('9589/0 theorem').flagged, 1);
  assert.equal(scanText('9589/0 theorem [PROVEN]').flagged, 0);
});

test('a FLAG is a review-prompt not a verdict: negated claims still flag (declared false-positive)', () => {
  // the gate reads the token, not the negation -- this is honest, not a bug
  assert.equal(scanText('this is NOT literal mind-reading').flagged, 1);
});

test('declared false-negatives are real and named, not hidden', () => {
  assert.equal(scanText('10 ^ 290 hyphen-split').total_claim_tokens, 0); // (a) split exponent
  assert.equal(scanText('ASI at line start').total_claim_tokens, 0);      // (e) word-boundary token at edge
});

test('regenerated parity rows byte-match the sealed baseline (STEP166 pattern)', () => {
  const baseline = readFileSync(join(repo, 'docs/CLAIMSGATE-PARITY-BASELINE-2026-06-12.hbp'), 'utf8');
  assert.equal(emitParityRows().join('\n') + '\n', baseline);
});

test('every parity row is HBP-only and registries are closed', () => {
  assert.ok(emitParityRows().every((row) => row.endsWith('json=0') && !row.includes('{"')));
  assert.ok(CLAIM_TOKENS.length > 0 && TAGLAW_TAGS.length > 0);
  assert.ok(Object.isFrozen(CLAIM_TOKENS) && Object.isFrozen(TAGLAW_TAGS));
});
