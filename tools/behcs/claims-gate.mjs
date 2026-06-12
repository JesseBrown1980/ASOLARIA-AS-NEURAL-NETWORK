#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// CLAIMSGATE v1 -- deterministic honesty scanner that operationalizes the
// canon law not-canon-until-hashed (seq 3564, CLASS-1-IMMUTABLE). It scans
// text/HBP rows for EXTRAORDINARY-CLAIM tokens (scale numbers, superlatives,
// frame terms) and FLAGS any occurrence on a line that carries no TAGLAW tag.
//
// SCOPE = NECESSARY-NOT-SUFFICIENT, INFORMATIONAL v1, NEVER gating:
//  - it CATCHES exact (case-insensitive) token occurrences that lack a nearby
//    TAGLAW tag -- a fast guard against silent overclaim.
//  - it does NOT prove a tagged claim is true (a TAGLAW tag only means the
//    author declared a tag, not that the evidence holds).
// DECLARED FALSE-NEGATIVES (the liris attack surface, named not hidden):
//  (a) hyphen/space-split exponents -- "10 ^ 290", "10- 290" -- NOT caught.
//  (b) unicode look-alike digits/superscripts NOT normalized -- NOT caught.
//  (c) token split across two lines -- NOT caught (line is the scan unit).
//  (d) novel inflation phrasing not in the closed registry -- NOT caught.
//  (e) word-boundary tokens (ASI) are space-padded to avoid asia/basic false
//      POSITIVES, so ASI at a line start/end is NOT caught (found by dogfood).
// DECLARED FALSE-POSITIVE: a NEGATED/CORRECTED claim still flags -- the gate
// reads the token, not the negation ("NOT literal mind-reading" flags). So a
// FLAG is a REVIEW-PROMPT, never a verdict; a negation is dismissed on review.
// These are exactly the cases to attack before the gate is trusted.

export const CLAIMSGATE_ID = 'claims-gate.v1';

// Closed registry: extraordinary-claim tokens. BOTH inflation AND proven-
// extraordinary claims belong here -- the rule is "must be TAGLAW-tagged",
// not "forbidden". A tagged 9589/0 [PROVEN] passes; an untagged one flags.
export const CLAIM_TOKENS = Object.freeze([
  '10^290', '10^200', '1e200', '1e290', '200ns', '50us', '393x', '394x', '115x',
  '63k/sec', '5m/sec', '25m/sec', '104k/sec', '351.35m', '6.356b', '4.4t',
  '0.3-bytes', '0.3 bytes', '8-byte', '3-billion-to-1', '4-billion-to-1',
  '9589/0', '20971.5x', '277800007', '100b',
  'engine for truth', 'engine-for-truth', 'no other software', 'computational perfection',
  'saves trillions', 'sub-bios', 'literal mind-reading', 'sees its thoughts',
  ' asi ', 'asi-arrival', 'class-v',
]);

// Closed registry: TAGLAW tags. A line carrying any of these is "tagged".
export const TAGLAW_TAGS = Object.freeze([
  'PROVEN', 'PARTIAL', 'DRAFT', 'PROPOSAL', 'OPERATOR_GATED', 'OPERATOR-GATED',
  'ASPIRATIONAL', 'RETIRED', 'not-canon', 'NOT-CANON', 'CANON_CLAIMED',
  'capability-claims-require-receipts', 'not-canon-until-hashed', 'LIRIS-CANNOT-SEE', 'ACER-CANNOT-SEE',
]);

function lineHasTag(lowerLine) {
  return TAGLAW_TAGS.some((t) => lowerLine.includes(t.toLowerCase()));
}

export function scanText(text) {
  const lines = String(text == null ? '' : text).split(/\r?\n/);
  const matches = [];
  for (let i = 0; i < lines.length; i += 1) {
    const lower = lines[i].toLowerCase();
    const tagged = lineHasTag(lower);
    for (const tok of CLAIM_TOKENS) {
      if (lower.includes(tok.toLowerCase())) {
        matches.push({ line: i + 1, token: tok.trim(), tagged, verdict: tagged ? 'TAGGED-OK' : 'UNTAGGED-FLAG' });
      }
    }
  }
  const flagged = matches.filter((m) => !m.tagged);
  return {
    scanned_lines: lines.length,
    total_claim_tokens: matches.length,
    tagged: matches.length - flagged.length,
    flagged: flagged.length,
    verdict: flagged.length === 0 ? 'CLEAN' : 'FLAGS',
    matches,
  };
}

const PARITY_CASES = Object.freeze([
  'the system runs 10^290 agents',                       // untagged scale -> FLAG
  'capacity is 1e200 addressable [ASPIRATIONAL]',        // tagged -> OK
  'forcing sweep 9589/0 zero violations',                // untagged extraordinary -> FLAG
  'forcing sweep 9589/0 zero violations [PROVEN]',       // tagged -> OK
  'it is an engine for truth',                           // untagged superlative -> FLAG
  'NOT-CANON: engine-for-truth claim held',              // tagged -> OK
  'omniflywheel 9-stage forward pass',                   // no claim token -> no match
  'the 10 ^ 290 hyphen-split slips the v1 gate',         // DECLARED false-negative -> NO match
]);

export function emitParityRows() {
  const rows = [`CLAIMSGATEPARITYHDR|id=${CLAIMSGATE_ID}|cases=${PARITY_CASES.length}|scope=NECESSARY-NOT-SUFFICIENT-informational-v1|json=0`];
  for (let i = 0; i < PARITY_CASES.length; i += 1) {
    const r = scanText(PARITY_CASES[i]);
    rows.push(`CLAIMSGATECASE|i=${i}|tokens=${r.total_claim_tokens}|flagged=${r.flagged}|verdict=${r.verdict}|json=0`);
  }
  rows.push('CLAIMSGATEPARITYFTR|declared_false_negatives=hyphen-split+unicode-lookalike+cross-line-split+novel-phrasing+word-boundary-token-at-line-edge|declared_false_positive=negated-or-corrected-claim-still-flags-so-FLAG-is-review-prompt-not-verdict|classification=INFORMATIONAL-never-gating|json=0');
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  add('untagged-scale-flags', scanText('runs 10^290 agents').flagged === 1);
  add('tagged-scale-passes', scanText('runs 10^290 agents [ASPIRATIONAL]').flagged === 0);
  add('untagged-superlative-flags', scanText('an engine for truth').flagged === 1);
  add('tagged-superlative-passes', scanText('engine-for-truth NOT-CANON').flagged === 0);
  add('proven-claim-passes-when-tagged', scanText('9589/0 forcing [PROVEN]').flagged === 0);
  add('proven-claim-flags-when-untagged', scanText('9589/0 forcing theorem').flagged === 1);
  add('clean-line-no-match', scanText('omniflywheel 9-stage forward pass').total_claim_tokens === 0);
  add('declared-fn-hyphen-split-not-caught', scanText('10 ^ 290 split').total_claim_tokens === 0);
  add('empty-input-safe', scanText('').total_claim_tokens === 0 && scanText(null).total_claim_tokens === 0);
  add('multiline-counts-per-line', scanText('10^290 here\nengine for truth there').flagged === 2);
  add('declared-fp-negated-claim-still-flags', scanText('this is not literal mind-reading').flagged === 1);
  add('declared-fn-asi-at-line-start-missed', scanText('ASI there').total_claim_tokens === 0);
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
    process.stdout.write(`CLAIMSGATESTATUS|id=${CLAIMSGATE_ID}|scope=NECESSARY-NOT-SUFFICIENT|classification=INFORMATIONAL-never-gating|tokens=${CLAIM_TOKENS.length}|tags=${TAGLAW_TAGS.length}|json=0\n`);
  }
}
