#!/usr/bin/env node
// pre-existence-graph-exporter.mjs — render the POSITIONAL graph that exists BEFORE any agent does.
//
// WHY (operator + liris convergence 2026-06-13): the system graphs the working machine
// BEFORE the agents exist. What exists first is the addressable possibility-space, not the
// process: Brown-Hilbert / prime-cube generator -> PID address space -> compact PID pool ->
// BEHCS-1024 glyph/tuple map -> room-rotor stub slot -> ONLY THEN operator-gated materialization.
// A PID "lighting up" is an activation in a pre-existing coordinate field, not creation of the field.
//
// This exporter emits the chain liris specced:
//   PID_RANGE -> BROWN_HILBERT_POINT -> CYLINDER_DISTANCE -> GLYPH_BINDING -> WATCHER_LANE -> TRIAD_STATE
// so the GNNs / Shannon / dashboards can WATCH the shape (activations, distances, collisions, stale
// zones, hot lanes) without any logical position becoming a real process.
//
// HARD SAFETY (held-safe by construction): READ-ONLY. HBP rows only. NO spawn, NO mount, NO execute,
// NO USB/device write, NO mint. Every node's triad_state is POTENTIAL — a position waiting to be lit,
// never a launched process (process_launch=0). Grounds on the REAL upstream generators, mutates nothing.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mintPid, SECTORS, WIDTH } from './github-pid-register.mjs';
import { classifyBhIndex } from './token-cube-catalog-binder.mjs';

export const EXPORTER_ID = 'pre-existence-graph-exporter.v1';
export const DEFAULT_NODES = 256;
// The 11 prime-cube axis anchors of the real Brown-Hilbert intersection cube
// (acer-local hilbert-intersection-engine.js; confirmed receipt c134d0f). p^3 for p in:
export const PRIME_CUBE_PRIMES = Object.freeze([13, 17, 23, 31, 41, 47, 73, 79, 83, 89, 131]);
export const PRIME_CUBES = Object.freeze(PRIME_CUBE_PRIMES.map((p) => p ** 3)); // 2197 .. 2248091
// mod-3 lane -> watcher organ (the observers that WATCH, never act).
export const WATCHER_LANES = Object.freeze(['hookwall', 'gnn', 'shannon']);

export const DEFINITION_ROWS = Object.freeze([
  `PREXHDR|id=${EXPORTER_ID}|emits=PID_RANGE-to-BROWN_HILBERT_POINT-to-CYLINDER_DISTANCE-to-GLYPH_BINDING-to-WATCHER_LANE-to-TRIAD_STATE|json=0`,
  'PREXWHY|the-graph-exists-before-the-agents|a-PID-lighting-up-is-an-activation-in-a-pre-existing-coordinate-field-not-creation-of-the-field|json=0',
  `PREXFIELD|generator=Brown-Hilbert-prime-cube-coords=${PRIME_CUBES.join('+')}|registrar=github-pid-register-mintPid-downstream|pool=bh-pid-pool-100000-ranges|json=0`,
  'PREXSAFETY|read_only=1|hbp_rows_only=1|no_spawn=1|no_mount=1|no_execute=1|no_usb_write=1|no_mint=1|every_node_triad_state=POTENTIAL|process_launch=0|json=0',
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);

// Linearize a registered point into ONE Brown-Hilbert index over the sector.lane.glyph field.
// Distinct positions -> distinct indices, so the distance between any two points is well-defined
// and (for distinct prime-anchored sectors) inherently unique.
function bhIndex(reg) {
  return reg.sector * (WIDTH * 3) + reg.lane * WIDTH + reg.glyph_1024;
}

// Which prime-cube band a sector falls in (nearest prime-cube anchor by sector position).
function primeBand(sector) {
  // map the 113-sector ring onto the 11 prime anchors deterministically
  const i = sector % PRIME_CUBE_PRIMES.length;
  return { prime: PRIME_CUBE_PRIMES[i], cube: PRIME_CUBES[i] };
}

// One pre-existence node: a POTENTIAL position in the field — never a process.
export function preExistenceNode(name) {
  const reg = mintPid({ role: 'AGT', name, tier: 4, nest: 1, kind: 'logical', prime: 0 });
  const idx = bhIndex(reg);
  const band = primeBand(reg.sector);
  const cls = classifyBhIndex(reg.sector);
  return {
    name,
    pid: reg.pid,
    bh_point: reg.cube_bh,                 // BROWN_HILBERT_POINT (sector.lane.glyph)
    bh_index: idx,
    sector: reg.sector,
    lane: reg.lane,
    glyph_binding: reg.glyph_1024,          // GLYPH_BINDING (BEHCS-1024)
    prime_band: band.prime,
    prime_cube: band.cube,
    ppow_class: cls && cls.ppow ? cls.ppow : 'unknown',
    cylinder_ring: Math.floor(idx / 6),     // mod-6 cylinder (zeta-quant geometry)
    cylinder_phase: idx % 6,
    watcher_lane: WATCHER_LANES[reg.lane % 3], // WATCHER_LANE (observer, never actuator)
    triad_state: 'POTENTIAL',               // TRIAD_STATE: unlit position; not a launched process
    process_launch: 0,
  };
}

export function runExporter(options = {}) {
  const count = Math.max(1, Number.parseInt(String(options.nodes ?? DEFAULT_NODES), 10) || DEFAULT_NODES);
  const prefix = options.prefix || 'POS';
  const nodes = [];
  for (let i = 0; i < count; i += 1) {
    nodes.push(preExistenceNode(`${prefix}-${String(i).padStart(6, '0')}-${sha16(`${prefix}|${i}`)}`));
  }
  // CYLINDER_DISTANCE: pairwise distance along the linear BH index between consecutive positions.
  const distances = [];
  for (let i = 1; i < nodes.length; i += 1) {
    distances.push(Math.abs(nodes[i].bh_index - nodes[i - 1].bh_index));
  }
  const uniqBhPoints = new Set(nodes.map((n) => n.bh_point)).size;
  const uniqPids = new Set(nodes.map((n) => n.pid)).size;
  const laneCounts = [0, 0, 0];
  nodes.forEach((n) => { laneCounts[n.lane % 3] += 1; });
  const allPotential = nodes.every((n) => n.triad_state === 'POTENTIAL' && n.process_launch === 0);
  return {
    nodes,
    distances,
    summary: {
      count,
      uniq_bh_points: uniqBhPoints,
      uniq_pids: uniqPids,
      lane_counts: laneCounts,
      distinct_distances: new Set(distances).size,
      all_potential_no_launch: allPotential,
    },
  };
}

const safe = (s) => String(s == null ? '' : s).replace(/[|\r\n]/g, '_');

export function emitRows(options = {}) {
  const { nodes, distances, summary } = runExporter(options);
  const rows = [...DEFINITION_ROWS];
  for (const n of nodes) {
    rows.push(
      `PREXNODE|name=${safe(n.name)}|pid=${safe(n.pid)}|bh_point=${safe(n.bh_point)}|bh_index=${n.bh_index}`
      + `|prime_band=${n.prime_band}|prime_cube=${n.prime_cube}|ppow=${safe(n.ppow_class)}`
      + `|cylinder_ring=${n.cylinder_ring}|cylinder_phase=${n.cylinder_phase}|glyph=${n.glyph_binding}`
      + `|watcher_lane=${n.watcher_lane}|triad_state=${n.triad_state}|process_launch=${n.process_launch}|json=0`,
    );
  }
  rows.push(
    `PREXSUM|nodes=${summary.count}|uniq_bh_points=${summary.uniq_bh_points}|uniq_pids=${summary.uniq_pids}`
    + `|lane_counts=${summary.lane_counts.join(',')}|distinct_distances=${summary.distinct_distances}`
    + `|all_potential_no_launch=${summary.all_potential_no_launch ? 1 : 0}|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  const a = preExistenceNode('prex-self-test');
  const b = preExistenceNode('prex-self-test');
  add('deterministic-node', a.pid === b.pid && a.bh_point === b.bh_point);
  add('node-is-potential-never-launched', a.triad_state === 'POTENTIAL' && a.process_launch === 0);
  add('bh-point-shape', /^BH\.\d+\.[0-2]\.\d+$/.test(a.bh_point));
  add('watcher-is-observer-lane', WATCHER_LANES.includes(a.watcher_lane));
  add('prime-cube-anchor', PRIME_CUBES.includes(a.prime_cube));
  const run = runExporter({ nodes: 128 });
  add('all-nodes-potential-no-launch', run.summary.all_potential_no_launch === true);
  add('rows-hbp-only', emitRows({ nodes: 32 }).every((r) => r.endsWith('|json=0') && !r.includes('{"')));
  add('emits-the-full-chain', DEFINITION_ROWS[0].includes('BROWN_HILBERT_POINT') && DEFINITION_ROWS[0].includes('TRIAD_STATE'));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  const cmd = process.argv[2] || '--pilot';
  if (cmd === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  } else if (cmd === '--pilot') {
    const arg = process.argv.find((a) => a.startsWith('--nodes='));
    const nodes = arg ? Number.parseInt(arg.slice(8), 10) : 24;
    process.stdout.write(emitRows({ nodes }).join('\n') + '\n');
  } else {
    console.error('usage: pre-existence-graph-exporter.mjs --pilot [--nodes=N] | --self-test');
    process.exit(1);
  }
}
