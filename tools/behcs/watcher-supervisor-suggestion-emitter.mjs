#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { resolveDashboard } from './dashboard-resolver.mjs';

// COMPONENT|5 seed: watcher -> supervisor suggestion rows, repo-side DRAFT
// ONLY. This emitter builds the deterministic row contract; it never touches
// the live /hbp/supervisors surface, the office-705 feed, the fabric bus, or
// any runtime watcher. Every row it emits carries executable=0 -- a
// suggestion is something a supervisor READS, never something this tool DOES.
// All identity fields are registry-validated, so no caller input can reach a
// row unvalidated (injection-impossible-by-construction, component-1 pattern).

export const EMITTER_ID = 'watcher-supervisor-suggestion-emitter.v1';
export const FRESH_WINDOW_S = 3600;

export const WATCHERS = Object.freeze([
  'WATCH-SELFREFLECT-60S',
  'WATCH-PROF-AUTOCHRONE',
  'WATCH-NNEST-DEPTH-GATE',
]);

export const SUPERVISORS = Object.freeze([
  'SUP-OFFICE-705-COUNCIL',
  'SUP-PROF-AI-MEMORY',
  'SUP-PROF-X-DOUBLE-CRITIC',
  'SUP-HELM-AGT-L3-H8EF7',
]);

// requires_live_fabric=1 actions can NEVER be DRAFT_SUGGESTION_READY -- they
// demote to DEFER_TO_OPERATOR no matter how clean the rest of the input is.
export const ACTIONS = Object.freeze({
  'observe-again': { requires_live_fabric: 0 },
  'read-route-hbp': { requires_live_fabric: 0 },
  'draft-correction-row': { requires_live_fabric: 0 },
  'dispatch-agent': { requires_live_fabric: 1 },
  'restart-daemon': { requires_live_fabric: 1 },
  'request-cosign-mint': { requires_live_fabric: 1 },
});

export const REASONS = Object.freeze([
  'loop-stalled',
  'novelty-detected',
  'correction-needed',
  'receipt-drift',
  'heartbeat-ok',
]);

// Confidence is an integer percent 0-100. Bands are closed at the edges:
// 0-33 low, 34-66 medium, 67-100 high.
export const CONFIDENCE_BANDS = Object.freeze([
  Object.freeze({ band: 'low', lo: 0, hi: 33 }),
  Object.freeze({ band: 'medium', lo: 34, hi: 66 }),
  Object.freeze({ band: 'high', lo: 67, hi: 100 }),
]);

const TS_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,3}))?Z$/;
const DIRTY_RE = /[|\r\n]/;

function sha16(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

// Strict UTC component round-trip, same discipline the component-1 resolver
// uses after the liris calendar-normalization catch (2026-06-31 never parses).
function parseStrictIso(value) {
  const match = TS_RE.exec(String(value ?? ''));
  if (!match) return { ok: false, ms: NaN };
  const [, year, month, day, hour, minute, second, fraction = '0'] = match;
  const expected = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    ms: Number(fraction.padEnd(3, '0')),
  };
  const ms = Date.UTC(expected.year, expected.month - 1, expected.day, expected.hour, expected.minute, expected.second, expected.ms);
  const parsed = new Date(ms);
  const ok = parsed.getUTCFullYear() === expected.year
    && parsed.getUTCMonth() + 1 === expected.month
    && parsed.getUTCDate() === expected.day
    && parsed.getUTCHours() === expected.hour
    && parsed.getUTCMinutes() === expected.minute
    && parsed.getUTCSeconds() === expected.second
    && parsed.getUTCMilliseconds() === expected.ms;
  return { ok, ms };
}

function cleanString(value) {
  return typeof value === 'string' && !DIRTY_RE.test(value) ? value : null;
}

function safeTimestampField(value) {
  if (value == null) return 'none';
  const clean = cleanString(value);
  if (clean == null) return 'invalid';
  return parseStrictIso(clean).ok ? clean : 'invalid';
}

// Identity fields appearing in a row are either the registry-validated token
// or the literal 'invalid' -- raw caller input never reaches a row.
function fieldOrInvalid(value, registry) {
  const clean = cleanString(value);
  if (clean == null) return 'invalid';
  const known = Array.isArray(registry) ? registry.includes(clean) : Object.hasOwn(registry, clean);
  return known ? clean : 'invalid';
}

function buildResult(inp, verdict, gates, route, confidence, band) {
  const evidence = cleanString(inp.evidence);
  const fields = {
    watcher: fieldOrInvalid(inp.watcher, WATCHERS),
    supervisor: fieldOrInvalid(inp.supervisor, SUPERVISORS),
    action: fieldOrInvalid(inp.action, ACTIONS),
    reason: fieldOrInvalid(inp.reason, REASONS),
    route: route ?? 'none',
    evidence_sha16: evidence ? sha16(evidence) : 'none',
    confidence: confidence ?? 'invalid',
    band: band ?? 'none',
    ts: safeTimestampField(inp.ts),
    verdict,
    gates: gates.length ? gates.join('+') : 'none',
  };
  const row = [
    'WATCHSUGGEST',
    `watcher=${fields.watcher}`,
    `supervisor=${fields.supervisor}`,
    `action=${fields.action}`,
    `reason=${fields.reason}`,
    `route=${fields.route}`,
    `evidence_sha16=${fields.evidence_sha16}`,
    `confidence=${fields.confidence}`,
    `band=${fields.band}`,
    `ts=${fields.ts}`,
    `verdict=${fields.verdict}`,
    `gates=${fields.gates}`,
    'executable=0',
    'json=0',
  ].join('|');
  return { ...fields, ok: verdict !== 'DRAFT_SUGGESTION_BLOCKED', executable: 0, row };
}

export function emitSuggestion(input, nowIso) {
  const inp = input ?? {};
  const blocked = (gate) => buildResult(inp, 'DRAFT_SUGGESTION_BLOCKED', [gate], null, null, null);

  // Rung 1: dirty input never reaches a row.
  const STRING_FIELDS = ['watcher', 'supervisor', 'action', 'reason', 'evidence', 'pid', 'device', 'ts'];
  for (const field of STRING_FIELDS) {
    const value = inp[field];
    if (value != null && (typeof value !== 'string' || DIRTY_RE.test(value))) {
      return blocked(`dirty-${field}`);
    }
  }
  if (typeof nowIso !== 'string' || DIRTY_RE.test(nowIso)) return blocked('dirty-now');

  // Rungs 2-5: every identity must be in its registry (spoof-proof).
  if (!WATCHERS.includes(inp.watcher ?? '')) return blocked('unknown-watcher');
  if (!SUPERVISORS.includes(inp.supervisor ?? '')) return blocked('unknown-supervisor');
  if (!Object.hasOwn(ACTIONS, inp.action ?? '')) return blocked('unknown-action');
  if (!REASONS.includes(inp.reason ?? '')) return blocked('unknown-reason');

  // Rung 6: a suggestion without evidence is an opinion, not a suggestion.
  if (!cleanString(inp.evidence)) return blocked('missing-evidence');

  // Rung 7: confidence must be an integer percent 0-100.
  const conf = inp.confidence;
  if (!Number.isInteger(conf) || conf < 0 || conf > 100) return blocked('invalid-confidence');
  const band = CONFIDENCE_BANDS.find((b) => conf >= b.lo && conf <= b.hi).band;

  // Rung 8: observation timestamp must be strict, not future, not stale.
  const parsedNow = parseStrictIso(nowIso);
  if (!parsedNow.ok) return blocked('malformed-now');
  const parsedTs = parseStrictIso(inp.ts);
  if (!parsedTs.ok) return blocked('malformed-ts');
  if (parsedTs.ms > parsedNow.ms) return blocked('ts-in-future');
  if ((parsedNow.ms - parsedTs.ms) / 1000 > FRESH_WINDOW_S) return blocked('stale-ts');

  // Rung 9: live-fabric actions are suggestions TO THE OPERATOR, full stop.
  // They do not carry tight routes; the operator must choose the route after
  // accepting the gated follow-up.
  if (ACTIONS[inp.action].requires_live_fabric) {
    return buildResult(inp, 'DEFER_TO_OPERATOR', ['live-fabric-action-requires-operator'], null, conf, band);
  }

  // Route attachment: component-1 resolver as a pure local import. The
  // supervisor reading this draft gets the tightest dashboard route the
  // evidence supports; no tuple -> no route, never a guessed one.
  let route = null;
  if (inp.pid != null && inp.device != null) {
    route = resolveDashboard(inp.pid, inp.device, inp.ts, nowIso).route;
  }

  // Rung 10: clean draft suggestion, still executable=0 by contract.
  return buildResult(inp, 'DRAFT_SUGGESTION_READY', [], route, conf, band);
}

export function statusRows() {
  const rows = [
    `WSUGHDR|ok=1|id=${EMITTER_ID}|component=5|watchers=${WATCHERS.length}|supervisors=${SUPERVISORS.length}|actions=${Object.keys(ACTIONS).length}|reasons=${REASONS.length}|invariant=every-row-executable-0|state=DRAFT_CONTRACT_NO_LIVE_SURFACE|json=0`,
  ];
  for (const w of WATCHERS) rows.push(`WSUGWATCHER|id=${w}|json=0`);
  for (const s of SUPERVISORS) rows.push(`WSUGSUPERVISOR|id=${s}|json=0`);
  for (const [id, meta] of Object.entries(ACTIONS)) {
    rows.push(`WSUGACTION|id=${id}|requires_live_fabric=${meta.requires_live_fabric}|max_verdict=${meta.requires_live_fabric ? 'DEFER_TO_OPERATOR' : 'DRAFT_SUGGESTION_READY'}|json=0`);
  }
  for (const band of CONFIDENCE_BANDS) {
    rows.push(`WSUGBAND|band=${band.band}|lo=${band.lo}|hi=${band.hi}|json=0`);
  }
  rows.push('WSUGSAFETY|mutates=0|pure_function=1|no_live_post=1|no_fabric_call=1|no_process_launch=1|mints=0|usb_writes=0|engine_edits=0|json=0');
  rows.push('WSUGEND|state=COMPONENT_5_SEED_DRAFT_CONTRACT|json=0');
  return rows;
}

// Parity baseline: fixed clock, fixed cases; rows byte-identical everywhere.
const PARITY_NOW = '2026-06-11T12:00:00.000Z';
const FRESH_TS = '2026-06-11T11:59:00.000Z';
const BASE = Object.freeze({
  watcher: 'WATCH-SELFREFLECT-60S',
  supervisor: 'SUP-OFFICE-705-COUNCIL',
  action: 'draft-correction-row',
  reason: 'correction-needed',
  evidence: 'loop_pending=17-held-stale-envelopes',
  confidence: 80,
  ts: FRESH_TS,
});
const PARITY_CASES = Object.freeze([
  { id: '01', input: { ...BASE, pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer' } },
  { id: '02', input: { ...BASE, action: 'dispatch-agent', confidence: 90 } },
  { id: '03', input: { ...BASE, action: 'restart-daemon' } },
  { id: '04', input: { ...BASE, action: 'request-cosign-mint' } },
  { id: '05', input: { ...BASE, watcher: 'WATCH-EVIL' } },
  { id: '06', input: { ...BASE, supervisor: 'SUP-EVIL-SPOOF' } },
  { id: '07', input: { ...BASE, action: 'rm-rf-everything' } },
  { id: '08', input: { ...BASE, reason: 'because-i-said-so' } },
  { id: '09', input: { ...BASE, evidence: '' } },
  { id: '10', input: { ...BASE, watcher: 'WATCH-SELFREFLECT-60S|json=1' } },
  { id: '11', input: { ...BASE, confidence: 33 } },
  { id: '12', input: { ...BASE, confidence: 34 } },
  { id: '13', input: { ...BASE, confidence: 66 } },
  { id: '14', input: { ...BASE, confidence: 67 } },
  { id: '15', input: { ...BASE, confidence: 101 } },
  { id: '16', input: { ...BASE, confidence: 66.5 } },
  { id: '17', input: { ...BASE, ts: '2026-06-11T09:00:00.000Z' } },
  { id: '18', input: { ...BASE, ts: '2026-06-31T11:59:00.000Z' } },
  { id: '19', input: { ...BASE, ts: '2026-06-11T13:00:00.000Z' } },
  { id: '20', input: { ...BASE, pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'liris' } },
  { id: '21', input: { ...BASE } },
  { id: '22', input: { ...BASE, ts: 'C:\\Users\\rayss\\secret' } },
  { id: '23', input: { ...BASE, action: 'dispatch-agent', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer' } },
]);

export function emitParityRows() {
  const rows = [
    `WSUGPARITYHDR|component=5|cases=${PARITY_CASES.length}|fixed_now=${PARITY_NOW}|rule=rows-byte-identical-on-every-machine|json=0`,
  ];
  const outputs = [];
  for (const probe of PARITY_CASES) {
    const out = emitSuggestion(probe.input, PARITY_NOW);
    outputs.push(out.row);
    rows.push(`WSUGPARITY|case=${probe.id}|${out.row.slice('WATCHSUGGEST|'.length)}`);
  }
  rows.push(
    `WSUGPARITYFTR|cases=${PARITY_CASES.length}|bundle_sha16=${sha16(outputs.join('\n'))}|exit=byte-match-when-regenerated-file-equals-sealed-baseline|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });

  const ready = emitSuggestion({ ...BASE }, PARITY_NOW);
  add('clean-draft-ready', ready.verdict === 'DRAFT_SUGGESTION_READY' && ready.executable === 0);
  add('live-action-defers', emitSuggestion({ ...BASE, action: 'dispatch-agent' }, PARITY_NOW).verdict === 'DEFER_TO_OPERATOR');
  add('spoofed-supervisor-blocked', emitSuggestion({ ...BASE, supervisor: 'SUP-EVIL' }, PARITY_NOW).verdict === 'DRAFT_SUGGESTION_BLOCKED');
  add('dirty-input-blocked-and-not-echoed', emitSuggestion({ ...BASE, watcher: 'X|Y' }, PARITY_NOW).watcher === 'invalid');
  add('missing-evidence-blocked', emitSuggestion({ ...BASE, evidence: null }, PARITY_NOW).gates === 'missing-evidence');
  add('stale-ts-blocked', emitSuggestion({ ...BASE, ts: '2026-06-11T09:00:00.000Z' }, PARITY_NOW).gates === 'stale-ts');
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
    console.error('usage: watcher-supervisor-suggestion-emitter.mjs --status | --self-test | --parity');
    process.exit(1);
  }
}
