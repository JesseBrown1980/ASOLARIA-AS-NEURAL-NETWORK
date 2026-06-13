#!/usr/bin/env node
// mlc-line-watcher.mjs — outer-fabric line observer for the pre-existence graph.
//
// This is the first MLC (meta-learning for compositionality) layer on top of the
// pre-existence graph. It watches relationships between potential PID positions:
//   PREX nodes -> MLC lines -> watcher proposal rows
//
// Safety: read-only, HBP-only, no process launch, no engine call, no live Fischer
// scoring, no Mamba/AoT execution. MTP/HRM/GNN/Fischer/Mamba/AoT are represented as
// typed proposal handles only, so this layer can be attacked before any live binding.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { runExporter } from './pre-existence-graph-exporter.mjs';

export const WATCHER_ID = 'mlc-line-watcher.v1';
export const DEFAULT_NODES = 64;
export const DEFAULT_STRIDES = Object.freeze([1, 2, 3]);
export const OUTER_WATCHERS = Object.freeze(['mtp_field_proxy', 'hrm_recurrence', 'gnn_edge']);
export const FISCHER_SCORE_KIND = 'DRAFT_STANDIN_NOT_FISCHER';

export const DEFINITION_ROWS = Object.freeze([
  `MLCHDR|id=${WATCHER_ID}|role=outer-fabric-line-watcher-over-pre-existence-graph|json=0`,
  'MLCWHY|not-a-duplicate-fabric=1|inner_fabric=points-and-potential-PIDs|outer_fabric=relationships-between-points-lines-distances-collisions-and-expansion-proposals|json=0',
  'MLCENGINES|mtp=field-proxy-handle|hrm=recurrence-handle|gnn=edge-handle|fischer=DRAFT_STANDIN_NOT_FISCHER|mamba=sequence-block-handle-only|aot=path-decomposition-handle-only|json=0',
  'MLCSAFETY|read_only=1|hbp_rows_only=1|no_spawn=1|no_execute=1|no_fetch=1|no_write=1|no_mint=1|no_live_fischer=1|process_launch=0|json=0',
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const safe = (s) => String(s == null ? '' : s).replace(/[|\r\n]/g, '_');

function parsePositiveInt(value, fallback) {
  const n = Number.parseInt(String(value), 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export function parseStrides(value = DEFAULT_STRIDES) {
  const raw = Array.isArray(value) ? value : String(value).split(',');
  const seen = new Set();
  for (const item of raw) {
    const n = Number.parseInt(String(item), 10);
    if (Number.isFinite(n) && n > 0) seen.add(Math.min(n, 64));
  }
  return Object.freeze([...seen].sort((a, b) => a - b));
}

export function distanceBucket(distance) {
  if (distance === 0) return 'collision';
  if (distance < 4096) return 'near';
  if (distance < 32768) return 'local';
  if (distance < 131072) return 'regional';
  return 'far';
}

function relationOf(a, b, distance) {
  if (distance === 0 || a.bh_point === b.bh_point) return 'same_point';
  if (a.prime_cube === b.prime_cube && a.cylinder_phase === b.cylinder_phase) return 'same_prime_same_phase';
  if (a.prime_cube === b.prime_cube) return 'same_prime_band';
  if (a.cylinder_phase === b.cylinder_phase) return 'same_cylinder_phase';
  if (a.lane === b.lane) return 'same_lane';
  return 'cross_field';
}

function watcherFor(relation, index) {
  if (relation === 'same_point' || relation === 'same_lane') return 'gnn_edge';
  if (relation === 'same_prime_same_phase' || relation === 'same_prime_band') return 'hrm_recurrence';
  return OUTER_WATCHERS[index % OUTER_WATCHERS.length];
}

function fischerMove(relation, bucket) {
  if (relation === 'same_point') return 'HOLD_COLLISION_REVIEW';
  if (relation === 'same_prime_same_phase') return 'DEEPEN';
  if (bucket === 'far' || relation === 'cross_field') return 'BRIDGE';
  return 'WATCH';
}

function aotStep(move) {
  if (move === 'HOLD_COLLISION_REVIEW') return 'HOLD_FOR_SUPERVISOR';
  if (move === 'DEEPEN') return 'RECURSE_LOCAL';
  if (move === 'BRIDGE') return 'DECOMPOSE_PATH';
  return 'OBSERVE_NEXT';
}

function expansionHint(relation, bucket) {
  if (relation === 'same_point') return 'EXPANSION_PROPOSAL_ONLY_COLLISION';
  if (bucket === 'far') return 'NONE_FAR_LINE';
  return 'NONE';
}

export function lineBetween(a, b, stride, index) {
  const distance = Math.abs(b.bh_index - a.bh_index);
  const bucket = distanceBucket(distance);
  const relation = relationOf(a, b, distance);
  const watcher = watcherFor(relation, index);
  const move = fischerMove(relation, bucket);
  const signature = sha16([
    a.pid, b.pid, a.bh_point, b.bh_point, stride, distance, bucket, relation, watcher, move,
  ].join('|'));
  return {
    from: a,
    to: b,
    stride,
    distance,
    bucket,
    relation,
    watcher,
    fischer_move: move,
    aot_step: aotStep(move),
    sequence_block: `block_${Math.floor(index / 16)}`,
    expansion_hint: expansionHint(relation, bucket),
    signature,
    process_launch: 0,
    triad_state: 'OBSERVED_NOT_ACTUATED',
  };
}

export function runLineWatcher(options = {}) {
  const nodes = parsePositiveInt(options.nodes ?? DEFAULT_NODES, DEFAULT_NODES);
  const prefix = options.prefix || 'MLC';
  const strides = parseStrides(options.strides ?? DEFAULT_STRIDES);
  const prex = runExporter({ nodes, prefix });
  const lines = [];
  for (const stride of strides) {
    for (let i = 0; i + stride < prex.nodes.length; i += 1) {
      lines.push(lineBetween(prex.nodes[i], prex.nodes[i + stride], stride, lines.length));
    }
  }
  const allHeld = lines.every((line) => line.process_launch === 0 && line.triad_state === 'OBSERVED_NOT_ACTUATED');
  return {
    nodes: prex.nodes,
    lines,
    summary: {
      nodes: prex.nodes.length,
      lines: lines.length,
      strides,
      unique_signatures: new Set(lines.map((line) => line.signature)).size,
      expansion_proposals: lines.filter((line) => line.expansion_hint.startsWith('EXPANSION_PROPOSAL_ONLY')).length,
      watcher_counts: OUTER_WATCHERS.map((w) => `${w}:${lines.filter((line) => line.watcher === w).length}`),
      all_observed_no_launch: allHeld,
    },
  };
}

export function emitRows(options = {}) {
  const run = runLineWatcher(options);
  const rows = [...DEFINITION_ROWS];
  for (const line of run.lines) {
    rows.push(
      `MLCLINE|from_pid=${safe(line.from.pid)}|to_pid=${safe(line.to.pid)}|from_bh=${safe(line.from.bh_point)}|to_bh=${safe(line.to.bh_point)}`
      + `|stride=${line.stride}|distance=${line.distance}|bucket=${line.bucket}|relation=${line.relation}`
      + `|watcher=${line.watcher}|inner_watchers=${safe(line.from.watcher_lane)}+${safe(line.to.watcher_lane)}`
      + `|fischer_move=${line.fischer_move}|score_kind=${FISCHER_SCORE_KIND}|aot_step=${line.aot_step}`
      + `|sequence_block=${line.sequence_block}|expansion_hint=${line.expansion_hint}|signature=${line.signature}`
      + `|triad_state=${line.triad_state}|process_launch=${line.process_launch}|json=0`,
    );
  }
  rows.push(
    `MLCSUM|nodes=${run.summary.nodes}|lines=${run.summary.lines}|strides=${run.summary.strides.join(',')}`
    + `|unique_signatures=${run.summary.unique_signatures}|expansion_proposals=${run.summary.expansion_proposals}`
    + `|watcher_counts=${run.summary.watcher_counts.join(',')}|all_observed_no_launch=${run.summary.all_observed_no_launch ? 1 : 0}|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  const a = runLineWatcher({ nodes: 24, strides: [1, 3], prefix: 'MLCSELF' });
  const b = runLineWatcher({ nodes: 24, strides: [1, 3], prefix: 'MLCSELF' });
  add('deterministic-lines', JSON.stringify(a.lines) === JSON.stringify(b.lines));
  add('has-outer-lines', a.lines.length === (23 + 21));
  add('all-observed-no-launch', a.summary.all_observed_no_launch === true);
  add('watchers-are-known-observers', a.lines.every((line) => OUTER_WATCHERS.includes(line.watcher)));
  add('fischer-is-draft-standin-only', a.lines.every((line) => line.process_launch === 0 && FISCHER_SCORE_KIND === 'DRAFT_STANDIN_NOT_FISCHER'));
  add('rows-hbp-only', emitRows({ nodes: 12 }).every((row) => row.endsWith('|json=0') && !row.includes('{"')));
  add('definition-states-outer-not-duplicate', DEFINITION_ROWS[1].includes('not-a-duplicate-fabric=1'));
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
    const strideArg = process.argv.find((a) => a.startsWith('--strides='));
    const nodes = nodeArg ? parsePositiveInt(nodeArg.slice(8), DEFAULT_NODES) : 18;
    const strides = strideArg ? parseStrides(strideArg.slice(10)) : DEFAULT_STRIDES;
    process.stdout.write(emitRows({ nodes, strides }).join('\n') + '\n');
    process.exit(0);
  }
  console.error('usage: mlc-line-watcher.mjs --pilot [--nodes=N] [--strides=1,2,3] | --self-test');
  process.exit(1);
}
