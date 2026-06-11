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
const TUPLE_KEYS = Object.freeze(['depth', 'reported_sha16', 'recomputed_sha16']);

function isCanonicalDepth(value) {
  return Number.isInteger(value) && value >= 0 && value <= MAX_DEPTH_BOUND && !Object.is(value, -0);
}

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

// Each reported tuple is read EXACTLY ONCE into an immutable, prototype-free
// snapshot. Accessor (getter/setter) fields, non-enumerable own fields, symbol
// keys, extra keys, and non-plain objects are all rejected here -- so a tuple
// cannot present one value to the verifier and another to the digest (a
// time-of-check/time-of-use split), nor smuggle hidden own material past the
// exact-shape rule. Returns the frozen snapshot, or null if the shape is not an
// exact three-field plain data object. (acer hardening 2026-06-11: liris's
// Object.keys check missed accessors, non-enumerable, and symbol own fields.)
function snapshotTuple(raw) {
  try {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    if (Object.getPrototypeOf(raw) !== Object.prototype) return null;
    if (Object.getOwnPropertySymbols(raw).length !== 0) return null;
    const names = Object.getOwnPropertyNames(raw);
    if (names.length !== TUPLE_KEYS.length) return null;
    const snap = Object.create(null);
    for (const key of TUPLE_KEYS) {
      const desc = Object.getOwnPropertyDescriptor(raw, key);
      if (!desc || !Object.hasOwn(desc, 'value')) return null; // reject accessors
      snap[key] = desc.value;
    }
    return Object.freeze(snap);
  } catch {
    return null;
  }
}

// The reported chain is materialized ONCE: each index is read a single time and
// each tuple snapshotted, so a proxy array or live object cannot vary between
// the topology pass, the hash pass, and the digest. Everything downstream reads
// only this frozen snapshot, never the caller's original object.
function materializeChain(rawChain) {
  try {
    if (!Array.isArray(rawChain)) return { isArray: false, len: 0, snaps: [] };
    const len = rawChain.length;
    if (!Number.isSafeInteger(len) || len < 0) return { isArray: false, len: 0, snaps: [] };
    const snapLen = Math.min(len, MAX_DEPTH_BOUND + 2);
    const snaps = new Array(snapLen);
    for (let i = 0; i < snapLen; i += 1) snaps[i] = snapshotTuple(rawChain[i]);
    return { isArray: true, len, snaps };
  } catch {
    return { isArray: false, len: 0, snaps: [] };
  }
}

// chain_sha16 is the only chain-derived value a row may carry: a digest of
// the canonical serialization, never the level hashes themselves. HELD rows
// name first_bad_depth (the proven catch-at-exact-level behavior) and
// nothing else about the chain's content. Noncanonical or invalid-hash chains
// produce chain_sha16=none so HELD rows cannot become digest oracles.
function chainDigest(mat) {
  if (mat.len === 0) return 'none';
  for (const t of mat.snaps) {
    if (!t
      || !isCanonicalDepth(t.depth)
      || typeof t.reported_sha16 !== 'string'
      || typeof t.recomputed_sha16 !== 'string'
      || !HASH_RE.test(t.reported_sha16)
      || !HASH_RE.test(t.recomputed_sha16)) return 'none';
  }
  return sha16(JSON.stringify(mat.snaps.map((t) => [t.depth, t.reported_sha16, t.recomputed_sha16])));
}

function buildResult(inp, verdict, gates, firstBadDepth, mat) {
  const fields = {
    agent: echoField(inp.agent, (v) => AGENT_ID_RE.test(v)),
    action: echoField(inp.action, (v) => Object.hasOwn(ACTIONS, v)),
    max_depth: isCanonicalDepth(inp.max_depth) ? inp.max_depth : 'invalid',
    chain_len: mat.len,
    chain_sha16: chainDigest(mat),
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
  const mat = materializeChain(inp.chain);
  const held = (gate, firstBadDepth) => buildResult(inp, 'CHILD_HELD', [gate], firstBadDepth, mat);

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
  if (!isCanonicalDepth(inp.max_depth)) {
    return held('invalid-max-depth');
  }

  // Rung 5: a chain must exist.
  if (!mat.isArray || mat.len === 0) return held('empty-or-missing-chain');

  // Rung 6: OPERATOR INVARIANT -- topology before hashes, read off the frozen
  // snapshot. The chain must be complete, contiguous, unique, and ordered:
  // position i carries depth i, for every i in 0..max_depth, and nothing
  // beyond. A null snapshot (accessor/hidden/symbol/extra/non-plain tuple) is
  // a topology violation too. The single ordered pass makes truncation,
  // duplication, skips, reorders, and shape smuggling all land here.
  if (mat.len !== inp.max_depth + 1) {
    const firstBad = mat.len < inp.max_depth + 1 ? mat.len : inp.max_depth + 1;
    return held('chain-topology-invalid', firstBad);
  }
  for (let i = 0; i <= inp.max_depth; i += 1) {
    const tuple = mat.snaps[i];
    if (!tuple || !isCanonicalDepth(tuple.depth) || tuple.depth !== i) {
      return held('chain-topology-invalid', i);
    }
    if (!HASH_RE.test(tuple.reported_sha16 ?? '') || !HASH_RE.test(tuple.recomputed_sha16 ?? '')) {
      return held('hash-format-invalid', i);
    }
  }

  // Rung 7: hash agreement at EVERY level -- first divergence is named
  // exactly (the planted-confab-caught-at-exact-level behavior).
  for (let i = 0; i <= inp.max_depth; i += 1) {
    if (mat.snaps[i].reported_sha16 !== mat.snaps[i].recomputed_sha16) {
      return held('hash-divergence', i);
    }
  }

  // Rung 8: consent anchors only at apex-T0. A perfect chain does not
  // confer consent -- it only proves the report is honest.
  if (ACTIONS[inp.action].consent) {
    return buildResult(inp, 'DEFER_TO_OPERATOR', ['consent-anchors-at-apex-T0-only'], null, mat);
  }

  // Rung 9: honest report + free action -> the child may act.
  return buildResult(inp, 'CHILD_MAY_ACT', [], null, mat);
}

export function statusRows() {
  const rows = [
    `NNESTGATEHDR|ok=1|id=${GATE_ID}|component=4|max_depth_bound=${MAX_DEPTH_BOUND}|actions=${Object.keys(ACTIONS).length}|invariant=every-row-executable-0|state=DRAFT_CONTRACT_NO_SPAWN_NO_HARNESS_EDIT|json=0`,
    'NNESTGATELAW|may_act_requires=hash-match-at-every-level-AND-chain-complete-contiguous-unique-ordered+exact-data-snapshots+canonical-depths(no-negative-zero)|hashes=necessary-but-not-sufficient|topology_violations=CHILD_HELD-chain-topology-invalid-with-first_bad_depth|source=OP-JESSE-amendment-2026-06-11|json=0',
    'NNESTGATELADDER|rungs=9|order=dirty-HELD+malformed-agent-HELD+unknown-action-HELD+invalid-max-depth-HELD+empty-chain-HELD+topology-HELD(first_bad_depth)+hash-format-HELD(first_bad_depth)+hash-divergence-HELD(first_bad_depth)+consent-DEFER+honest-free-CHILD_MAY_ACT|json=0',
  ];
  for (const [id, meta] of Object.entries(ACTIONS)) {
    rows.push(`NNESTGATEACTION|id=${id}|consent=${meta.consent}|max_verdict=${meta.consent ? 'DEFER_TO_OPERATOR' : 'CHILD_MAY_ACT'}|json=0`);
  }
  rows.push('NNESTGATELEAK|held_rows_carry=first_bad_depth+chain_sha16-only|chain_sha16=none-for-noncanonical-or-invalid-hash-chains|level_hashes=NEVER-echoed|hostile-proxy=HELD-not-thrown|json=0');
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
  { id: '17', input: { ...BASE, chain: (() => { const c = goodChain(3); c[1] = { ...c[1], extra: 'ignored-field-must-hold' }; return c; })() } },
  { id: '18', input: { ...BASE, chain: (() => { const c = goodChain(3); c[0] = Object.assign(Object.create({ ...c[0] }), {}); return c; })() } },
  // 19-21 (acer hardening 2026-06-11): an accessor tuple that could split
  // check-time from use-time, a non-enumerable own field, and a symbol-keyed
  // field -- all three passed liris's Object.keys check; all three must HELD.
  { id: '19', input: { ...BASE, chain: (() => { const c = goodChain(3); c[1] = Object.defineProperty({ depth: 1, recomputed_sha16: level(1) }, 'reported_sha16', { enumerable: true, get() { return level(1); } }); return c; })() } },
  { id: '20', input: { ...BASE, chain: (() => { const c = goodChain(3); Object.defineProperty(c[2], 'hidden_own_field', { value: 'smuggled', enumerable: false }); return c; })() } },
  { id: '21', input: { ...BASE, chain: (() => { const c = goodChain(3); c[0] = { ...c[0] }; c[0][Symbol.for('nnest-smuggle')] = 'payload'; return c; })() } },
  // 22-24 (liris counter-hardening 2026-06-11): revoked proxies must become
  // HELD rows instead of thrown exceptions, and -0 is not canonical depth 0.
  { id: '22', input: { ...BASE, chain: (() => { const c = goodChain(3); const r = Proxy.revocable(c[1], {}); r.revoke(); c[1] = r.proxy; return c; })() } },
  { id: '23', input: { ...BASE, max_depth: -0, chain: goodChain(0) } },
  { id: '24', input: { ...BASE, chain: (() => { const c = goodChain(3); c[0] = { ...c[0], depth: -0 }; return c; })() } },
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

  // acer hardening: accessor / hidden / symbol tuples are topology violations.
  add('accessor-tuple-held-not-trusted', (() => {
    const c = goodChain(3);
    c[1] = Object.defineProperty({ depth: 1, recomputed_sha16: level(1) }, 'reported_sha16', { enumerable: true, get() { return level(1); } });
    const o = gateChain({ ...BASE, chain: c });
    return o.verdict === 'CHILD_HELD' && o.gate === 'chain-topology-invalid' && o.first_bad_depth === 1;
  })());
  add('non-enumerable-own-field-held', (() => {
    const c = goodChain(3);
    Object.defineProperty(c[2], 'hidden_own_field', { value: 'x', enumerable: false });
    return gateChain({ ...BASE, chain: c }).gate === 'chain-topology-invalid';
  })());
  add('symbol-keyed-field-held', (() => {
    const c = goodChain(3);
    c[0] = { ...c[0] };
    c[0][Symbol.for('nnest-smuggle')] = 'x';
    return gateChain({ ...BASE, chain: c }).gate === 'chain-topology-invalid';
  })());
  add('single-read-digest-matches-verified-content', (() => {
    const c = goodChain(3);
    const o = gateChain({ ...BASE, chain: c });
    const expected = sha16(JSON.stringify(c.map((t) => [t.depth, t.reported_sha16, t.recomputed_sha16])));
    return o.verdict === 'CHILD_MAY_ACT' && o.chain_sha16 === expected;
  })());
  add('revoked-proxy-held-not-thrown', (() => {
    const c = goodChain(3);
    const r = Proxy.revocable(c[1], {});
    r.revoke();
    c[1] = r.proxy;
    const o = gateChain({ ...BASE, chain: c });
    return o.verdict === 'CHILD_HELD' && o.gate === 'chain-topology-invalid' && o.chain_sha16 === 'none';
  })());
  add('negative-zero-depth-held', (() => {
    const c = goodChain(3);
    c[0] = { ...c[0], depth: -0 };
    const o = gateChain({ ...BASE, chain: c });
    return o.verdict === 'CHILD_HELD' && o.gate === 'chain-topology-invalid' && o.chain_sha16 === 'none';
  })());

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
