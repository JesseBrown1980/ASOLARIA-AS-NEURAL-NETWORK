#!/usr/bin/env node
// heal-envelope-emitter.mjs — held-safe producer of schema-valid SELF-HEAL envelopes.
//
// The fabric's self-heal is the 10-step heal-pipeline (live schema behcs-256/heal-pipeline-v1
// at :4949/api/heal-pipeline-schema): point -> read -> council-vote -> gnn-rank -> lazy-mint ->
// auth -> cell-cascade -> bilateral-cosign -> usb-sync -> onboarding-update. Until now nothing
// PRODUCED a valid heal envelope. This emitter does — and ONLY that. It is the frozen-slice half
// of SLICE-ENGINE-LAW: it renders a proposal envelope; the heal only ADVANCES when the engine
// (registrar/cosign/feeder daemons) cranks it under operator gate.
//
// SAFETY: read-only, HBP-rows-only, no spawn/exec/write/network/mint, process_launch=0. It does
// NOT perform any heal step, lazy-mint a successor PID, cosign, usb-sync, or update onboarding.
// HARDENED (adversarial-verify wf_f227d321 + re-attack a3de3ec0, 2026-06-13): every interpolated
// field is run through safe() so no value can inject an HBP row; validate/heal/emit are TOTAL —
// they NEVER throw for ANY input (null, BigInt, circular refs, throwing getters), returning the
// invalid/safe result instead; validation is strict (NaN/Infinity, non-ISO ts, non-integer
// step/rank/voted, delimiter-bearing cosigners all rejected); envelope_sha16 covers the FULL
// canonical body so tamper is detectable.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const EMITTER_ID = 'heal-envelope-emitter.v1';
export const SCHEMA_ID = 'behcs-256/heal-pipeline-v1';

// 1=point .. 10=onboarding-update (exact order from the live heal-pipeline-v1 schema).
export const HEAL_STEPS = Object.freeze([
  'point', 'read', 'council-vote', 'gnn-rank', 'lazy-mint',
  'auth', 'cell-cascade', 'bilateral-cosign', 'usb-sync', 'onboarding-update',
]);
export const VERDICTS = Object.freeze(['MISSING', 'DRIFTED', 'OUTDATED', 'FRESH', 'NO-CHANGE']);
export const COSIGNERS = Object.freeze(['jesse', 'rayssa', 'amy', 'felipe', 'dan']);
export const TARGET_PID_RE = /^ACER-PID-H[0-9A-F]{4,16}-A[0-9]{2}-W[0-9]+-P[0-9]{2}-N[0-9]{5}$/;
export const OPERATOR_WITNESS_RE = /^OP-(JESSE|RAYSSA|AMY|FELIPE|DAN)-PID-G0000-A00-W000-P00-N00000$/;
const ISO_UTC_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;

const sha16 = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex').slice(0, 16);
// safe(): strip every HBP delimiter from ANY value. Coerces non-strings; a throwing toString yields '_'.
const safe = (s) => { try { return String(s == null ? '' : s).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const hasDelim = (s) => { try { return /[|\r\n]/.test(String(s)); } catch { return true; } };
const isObj = (x) => x !== null && typeof x === 'object';

function strictStep(raw) {
  if (typeof raw === 'number') return Number.isInteger(raw) ? raw : NaN;
  if (typeof raw === 'string' && /^\d+$/.test(raw)) return Number(raw);
  return NaN;
}

function isCanonicalIso(ts) {
  if (typeof ts !== 'string' || !ISO_UTC_RE.test(ts)) return false;
  const t = Date.parse(ts);
  if (Number.isNaN(t)) return false;
  return new Date(t).toISOString() === ts; // round-trip rejects non-canonical
}

// canonical body serialization — BigInt-safe + cycle-safe + never throws. Covers the WHOLE proposal.
function canonicalBody(env) {
  try {
    const seen = new WeakSet();
    return JSON.stringify({
      step: env.step ?? null,
      target_pid: env.target_pid ?? null,
      operator_witness: env.operator_witness ?? null,
      ts: env.ts ?? null,
      predecessor_pid: env.predecessor_pid ?? null,
      successor_pid: env.successor_pid ?? null,
      council_verdict: env.council_verdict ?? null,
      gnn_rank: env.gnn_rank ?? null,
      cosigners: env.cosigners ?? null,
      cosign_chain_seq: env.cosign_chain_seq ?? null,
    }, (k, v) => {
      if (typeof v === 'bigint') return `bigint:${v}`;
      if (isObj(v)) { if (seen.has(v)) return '[circular]'; seen.add(v); }
      return v;
    });
  } catch {
    return 'UNCANONICALIZABLE';
  }
}

function _validateEnvelope(input) {
  const env = isObj(input) ? input : {};
  const errors = [];
  if (!Number.isInteger(env.step) || env.step < 1 || env.step > 10) errors.push('step-must-be-integer-1-to-10');
  if (typeof env.target_pid !== 'string' || !TARGET_PID_RE.test(env.target_pid)) errors.push('target_pid-must-match-ACER-PID-pattern');
  if (typeof env.operator_witness !== 'string' || !OPERATOR_WITNESS_RE.test(env.operator_witness)) errors.push('operator_witness-must-be-OP-pid');
  if (!isCanonicalIso(env.ts)) errors.push('ts-must-be-canonical-iso-8601-utc');
  if (env.predecessor_pid !== undefined && (typeof env.predecessor_pid !== 'string' || hasDelim(env.predecessor_pid))) errors.push('predecessor_pid-must-be-clean-string');
  if (env.successor_pid !== undefined && (typeof env.successor_pid !== 'string' || hasDelim(env.successor_pid))) errors.push('successor_pid-must-be-clean-string');
  if (env.council_verdict !== undefined) {
    const v = env.council_verdict;
    if (!isObj(v)) errors.push('council_verdict-must-be-object');
    else {
      if (v.verdict !== undefined && !VERDICTS.includes(v.verdict)) errors.push('council_verdict.verdict-must-be-enum');
      if (v.voted !== undefined && !Number.isInteger(v.voted)) errors.push('council_verdict.voted-must-be-int');
      if (v.abstain !== undefined && !Number.isInteger(v.abstain)) errors.push('council_verdict.abstain-must-be-int');
    }
  }
  if (env.gnn_rank !== undefined) {
    const g = env.gnn_rank;
    if (!isObj(g)) errors.push('gnn_rank-must-be-object');
    else {
      if (g.score !== undefined && (typeof g.score !== 'number' || !Number.isFinite(g.score) || g.score < 0 || g.score > 1)) errors.push('gnn_rank.score-must-be-finite-0-to-1');
      if (g.rank !== undefined && !Number.isInteger(g.rank)) errors.push('gnn_rank.rank-must-be-int');
      if (g.mode !== undefined && g.mode !== 'ranking') errors.push('gnn_rank.mode-must-be-ranking');
    }
  }
  if (env.cosigners !== undefined) {
    if (!Array.isArray(env.cosigners) || env.cosigners.length < 5) errors.push('cosigners-must-be-array-min-5');
    else if (!env.cosigners.every((c) => typeof c === 'string' && c.length > 0 && !hasDelim(c))) errors.push('cosigners-must-be-clean-non-empty-strings');
  }
  if (env.cosign_chain_seq !== undefined && !Number.isInteger(env.cosign_chain_seq)) errors.push('cosign_chain_seq-must-be-int');
  return { ok: errors.length === 0, errors };
}

// TOTAL wrapper: never throws (throwing getters / exotic inputs -> invalid result).
export function validateEnvelope(input) {
  try { return _validateEnvelope(input); }
  catch { return { ok: false, errors: ['validation-threw-on-hostile-input'] }; }
}

function _healEnvelope(input) {
  const opts = isObj(input) ? input : {};
  const step = strictStep(opts.step);
  const env = {
    schema: SCHEMA_ID,
    emitter: EMITTER_ID,
    step,
    step_name: (Number.isInteger(step) && step >= 1 && step <= 10) ? HEAL_STEPS[step - 1] : 'INVALID',
    target_pid: opts.target_pid,
    operator_witness: opts.operator_witness,
    ts: opts.ts,
    proposal_only: true,
    process_launch: 0,
    heal_action_performed: 0,
  };
  if (opts.predecessor_pid !== undefined) env.predecessor_pid = opts.predecessor_pid;
  if (opts.successor_pid !== undefined) env.successor_pid = opts.successor_pid;
  if (opts.council_verdict !== undefined) env.council_verdict = opts.council_verdict;
  if (opts.gnn_rank !== undefined) env.gnn_rank = opts.gnn_rank;
  if (opts.cosigners !== undefined) env.cosigners = opts.cosigners;
  if (opts.cosign_chain_seq !== undefined) env.cosign_chain_seq = opts.cosign_chain_seq;
  const validation = validateEnvelope(env);
  env.envelope_sha16 = sha16(canonicalBody(env));
  env.valid = validation.ok;
  env.errors = validation.errors;
  return env;
}

// TOTAL wrapper: never throws — returns a held INVALID envelope on hostile input.
export function healEnvelope(input = {}) {
  try { return _healEnvelope(input); }
  catch {
    return {
      schema: SCHEMA_ID, emitter: EMITTER_ID, step: NaN, step_name: 'INVALID',
      proposal_only: true, process_launch: 0, heal_action_performed: 0,
      valid: false, errors: ['heal-threw-on-hostile-input'], envelope_sha16: '0000000000000000',
    };
  }
}

function _emitRows(input) {
  const env = isObj(input) ? input : {};
  const v = isObj(env.council_verdict) ? env.council_verdict : null;
  const g = isObj(env.gnn_rank) ? env.gnn_rank : null;
  const cos = Array.isArray(env.cosigners) ? env.cosigners : null;
  const errs = Array.isArray(env.errors) ? env.errors : [];
  const valid = env.valid === true;
  const rows = [
    `HEALENVHDR|emitter=${EMITTER_ID}|schema=${SCHEMA_ID}|proposal_only=1|process_launch=0|heal_action_performed=0|json=0`,
    `HEALENV|step=${safe(env.step)}|step_name=${safe(env.step_name)}|target_pid=${safe(env.target_pid)}|operator_witness=${safe(env.operator_witness)}|ts=${safe(env.ts)}|valid=${valid ? 1 : 0}|envelope_sha16=${safe(env.envelope_sha16)}|json=0`,
  ];
  if (v) rows.push(`HEALENVVERDICT|voted=${safe(v.voted ?? '')}|abstain=${safe(v.abstain ?? '')}|verdict=${safe(v.verdict)}|json=0`);
  if (g) rows.push(`HEALENVGNN|score=${safe(g.score ?? '')}|rank=${safe(g.rank ?? '')}|mode=${safe(g.mode)}|ranking-only-per-label-leakage-canon|json=0`);
  if (cos) rows.push(`HEALENVCOSIGN|cosigners=${cos.map(safe).join('+')}|count=${cos.length}|cosign_chain_seq=${safe(env.cosign_chain_seq ?? 'PENDING')}|json=0`);
  if (!valid) rows.push(`HEALENVERRORS|errors=${errs.map(safe).join('+')}|json=0`);
  rows.push(`HEALENVGATE|advances_only_when=registrar+cosign+feeder-daemons-crank-under-operator-gate|this-tool-emits-proposal-never-heals|tag=${valid ? 'PROVEN-VALID-PROPOSAL' : 'INVALID-HELD'}|json=0`);
  return rows;
}

// TOTAL wrapper: never throws — returns a held INVALID row set on hostile input.
export function emitRows(input) {
  try { return _emitRows(input); }
  catch {
    return [
      `HEALENVHDR|emitter=${EMITTER_ID}|schema=${SCHEMA_ID}|proposal_only=1|process_launch=0|heal_action_performed=0|json=0`,
      `HEALENVERRORS|errors=emit-threw-on-hostile-input|json=0`,
      `HEALENVGATE|advances_only_when=registrar+cosign+feeder-daemons-crank-under-operator-gate|this-tool-emits-proposal-never-heals|tag=INVALID-HELD|json=0`,
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (n, ok) => checks.push({ name: n, ok: Boolean(ok) });
  const TS = '2026-06-13T21:30:00.000Z';
  const VALID = { step: 3, target_pid: 'ACER-PID-H3CB8-A00-W1024-P00-N01630', operator_witness: 'OP-JESSE-PID-G0000-A00-W000-P00-N00000', ts: TS };
  const valid = healEnvelope({ ...VALID, council_verdict: { voted: 158, abstain: 93, verdict: 'DRIFTED' }, gnn_rank: { score: 0.42, rank: 1, mode: 'ranking' }, cosigners: COSIGNERS.slice() });
  add('valid-envelope-validates', valid.valid === true && valid.errors.length === 0);
  add('step-name-mapped', valid.step_name === 'council-vote');
  add('proposal-only-no-launch', valid.proposal_only === true && valid.process_launch === 0 && valid.heal_action_performed === 0);
  add('bad-step-rejected', validateEnvelope({ ...VALID, step: 11 }).ok === false && healEnvelope({ ...VALID, step: '3abc' }).valid === false && healEnvelope({ ...VALID, step: '3.9' }).valid === false);
  add('bad-pid-rejected', validateEnvelope({ ...VALID, target_pid: 'not-a-pid' }).ok === false);
  add('bad-verdict-rejected', validateEnvelope({ ...VALID, council_verdict: { verdict: 'MAYBE' } }).ok === false);
  add('non-int-voted-rejected', validateEnvelope({ ...VALID, council_verdict: { voted: 'x', verdict: 'FRESH' } }).ok === false);
  add('gnn-score-NaN-rejected', validateEnvelope({ ...VALID, gnn_rank: { score: NaN, mode: 'ranking' } }).ok === false && validateEnvelope({ ...VALID, gnn_rank: { score: Infinity, mode: 'ranking' } }).ok === false);
  add('gnn-rank-nonint-rejected', validateEnvelope({ ...VALID, gnn_rank: { rank: 1.5, mode: 'ranking' } }).ok === false);
  add('gnn-mode-must-be-ranking', validateEnvelope({ ...VALID, gnn_rank: { mode: 'classify' } }).ok === false);
  add('cosigners-min-5', validateEnvelope({ ...VALID, cosigners: ['jesse', 'rayssa'] }).ok === false);
  add('non-OP-witness-rejected', validateEnvelope({ ...VALID, operator_witness: 'OP-MALLORY-PID-G0000-A00-W000-P00-N00000' }).ok === false);
  add('non-iso-ts-rejected', validateEnvelope({ ...VALID, ts: '2026' }).ok === false && validateEnvelope({ ...VALID, ts: 'June 13 2026' }).ok === false && validateEnvelope({ ...VALID, ts: '2026-06-13' }).ok === false);
  const inj = healEnvelope({ ...VALID, cosigners: ['jesse', 'rayssa', 'amy', 'felipe', 'dan|json=0\nHEALENVGATE|tag=PROVEN-VALID-PROPOSAL'] });
  add('injection-cosigner-rejected', inj.valid === false);
  const injRows = emitRows(inj);
  add('no-row-injection', injRows.every((r) => !/[\r\n]/.test(r)) && injRows.join('\n').split('\n').length === injRows.length);
  const a = healEnvelope({ ...VALID, gnn_rank: { score: 0.1, mode: 'ranking' } });
  const b = healEnvelope({ ...VALID, gnn_rank: { score: 0.9, mode: 'ranking' } });
  add('sha-covers-full-body', a.envelope_sha16 !== b.envelope_sha16);
  // TOTAL: throwing getters, BigInt, circular refs, exotic inputs — NONE may throw.
  let threw = false;
  try {
    validateEnvelope(null); validateEnvelope(undefined); validateEnvelope(42);
    validateEnvelope({ get step() { throw new Error('boom'); } });
    emitRows(null); emitRows(undefined); emitRows({});
    emitRows({ valid: true, get council_verdict() { throw new Error('boom'); } });
    emitRows({ valid: true, cosigners: [{ toString() { throw new Error('boom'); } }] });
    healEnvelope(null); healEnvelope({ step: 3, cosign_chain_seq: 10n });
    const c = {}; c.self = c; healEnvelope({ ...VALID, council_verdict: c });
  } catch { threw = true; }
  add('total-never-throws', threw === false && validateEnvelope(null).ok === false && Array.isArray(emitRows(null)) && healEnvelope({ step: 3, cosign_chain_seq: 10n }).valid === false);
  add('rows-hbp-only', emitRows(valid).every((r) => r.endsWith('|json=0') && !r.includes('{"') && !/[\r\n]/.test(r)));
  add('all-10-heal-steps-named', HEAL_STEPS.length === 10 && HEAL_STEPS[0] === 'point' && HEAL_STEPS[9] === 'onboarding-update');
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const env = healEnvelope({
    step: 3, target_pid: 'ACER-PID-H3CB8-A00-W1024-P00-N01630',
    operator_witness: 'OP-JESSE-PID-G0000-A00-W000-P00-N00000', ts: '2026-06-13T21:30:00.000Z',
    council_verdict: { voted: 158, abstain: 93, verdict: 'DRIFTED' }, cosigners: COSIGNERS.slice(),
  });
  for (const row of emitRows(env)) console.log(row);
}
