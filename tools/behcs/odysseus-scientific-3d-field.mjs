#!/usr/bin/env node
// odysseus-scientific-3d-field.mjs - cross-checkable scientific 3D PID field.
//
// Descriptor-only. This binds the Odysseus/MTP control surface to the real
// pre-existence coordinate graph for a scientific viewer: sector/lane/glyph,
// bh_index, mod-6 cylinders, watcher lanes, prime-cube anchors, and host PID
// descriptors. It does not claim live nanosecond telemetry, spawn processes,
// open a browser, or run the phone UI.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildUpgrade } from './eight-byte-host-process-upgrade.mjs';
import { buildSurface } from './odysseus-mtp-control-surface.mjs';
import { PRIME_CUBE_PRIMES, PRIME_CUBES, runExporter } from './pre-existence-graph-exporter.mjs';

export const FIELD_ID = 'odysseus-scientific-3d-field.v1';
export const DEFAULT_FIELD_NODES = 512;
export const DEFAULT_EVENT_FRAMES = 96;
export const VIEWER_REPORT = 'reports/odysseus-mtp-scientific-3d.html';

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

function toCount(value, fallback, min = 1, max = 4096) {
  const n = Number.parseInt(String(value ?? fallback), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function coordinateRow(node) {
  return Object.freeze({
    name: safe(node.name),
    pid: safe(node.pid),
    sector: node.sector,
    lane: node.lane,
    glyph: node.glyph_binding,
    bh_index: node.bh_index,
    cylinder_phase: node.cylinder_phase,
    cylinder_ring: node.cylinder_ring,
    prime_band: node.prime_band,
    prime_cube: node.prime_cube,
    watcher_lane: safe(node.watcher_lane),
    triad_state: safe(node.triad_state),
    process_launch: 0,
  });
}

function hostRow(host) {
  return Object.freeze({
    name: safe(host.name),
    pid: safe(host.pid),
    sha16: safe(host.sha16),
    agent_type: safe(host.agent_type),
    sector: host.sector,
    lane: host.lane,
    glyph: host.glyph,
    bh_index: host.bh_index,
    cylinder_phase: host.cylinder_phase,
    cylinder_ring: host.cylinder_ring,
    watcher: safe(host.watcher),
    shape: safe(host.yin_yang_shape),
    host_handle_bytes: host.host_handle_bytes,
    node_per_agent: 0,
    process_launch: 0,
  });
}

function eventFrame(node, previous, index) {
  const current = coordinateRow(node);
  const prior = previous ? coordinateRow(previous) : current;
  const delta = Math.abs(current.bh_index - prior.bh_index);
  return Object.freeze({
    index,
    event_id: sha16([FIELD_ID, current.pid, index].join('|')),
    kind: 'COORDINATE_REPLAY_NOT_LIVE_TELEMETRY',
    pid: current.pid,
    bh_index: current.bh_index,
    cylinder_phase: current.cylinder_phase,
    watcher_lane: current.watcher_lane,
    delta_bh_index: delta,
    triad_state: current.triad_state,
    process_launch: 0,
    live_pid_telemetry: 0,
  });
}

export function buildScientificField(options = {}) {
  const nodes = toCount(prop(options, 'nodes'), DEFAULT_FIELD_NODES, 6, 4096);
  const frames = toCount(prop(options, 'frames'), DEFAULT_EVENT_FRAMES, 1, nodes);
  const prefix = safe(prop(options, 'prefix') || 'SCI-PID');
  const prex = runExporter({ nodes, prefix });
  const upgrade = buildUpgrade();
  const surface = buildSurface();
  const coordinates = prex.nodes.map(coordinateRow);
  const hosts = upgrade.hosts.map(hostRow);
  const replay = coordinates.slice(0, frames).map((node, i) => eventFrame(node, coordinates[i - 1], i));
  const phases = new Set(coordinates.map((n) => n.cylinder_phase));
  const watchers = new Set(coordinates.map((n) => n.watcher_lane));
  return Object.freeze({
    tool: FIELD_ID,
    viewer_report: VIEWER_REPORT,
    coordinate_contract: Object.freeze({
      source: 'tools/behcs/pre-existence-graph-exporter.mjs',
      formula: 'bh_index=sector*3072+lane*1024+glyph',
      cylinder_phase: 'bh_index-mod-6',
      cylinder_ring: 'floor-bh_index-div-6',
      distance: 'abs-delta-bh_index',
      state: 'POTENTIAL-coordinate-field-not-live-process',
    }),
    prime_cube_primes: PRIME_CUBE_PRIMES,
    prime_cubes: PRIME_CUBES,
    coordinates: Object.freeze(coordinates),
    hosts: Object.freeze(hosts),
    replay: Object.freeze(replay),
    summary: Object.freeze({
      nodes: coordinates.length,
      hosts: hosts.length,
      phases: phases.size,
      watchers: watchers.size,
      lane_counts: prex.summary.lane_counts.join(','),
      mtp_descriptor_backed: surface.summary.mtp_descriptor_backed,
      process_launch: 0,
      live_pid_telemetry: false,
      coordinate_replay_only: true,
    }),
  });
}

export function emitRows(options = {}) {
  try {
    const field = buildScientificField(options);
    const rows = [
      `ODYSCI3DHDR|tool=${FIELD_ID}|viewer=${VIEWER_REPORT}|nodes=${field.summary.nodes}|hosts=${field.summary.hosts}|phases=${field.summary.phases}|watchers=${field.summary.watchers}|mtp_descriptor_backed=${field.summary.mtp_descriptor_backed}|process_launch=0|live_pid_telemetry=0|json=0`,
      `ODYSCI3DMATH|formula=${field.coordinate_contract.formula}|cylinder_phase=${field.coordinate_contract.cylinder_phase}|cylinder_ring=${field.coordinate_contract.cylinder_ring}|distance=${field.coordinate_contract.distance}|state=${field.coordinate_contract.state}|json=0`,
      `ODYSCI3DPRIMES|prime_cube_primes=${field.prime_cube_primes.join('+')}|prime_cubes=${field.prime_cubes.join('+')}|json=0`,
    ];
    for (const host of field.hosts) {
      rows.push(`ODYSCI3DHOST|name=${host.name}|agent_type=${host.agent_type}|pid_sha16=${host.sha16}|sector=${host.sector}|lane=${host.lane}|glyph=${host.glyph}|bh_index=${host.bh_index}|phase=${host.cylinder_phase}|ring=${host.cylinder_ring}|watcher=${host.watcher}|shape=${host.shape}|host_handle_bytes=${host.host_handle_bytes}|node_per_agent=0|process_launch=0|json=0`);
    }
    for (const node of field.coordinates.slice(0, 18)) {
      rows.push(`ODYSCI3DCOORD|name=${node.name}|pid_sha16=${sha16(node.pid)}|sector=${node.sector}|lane=${node.lane}|glyph=${node.glyph}|bh_index=${node.bh_index}|phase=${node.cylinder_phase}|ring=${node.cylinder_ring}|prime_band=${node.prime_band}|prime_cube=${node.prime_cube}|watcher=${node.watcher_lane}|triad_state=${node.triad_state}|process_launch=0|json=0`);
    }
    for (const event of field.replay.slice(0, 12)) {
      rows.push(`ODYSCI3DEVENT|index=${event.index}|event_id=${event.event_id}|kind=${event.kind}|pid_sha16=${sha16(event.pid)}|bh_index=${event.bh_index}|phase=${event.cylinder_phase}|watcher=${event.watcher_lane}|delta_bh_index=${event.delta_bh_index}|triad_state=${event.triad_state}|process_launch=0|live_pid_telemetry=0|json=0`);
    }
    rows.push('ODYSCI3DGATE|rule=scientific-viewer-plots-real-coordinate-field-and-deterministic-replay-only-not-live-nanosecond-PID-telemetry|provider_terms_apply=1|process_launch=0|device_effect=0|cutover=0|json=0');
    return rows;
  } catch {
    return [
      `ODYSCI3DHDR|tool=${FIELD_ID}|viewer=${VIEWER_REPORT}|nodes=0|hosts=0|phases=0|watchers=0|process_launch=0|live_pid_telemetry=0|json=0`,
      'ODYSCI3DGATE|rule=emit-threw-held-invalid|provider_terms_apply=1|process_launch=0|device_effect=0|cutover=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const field = buildScientificField();
  add('uses-real-preexistence-coordinate-volume', field.summary.nodes === DEFAULT_FIELD_NODES && field.coordinates.every((n) => n.bh_index === n.sector * 3072 + n.lane * 1024 + n.glyph));
  add('six-cylinder-phases-present', field.summary.phases === 6 && field.coordinates.every((n) => n.cylinder_phase === n.bh_index % 6 && n.cylinder_ring === Math.floor(n.bh_index / 6)));
  add('rule-of-three-watchers-present', field.summary.watchers === 3 && field.coordinates.some((n) => n.watcher_lane === 'hookwall') && field.coordinates.some((n) => n.watcher_lane === 'gnn') && field.coordinates.some((n) => n.watcher_lane === 'shannon'));
  add('host-descriptors-are-separate-and-held', field.hosts.length === 3 && field.hosts.every((h) => h.host_handle_bytes === 8 && h.node_per_agent === 0 && h.process_launch === 0));
  add('replay-is-not-live-telemetry', field.summary.coordinate_replay_only === true && field.summary.live_pid_telemetry === false && field.replay.every((e) => e.kind === 'COORDINATE_REPLAY_NOT_LIVE_TELEMETRY' && e.live_pid_telemetry === 0 && e.process_launch === 0));
  add('odysseus-mtp-bound', field.summary.mtp_descriptor_backed === 3);
  add('prime-cube-anchors-bound', field.prime_cube_primes.length === 11 && field.prime_cubes.includes(13 ** 3) && field.prime_cubes.includes(131 ** 3));
  add('rows-hbp-only', emitRows({ prefix: 'bad|prefix\nODYSCI3DGATE|process_launch=1' }).every((row) => row.endsWith('|json=0') && !/[\r\n{]/.test(row)));
  add('total-never-throws', (() => { try { buildScientificField({ get nodes() { throw new Error('boom'); } }); emitRows(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows()) console.log(row);
}
