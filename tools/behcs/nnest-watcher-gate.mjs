#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// COMPONENT|4 seed: the N-Nest watcher-gate as a deterministic verification
// contract, repo-side DRAFT ONLY. No process spawning, no recursion into
// real agents, no harness edits. The gate verifies a REPORTED chain of
// (depth, reported_sha16, recomputed_sha16) tuples and emits a verdict row;
// it never acts. Proven primitive: N-Nest-Prime depth-16 over 2732 real
// files, planted confabulation caught at the exact level.
//
// THE LAW (operator amendment 2026-06-11): CHILD_MAY_ACT requires BOTH
//   (a) reported_sha16 == recomputed_sha16 at EVERY level, AND
//   (b) the chain is complete, contiguous, unique, and ordered depth 0..max.
// Truncation, duplicate depth, skipped depth, or reordered depth is
// CHILD_HELD with gate=chain-topology-invalid and first_bad_depth -- never
// merely malformed. Matching hashes are necessary but not sufficient.
// Consent anchors only at apex-T0: consent-requiring actions DEFER even on
// a perfect chain.

export const GATE_ID = 'nnest-watcher-gate.v1';
export const MAX_DEPTH_BOUND = 16; // the proven N-Nest-Prime depth

// Action registry (closed set, DRAFT_ASSUMPTION declared). consent=1
// actions can NEVER be CHILD_MAY_ACT -- they defer to the operator.
export const ACTIONS = Object.freeze({
  observe: { consent: 0 },
  'report-up': { consent: 0 },
  'draft-row': { consent: 0 },
  'act-on-world': { consent: 1 },
  'spawn-child': { consent: 1 },
  'modify-self': { consent: 1 },
});

const AGENT_ID_RE = /^AGT-[A-Z0-9][A-Z0-9-]{2,38}$/;
const HASH_RE = /^[0-9a-f]{16}$/;
const DIRTY_RE = /[|\r\n]/;

function sha16(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function cleanString(value) {
  return typeof value === 'string' && !DIRTY_RE.test(value) ? value : null;
}

function echoField(value, validator) {
  const clean = cleanString(value);
  if (clean == null) return 'invalid';
  return validator(clean) ? clean : 'invalid';
}

// chain_sha16 is the only chain-derived value a row may carry: a digest of
// the canonical serialization, never the level hashes themselves. HELD rows
// name first_bad_depth (the proven catch-at-exact-level behavior) and
// nothing else about the chain's content.
function chainDigest(chain) {
  if (!Array.isArray(chain) || chain.length === 0) return 'none';
  const shaped = chain.every(
    (t) => t && typeof t === 'object' && !Array.isArray(t)
      && Number.isInteger(t.depth)
      && typeof t.reported_sha16 === 'string' && !DIRTY_RE.test(t.reported_sha16)
      && typeof t.recomputed_sha16 === 'string' && !DIRTY_RE.test(t.recomputed_sha16),
  );
  if (!shaped) return 'none';
  return sha16(JSON.stringify(chain.map((t) => [t.depth, t.reported_sha16, t.recomputed_sha16])));
}

function buildResult(inp, verdict, gates, firstBadDepth) {
  const chain = Array.isArray(inp.chain) ? inp.chain : [];
  const fields = {
    agent: echoField(inp.agent, (v) => AGENT_ID_RE.test(v)),
    action: echoField(inp.action, (v) => Object.hasOwn(ACTIONS, v)),
    max_depth: Number.isInteger(inp.max_depth) && inp.max_depth >= 0 && inp.max_depth <= MAX_DEPTH_BOUND ? inp.max_depth : 'invalid',
    chain_len: chain.length,
    chain_sha16: chainDigest(inp.chain),
    verdict,
    first_bad_depth: firstBadDepth ?? 'none',
    gate: gates.length ? gates.join('+') : 'none',
  };
  const row = [
    'NNESTGATE',
    `agent=${fields.agent}`,
    `action=${fields.action}`,
    `max_depth=${fields.max_depth}`,
    `chain_len=${fields.chain_len}`,
    `chain_sha16=${fields.chain_sha16}`,
    `verdict=${fields.verdict}`,
    `first_bad_depth=${fields.first_bad_depth}`,
    `gate=${fields.gate}`,
    'executable=0',
    'json=0',
  ].join('|');
  return { ...fields, ok: verdict === 'CHILD_MAY_ACT', executable: 0, row };
}

export function gateChain(input) {
  const inp = input ?? {};
  const held = (gate, firstBadDepth) => buildResult(inp, 'CHILD_HELD', [gate], firstBadDepth);

  // Rung 1: dirty top-level strings never reach a row.
  for (const field of ['agent', 'action']) {
    const value = inp[field];
    if (value != null && (typeof value !== 'string' || DIRTY_RE.test(value))) {
      return held(`dirty-${field}`);
    }
  }

  // Rungs 2-3: identity and action must be registered.
  if (!AGENT_ID_RE.test(inp.agent ?? '')) return held('malformed-agent-id');
  if (!Object.hasOwn(ACTIONS, inp.action ?? '')) return held('unknown-action');

  // Rung 4: depth bound is the proven depth, never beyond.
  if (!Number.isInteger(inp.max_depth) || inp.max_depth < 0 || inp.max_depth > MAX_DEPTH_BOUND) {
    return held('invalid-max-depth');
  }

  // Rung 5: a chain must exist.
  if (!Array.isArray(inp.chain) || inp.chain.length === 0) return held('empty-or-missing-chain');

  // Rung 6: OPERATOR INVARIANT -- topology before hashes. The chain must be
  // complete, contiguous, unique, and ordered: position i carries depth i,
  // for every i in 0..max_depth, and nothing beyond. The single ordered
  // pass makes truncation, duplication, skips, and reorders all land here.
  if (inp.chain.length !== inp.max_depth + 1) {
    const firstBad = inp.chain.length < inp.max_depth + 1 ? inp.chain.length : inp.max_depth + 1;
    return held('chain-topology-invalid', firstBad);
  }
  for (let i = 0; i <= inp.max_depth; i += 1) {
    const tuple = inp.chain[i];
    if (!tuple || typeof tuple !== 'object' || Array.isArray(tuple) || tuple.depth !== i) {
      return held('chain-topology-invalid', i);
    }
    if (!HASH_RE.test(tuple.reported_sha16 ?? '') || !HASH_RE.test(tuple.recomputed_sha16 ?? '')) {
      return held('hash-format-invalid', i);
    }
  }

  // Rung 7: hash agreement at EVERY level -- first divergence is named
  // exactly (the planted-confab-caught-at-exact-level behavior).
  for (let i = 0; i <= inp.max_depth; i += 1) {
    if (inp.chain[i].reported_sha16 !== inp.chain[i].recomputed_sha16) {
      return held('hash-divergence', i);
    }
  }

  // Rung 8: consent anchors only at apex-T0. A perfect chain does not
  // confer consent -- it only proves the report is honest.
  if (ACTIONS[inp.action].consent) {
    return buildResult(inp, 'DEFER_TO_OPERATOR', ['consent-anchors-at-apex-T0-only'], null);
  }

  // Rung 9: honest report + free action -> the child may act.
  return buildResult(inp, 'CHILD_MAY_ACT', [], null);
}

export function statusRows() {
  const rows = [
    `NNESTGATEHDR|ok=1|id=${GATE_ID}|component=4|max_depth_bound=${MAX_DEPTH_BOUND}|actions=${Object.keys(ACTIONS).length}|invariant=every-row-executable-0|state=DRAFT_CONTRACT_NO_SPAWN_NO_HARNESS_EDIT|json=0`,
    'NNESTGATELAW|may_act_requires=hash-match-at-every-level-AND-chain-complete-contiguous-unique-ordered|hashes=necessary-but-not-sufficient|topology_violations=CHILD_HELD-chain-topology-invalid-with-first_bad_depth|source=OP-JESSE-amendment-2026-06-11|json=0',
    'NNESTGATELADDER|rungs=9|order=dirty-HELD+malformed-agent-HELD+unknown-action-HELD+invalid-max-depth-HELD+empty-chain-HELD+topology-HELD(first_bad_depth)+hash-format-HELD(first_bad_depth)+hash-divergence-HELD(first_bad_depth)+consent-DEFER+honest-free-CHILD_MAY_ACT|json=0',
  ];
  for (const [id, meta] of Object.entries(ACTIONS)) {
    rows.push(`NNESTGATEACTION|id=${id}|consent=${meta.consent}|max_verdict=${meta.consent ? 'DEFER_TO_OPERATOR' : 'CHILD_MAY_ACT'}|json=0`);
  }
  rows.push('NNESTGATELEAK|held_rows_carry=first_bad_depth+chain_sha16-only|level_hashes=NEVER-echoed|json=0');
  rows.push('NNESTGATESAFETY|mutates=0|pure_function=1|no_spawn=1|no_recursion_into_real_agents=1|no_harness_edit=1|mints=0|launches=0|usb_writes=0|engine_edits=0|json=0');
  rows.push('NNESTGATEEND|state=COMPONENT_4_SEED_DRAFT_CONTRACT|json=0');
  return rows;
}

// Parity baseline: fixed deterministic chains, time-free contract.
function level(i) {
  return sha16(`nnest-level-${i}`);
}
function goodChain(maxDepth) {
  return Array.from({ length: maxDepth + 1 }, (_, i) => ({ depth: i, reported_sha16: level(i), recomputed_sha16: level(i) }));
}
function divergeAt(maxDepth, k) {
  const chain = goodChain(maxDepth);
  chain[k] = { ...chain[k], recomputed_sha16: sha16(`confab-${k}`) };
  return chain;
}
const BASE = Object.freeze({ agent: 'AGT-NNEST-PROBE-0001', action: 'report-up', max_depth: 3 });
const PARITY_CASES = Object.freeze([
  { id: '01', input: { ...BASE, chain: goodChain(3) } },
  { id: '02', input: { ...BASE, max_depth: 16, chain: goodChain(16) } },
  { id: '03', input: { ...BASE, chain: divergeAt(3, 2) } },
  { id: '04', input: { ...BASE, chain: divergeAt(3, 0) } },
  { id: '05', input: { ...BASE, chain: goodChain(3).slice(0, 3) } },
  { id: '06', input: { ...BASE, chain: [goodChain(3)[0], goodChain(3)[1], { ...goodChain(3)[1] }, goodChain(3)[3]] } },
  { id: '07', input: { ...BASE, chain: [goodChain(4)[0], goodChain(4)[1], goodChain(4)[3], goodChain(4)[4]] } },
  { id: '08', input: { ...BASE, chain: [goodChain(3)[0], goodChain(3)[2], goodChain(3)[1], goodChain(3)[3]] } },
  { id: '09', input: { ...BASE, action: 'act-on-world', chain: goodChain(3) } },
  { id: '10', input: { ...BASE, action: 'spawn-child', chain: goodChain(3) } },
  { id: '11', input: { ...BASE, action: 'rm-rf-everything', chain: goodChain(3) } },
  { id: '12', input: { ...BASE, max_depth: 17, chain: goodChain(3) } },
  { id: '13', input: { ...BASE, agent: 'AGT-EVIL|json=1', chain: goodChain(3) } },
  { id: '14', input: { ...BASE, chain: (() => { const c = goodChain(3); c[1] = { ...c[1], reported_sha16: 'NOT-A-HASH' }; return c; })() } },
  { id: '15', input: { ...BASE, chain: [] } },
  { id: '16', input: { ...BASE, max_depth: 0, chain: goodChain(0) } },
]);

export function emitParityRows() {
  const rows = [
    `NNESTGATEPARITYHDR|component=4|cases=${PARITY_CASES.length}|clock=none-time-free-contract|rule=rows-byte-identical-on-every-machine|json=0`,
  ];
  for (const probe of PARITY_CASES) {
    const out = gateChain(probe.input);
    rows.push(`NNESTGATEPARITY|case=${probe.id}|${out.row.slice('NNESTGATE|'.length)}`);
  }
  rows.push(
    `NNESTGATEPARITYFTR|cases=${PARITY_CASES.length}|exit=byte-match-when-regenerated-file-equals-sealed-baseline|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  add('honest-chain-may-act', gateChain({ ...BASE, chain: goodChain(3) }).verdict === 'CHILD_MAY_ACT');
  add('divergence-caught-at-exact-level', gateChain({ ...BASE, chain: divergeAt(3, 2) }).first_bad_depth === 2);
  add('truncation-is-topology-not-malformed', gateChain({ ...BASE, chain: goodChain(3).slice(0, 3) }).gate === 'chain-topology-invalid');
  add('matching-hashes-not-sufficient', gateChain({ ...BASE, chain: goodChain(3).slice(0, 3) }).verdict === 'CHILD_HELD');
  add('consent-defers-on-perfect-chain', gateChain({ ...BASE, action: 'act-on-world', chain: goodChain(3) }).verdict === 'DEFER_TO_OPERATOR');
  add('depth-bound-16-held', gateChain({ ...BASE, max_depth: 17, chain: goodChain(3) }).gate === 'invalid-max-depth');
  add('every-row-executable-0', emitParityRows().slice(1, -1).every((row) => row.includes('|executable=0|')));
  add('rows-hbp-only', [...statusRows(), ...emitParityRows()].every((row) => row.endsWith('json=0') && !row.includes('{"')));

  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--parity') {
    process.stdout.write(emitParityRows().join('\n') + '\n');
  } else {
    console.error('usage: nnest-watcher-gate.mjs --status | --self-test | --parity');
    process.exit(1);
  }
}
