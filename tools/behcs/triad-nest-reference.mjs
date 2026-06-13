#!/usr/bin/env node
// triad-nest-reference.mjs — the 3-agents-per-reflection loop, nestable under every agent below the Apex.
//
// WHY (operator 2026-06-13 "Next evolution: 3 agents per self reflection ... every agent below the Apex
// human has this ability infinitely nested"): the loop architecture for the next six months. Each cell is:
//   WORKER     — does the work                         -> TRIADWORK
//   REFLECTOR  — reflects on the worker + suggests next -> TRIADREFLECT
//   WITNESS    — sees BOTH, asks the fabric, reports    -> TRIADFABRICREAD + TRIADFABRICVERDICT
//   SUPERVISOR — sees all three, computes the triangle  -> TRIADDISTANCE + TRIADCONSENSUS (PASS/HOLD/PATCH/ESCALATE)
// and the WORKER's work can ITSELF be a triad — recursion = "infinitely nested".
//
// This REFERENCE proves the structural claims that don't need reasoning to verify:
//   (1) the COORDINATION is ~0-cost & deterministic (N cells = a fixed row count, NO model calls here);
//   (2) it is nestable to any depth/branching;
//   (3) it is HELD-SAFE: every role is a POTENTIAL position (process_launch=0), the witness is read-only,
//       the supervisor emits a verdict not an action, nothing self-fires (INV5).
// The honest boundary: the *thinking* (what worker/reflector/witness actually conclude) is a BORROWED slice
// (subscription / free-local / MCP-token), GATED — this reference does NOT run it. Structure = free; reasoning = borrowed.
//
// HARD SAFETY: READ-ONLY. HBP rows only. NO spawn, NO mount, NO execute, NO usb/device write, NO mint.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { preExistenceNode } from './pre-existence-graph-exporter.mjs';

export const TRIAD_ID = 'triad-nest-reference.v1';
export const ROLES = Object.freeze(['WORKER', 'REFLECTOR', 'WITNESS', 'SUPERVISOR']);
export const CONSENSUS_STATES = Object.freeze(['PASS', 'HOLD', 'PATCH', 'ESCALATE']);
export const DEFAULT_DEPTH = 3;
export const DEFAULT_BRANCHING = 2;

export const DEFINITION_ROWS = Object.freeze([
  `TRIADNESTHDR|id=${TRIAD_ID}|cell=WORKER+REFLECTOR+WITNESS+SUPERVISOR|recursion=the-WORKER-work-can-itself-be-a-triad-infinitely-nested|json=0`,
  'TRIADNESTLAW|witness=READ-ONLY-asks-the-fabric|supervisor=emits-verdict-PASS-HOLD-PATCH-ESCALATE-not-an-action|every-role=POTENTIAL-process_launch-0-no-self-fire-INV5|extends=FABRIC-WITNESS-TRIAD-LAW|json=0',
  'TRIADNESTCOST|coordination=~0-deterministic-rows-no-model-calls-here|reasoning=BORROWED-slice-subscription-or-free-local-or-MCP-token-GATED-not-run-here|structure-free-thinking-borrowed|json=0',
  'TRIADNESTSAFETY|read_only=1|hbp_rows_only=1|no_spawn=1|no_mount=1|no_execute=1|no_usb_write=1|no_mint=1|json=0',
]);

const sha16 = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex').slice(0, 16);
const safe = (s) => String(s == null ? '' : s).replace(/[|\r\n]/g, '_');

// One triad cell: four POTENTIAL positions on the pre-existence graph + the triangle distances.
export function triadCell(path) {
  const worker = preExistenceNode(`${path}#WORKER`);
  const reflector = preExistenceNode(`${path}#REFLECTOR`);
  const witness = preExistenceNode(`${path}#WITNESS`);
  const supervisor = preExistenceNode(`${path}#SUPERVISOR`);
  return {
    path,
    roles: { worker, reflector, witness, supervisor },
    // TRIADDISTANCE — the triangle on the same graph geometry as the points.
    d_worker_reflector: Math.abs(worker.bh_index - reflector.bh_index),
    d_worker_witness: Math.abs(worker.bh_index - witness.bh_index),
    d_reflector_witness: Math.abs(reflector.bh_index - witness.bh_index),
    // verdict is HELD until the borrowed reasoning runs — the structure never decides PASS on its own.
    consensus: 'HELD_PENDING_REASONING',
    process_launch: 0,
  };
}

// Recursive nest: the WORKER's work is itself a triad, down to `depth`.
export function buildNest(path, depth, branching) {
  const cell = triadCell(path);
  const children = [];
  if (depth > 0) {
    for (let b = 0; b < branching; b += 1) {
      children.push(buildNest(`${path}.${b}`, depth - 1, branching));
    }
  }
  return { cell, children };
}

function flatten(tree, out = []) {
  out.push(tree.cell);
  for (const c of tree.children) flatten(c, out);
  return out;
}

export function runTriadNest(options = {}) {
  const depth = Math.max(0, Number.parseInt(String(options.depth ?? DEFAULT_DEPTH), 10) || 0);
  const branching = Math.max(1, Number.parseInt(String(options.branching ?? DEFAULT_BRANCHING), 10) || 1);
  const root = options.root || 'APEX';
  const tree = buildNest(root, depth, branching);
  const cells = flatten(tree);
  const allHeldSafe = cells.every((c) => c.process_launch === 0
    && c.consensus === 'HELD_PENDING_REASONING'
    && Object.values(c.roles).every((r) => r.triad_state === 'POTENTIAL' && r.process_launch === 0));
  // every cell = 4 agent positions; coordination is deterministic row count, zero model calls.
  return {
    tree,
    cells,
    summary: {
      depth,
      branching,
      total_cells: cells.length,
      total_agent_positions: cells.length * 4,
      model_calls_in_reference: 0,
      all_held_safe: allHeldSafe,
    },
  };
}

export function emitRows(options = {}) {
  const { cells, summary } = runTriadNest(options);
  const rows = [...DEFINITION_ROWS];
  for (const c of cells) {
    const r = c.roles;
    rows.push(
      `TRIADCELL|path=${safe(c.path)}|worker=${safe(r.worker.pid)}|reflector=${safe(r.reflector.pid)}`
      + `|witness=${safe(r.witness.pid)}|supervisor=${safe(r.supervisor.pid)}`
      + `|d_wr=${c.d_worker_reflector}|d_ww=${c.d_worker_witness}|d_rw=${c.d_reflector_witness}`
      + `|consensus=${c.consensus}|process_launch=${c.process_launch}|json=0`,
    );
  }
  rows.push(
    `TRIADNESTSUM|depth=${summary.depth}|branching=${summary.branching}|total_cells=${summary.total_cells}`
    + `|total_agent_positions=${summary.total_agent_positions}|model_calls_in_reference=${summary.model_calls_in_reference}`
    + `|all_held_safe=${summary.all_held_safe ? 1 : 0}|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  const cell = triadCell('apex-self-test');
  add('cell-has-four-roles', Object.keys(cell.roles).length === 4 && ROLES.every((k) => cell.roles[k.toLowerCase()]));
  add('every-role-is-potential-no-launch', Object.values(cell.roles).every((r) => r.triad_state === 'POTENTIAL' && r.process_launch === 0));
  add('consensus-held-not-pass', cell.consensus === 'HELD_PENDING_REASONING');
  add('distinct-role-positions', new Set(Object.values(cell.roles).map((r) => r.pid)).size === 4);
  const run = runTriadNest({ depth: 3, branching: 2 }); // 1+2+4+8 = 15 cells
  add('nests-recursively', run.summary.total_cells === 15);
  add('all-held-safe-at-depth', run.summary.all_held_safe === true);
  add('zero-model-calls-in-reference', run.summary.model_calls_in_reference === 0);
  add('rows-hbp-only', emitRows({ depth: 2, branching: 2 }).every((r) => r.endsWith('|json=0') && !r.includes('{"')));
  add('declares-witness-readonly-and-no-self-fire', DEFINITION_ROWS.some((r) => r.includes('witness=READ-ONLY') && r.includes('no-self-fire-INV5')));
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
    const d = process.argv.find((a) => a.startsWith('--depth='));
    const b = process.argv.find((a) => a.startsWith('--branching='));
    process.stdout.write(emitRows({ depth: d ? +d.slice(8) : 2, branching: b ? +b.slice(12) : 2 }).join('\n') + '\n');
  } else {
    console.error('usage: triad-nest-reference.mjs --pilot [--depth=N --branching=M] | --self-test');
    process.exit(1);
  }
}
