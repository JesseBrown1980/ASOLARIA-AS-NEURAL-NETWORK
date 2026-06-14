#!/usr/bin/env node
// mlc-engine-wiring-increment.mjs - C036 increment-1 descriptor wiring matrix.
//
// This is not live engine launch. It reads the existing MLC line watcher output and
// maps each observed line into the engine lanes that will eventually be cranked:
// MTP, HRM, GNN, Fischer draft-standin, Mamba sequence handle, and AoT path handle.
//
// Safety: HBP rows only, no spawn, no fetch, no file write, no mint, no process launch.
// Live MTP/HRM/Fischer/Mamba/AoT remain behind the fabric verdict/daemon contract.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  FISCHER_SCORE_KIND,
  WATCHER_ID,
  runLineWatcher,
} from './mlc-line-watcher.mjs';

export const WIRING_ID = 'mlc-engine-wiring-increment.v1';
export { FISCHER_SCORE_KIND };
export const DEFAULT_WIRING_NODES = 18;
export const DEFAULT_WIRING_STRIDES = Object.freeze([1, 2]);
export const LIVE_GATE = 'DEFER_TO_FABRIC_VERDICT_AND_DAEMON_CONTRACT';

export const ENGINE_LANES = Object.freeze([
  Object.freeze({
    id: 'mtp',
    engine: 'MTP_FIELD_PROXY',
    source: 'watcher=mtp_field_proxy',
    state: 'DESCRIPTOR_READY_NO_LAUNCH',
  }),
  Object.freeze({
    id: 'hrm',
    engine: 'HRM_RECURRENCE_ROUTER',
    source: 'watcher=hrm_recurrence',
    state: 'DESCRIPTOR_READY_NO_LAUNCH',
  }),
  Object.freeze({
    id: 'gnn',
    engine: 'GNN_EDGE_HANDLE',
    source: 'watcher=gnn_edge',
    state: 'DESCRIPTOR_READY_NO_LAUNCH',
  }),
  Object.freeze({
    id: 'fischer',
    engine: 'FISCHER_DRAFT_STANDIN_SCORER',
    source: 'fischer_move+score_kind',
    state: 'DRAFT_STANDIN_ONLY_NO_LIVE_4794',
  }),
  Object.freeze({
    id: 'mamba',
    engine: 'MAMBA_SEQUENCE_BLOCK_HANDLE',
    source: 'sequence_block',
    state: 'HANDLE_ONLY_NO_EXECUTE',
  }),
  Object.freeze({
    id: 'aot',
    engine: 'AOT_PATH_DECOMPOSITION_HANDLE',
    source: 'aot_step',
    state: 'HANDLE_ONLY_NO_EXECUTE',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => { try { return String(x == null ? '' : x).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

function laneForWatcher(watcher) {
  if (watcher === 'mtp_field_proxy') return 'mtp';
  if (watcher === 'hrm_recurrence') return 'hrm';
  if (watcher === 'gnn_edge') return 'gnn';
  return 'gnn';
}

function lineSignature(line) {
  const sig = prop(line, 'signature', '');
  if (/^[a-f0-9]{16}$/i.test(String(sig))) return String(sig).toLowerCase();
  return sha16([
    prop(line, 'watcher', ''),
    prop(line, 'relation', ''),
    prop(line, 'fischer_move', ''),
    prop(line, 'aot_step', ''),
    prop(line, 'sequence_block', ''),
  ].join('|'));
}

export function wireLine(input) {
  try {
    const line = isObj(input) ? input : {};
    const from = prop(line, 'from', {});
    const to = prop(line, 'to', {});
    const watcher = safe(prop(line, 'watcher', 'gnn_edge'));
    const primary_engine = laneForWatcher(watcher);
    const lanes = [
      primary_engine,
      'fischer',
      'mamba',
      'aot',
    ];
    return {
      signature: lineSignature(line),
      from_pid: safe(prop(from, 'pid', '')),
      to_pid: safe(prop(to, 'pid', '')),
      relation: safe(prop(line, 'relation', 'unknown')),
      bucket: safe(prop(line, 'bucket', 'unknown')),
      watcher,
      primary_engine,
      fischer_move: safe(prop(line, 'fischer_move', 'WATCH')),
      fischer_score_kind: FISCHER_SCORE_KIND,
      mamba_sequence_block: safe(prop(line, 'sequence_block', 'block_unknown')),
      aot_step: safe(prop(line, 'aot_step', 'OBSERVE_NEXT')),
      lanes,
      live_launch_gate: LIVE_GATE,
      process_launch: 0,
    };
  } catch {
    return {
      signature: sha16('invalid-line'),
      from_pid: '',
      to_pid: '',
      relation: 'invalid',
      bucket: 'invalid',
      watcher: 'invalid',
      primary_engine: 'gnn',
      fischer_move: 'WATCH',
      fischer_score_kind: FISCHER_SCORE_KIND,
      mamba_sequence_block: 'block_unknown',
      aot_step: 'OBSERVE_NEXT',
      lanes: ['gnn', 'fischer', 'mamba', 'aot'],
      live_launch_gate: LIVE_GATE,
      process_launch: 0,
    };
  }
}

export function buildWiring(input = {}) {
  const opts = isObj(input) ? input : {};
  let run;
  let source_error = '';
  try {
    run = runLineWatcher({
      nodes: prop(opts, 'nodes', DEFAULT_WIRING_NODES),
      strides: prop(opts, 'strides', DEFAULT_WIRING_STRIDES),
      prefix: prop(opts, 'prefix', 'MLCWIRE'),
    });
  } catch {
    source_error = 'mlc-line-watcher-threw';
    run = { lines: [], summary: { nodes: 0, lines: 0, strides: [] } };
  }
  const entries = (Array.isArray(run.lines) ? run.lines : []).map(wireLine);
  const engine_counts = Object.fromEntries(ENGINE_LANES.map((lane) => [lane.id, 0]));
  for (const entry of entries) {
    for (const lane of entry.lanes) engine_counts[lane] = (engine_counts[lane] || 0) + 1;
  }
  const all_no_launch = entries.every((entry) => entry.process_launch === 0 && entry.live_launch_gate === LIVE_GATE);
  return {
    tool: WIRING_ID,
    source_watcher: WATCHER_ID,
    fabric_request_id: safe(prop(opts, 'fabric_request_id', '')),
    source_error,
    entries,
    summary: {
      nodes: prop(run.summary, 'nodes', 0),
      lines: prop(run.summary, 'lines', entries.length),
      entries: entries.length,
      engine_counts,
      all_no_launch,
      fischer_score_kind: FISCHER_SCORE_KIND,
      c036_status: 'OPEN_LIVE_ENGINE_NOT_LAUNCHED',
    },
  };
}

export function emitRows(input = {}) {
  try {
    const opts = isObj(input) ? input : {};
    const capN = Number.parseInt(String(prop(opts, 'cap', 12)), 10);
    const cap = Math.max(0, Math.min(Number.isFinite(capN) ? capN : 12, 64)); // cap=0 means 0 rows, not the 12 default
    const built = buildWiring(opts);
    const counts = built.summary.engine_counts;
    const rows = [
      `MLCEWIREHDR|tool=${WIRING_ID}|source=${WATCHER_ID}|stage=C036-increment-1-descriptor-matrix|fabric_request_id=${safe(built.fabric_request_id)}|read_only=1|hbp_rows_only=1|process_launch=0|no_spawn=1|no_fetch=1|no_write=1|no_mint=1|no_live_engine=1|json=0`,
      `MLCEWIRELANES|mtp=${safe(counts.mtp)}|hrm=${safe(counts.hrm)}|gnn=${safe(counts.gnn)}|fischer=${safe(counts.fischer)}|mamba=${safe(counts.mamba)}|aot=${safe(counts.aot)}|fischer_score_kind=${FISCHER_SCORE_KIND}|primary_partition=mtp_hrm_gnn-sum-eq-entries|overlay_lanes=fischer_mamba_aot-per-line-overlay-count-eq-entries-not-signal|json=0`,
      `MLCEWIREGATE|C036_status=OPEN_LIVE_ENGINE_NOT_LAUNCHED|live_launch=${LIVE_GATE}|reason=descriptor-matrix-only-until-fabric-ranks-daemon-contract|process_launch=0|json=0`,
    ];
    for (const entry of built.entries.slice(0, cap)) {
      rows.push(
        `MLCEWIRE|signature=${safe(entry.signature)}|from_pid=${safe(entry.from_pid)}|to_pid=${safe(entry.to_pid)}`
        + `|relation=${safe(entry.relation)}|bucket=${safe(entry.bucket)}|watcher=${safe(entry.watcher)}`
        + `|primary_engine=${safe(entry.primary_engine)}|lanes=${entry.lanes.map(safe).join('+')}`
        + `|fischer_move=${safe(entry.fischer_move)}|fischer_score_kind=${safe(entry.fischer_score_kind)}`
        + `|mamba_sequence_block=${safe(entry.mamba_sequence_block)}|aot_step=${safe(entry.aot_step)}`
        + `|live_launch_gate=${safe(entry.live_launch_gate)}|process_launch=${safe(entry.process_launch)}|json=0`,
      );
    }
    rows.push(
      `MLCEWIRESUM|nodes=${safe(built.summary.nodes)}|lines=${safe(built.summary.lines)}|entries=${safe(built.summary.entries)}`
      + `|emitted=${Math.min(cap, built.entries.length)}|all_no_launch=${built.summary.all_no_launch ? 1 : 0}`
      + `|source_error=${safe(built.source_error)}|json=0`,
    );
    return rows;
  } catch {
    return [
      `MLCEWIREHDR|tool=${WIRING_ID}|source=${WATCHER_ID}|stage=C036-increment-1-descriptor-matrix|read_only=1|hbp_rows_only=1|process_launch=0|no_live_engine=1|json=0`,
      `MLCEWIREGATE|C036_status=OPEN_LIVE_ENGINE_NOT_LAUNCHED|live_launch=${LIVE_GATE}|reason=emit-threw-held-invalid|process_launch=0|json=0`,
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const a = buildWiring({ nodes: 18, strides: [1, 2], prefix: 'WIRESELF', fabric_request_id: 'council-q-test' });
  const b = buildWiring({ nodes: 18, strides: [1, 2], prefix: 'WIRESELF', fabric_request_id: 'council-q-test' });
  add('deterministic-wiring', JSON.stringify(a.entries) === JSON.stringify(b.entries));
  add('entries-produced-from-lines', a.summary.entries === 33 && a.summary.lines === 33);
  add('all-lanes-present', ENGINE_LANES.every((lane) => Number.isInteger(a.summary.engine_counts[lane.id])));
  add('all-no-launch', a.summary.all_no_launch === true && a.entries.every((entry) => entry.process_launch === 0));
  add('fischer-stays-draft-standin', a.summary.fischer_score_kind === 'DRAFT_STANDIN_NOT_FISCHER' && a.entries.every((entry) => entry.fischer_score_kind === FISCHER_SCORE_KIND));
  add('c036-remains-open', a.summary.c036_status === 'OPEN_LIVE_ENGINE_NOT_LAUNCHED');
  add('rows-hbp-only', emitRows({ nodes: 12, cap: 6 }).every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  let threw = false;
  try { wireLine(null); buildWiring(null); emitRows(null); wireLine({ get from() { throw new Error('boom'); } }); } catch { threw = true; }
  add('total-never-throws', threw === false);
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const cmd = process.argv[2] || '--pilot';
  if (cmd === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  if (cmd === '--pilot') {
    const nodeArg = process.argv.find((a) => a.startsWith('--nodes='));
    const capArg = process.argv.find((a) => a.startsWith('--cap='));
    const fabricArg = process.argv.find((a) => a.startsWith('--fabric-request-id='));
    const nodes = nodeArg ? Number.parseInt(nodeArg.slice(8), 10) : DEFAULT_WIRING_NODES;
    const cap = capArg ? Number.parseInt(capArg.slice(6), 10) : 12;
    const fabric_request_id = fabricArg ? fabricArg.slice(20) : '';
    process.stdout.write(emitRows({ nodes, cap, fabric_request_id }).join('\n') + '\n');
    process.exit(0);
  }
  console.error('usage: mlc-engine-wiring-increment.mjs --pilot [--nodes=N] [--cap=N] [--fabric-request-id=ID] | --self-test');
  process.exit(1);
}
