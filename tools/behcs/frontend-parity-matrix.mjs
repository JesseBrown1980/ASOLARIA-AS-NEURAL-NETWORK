#!/usr/bin/env node
// frontend-parity-matrix.mjs - held-safe matrix for root front-end cutover readiness.
//
// This is not a front-end implementation and not a dashboard cutover. It turns the
// Odysseus/ChatOS absorption rows into a byte-stable parity matrix: each required
// root front-end cell must point at a route, file, sha, or explicit CANNOT_SEE.
//
// Safety: descriptor-only, HBP rows only, no fetch, no fs, no spawn, no write, no
// mint, no cutover. Promotion waits until every cell is GREEN and operator/cosign
// gates pass.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MATRIX_ID = 'frontend-parity-matrix.v1';
export const CUTOVER_GATE = 'NO_CUTOVER_UNTIL_EVERY_CELL_GREEN_AND_OPERATOR_COSIGN';
export const STATUSES = Object.freeze(['GREEN', 'PARTIAL', 'RED', 'GATED']);
export const REQUIRED_MATRIX_IDS = Object.freeze(['M', 'T', 'P', 'C', 'Q', 'R', 'E', 'A', 'D', 'G']);

export const MATRIX_CELLS = Object.freeze([
  Object.freeze({
    id: 'M',
    name: 'model_selector',
    status: 'RED',
    source: 'CANNOT_SEE',
    evidence: 'no-model-selector-or-model-role-routing-artifact-yet',
    required_next: 'create-model-selector-M-artifact-with-visible-slice-role-routing',
  }),
  Object.freeze({
    id: 'T',
    name: 'tool_skill',
    status: 'PARTIAL',
    source: 'tools/behcs/fabric-agent-preload-catalog.mjs',
    evidence: 'tools-preloaded-but-front-end-skill-registry-not-yet-first-class',
    required_next: 'promote-tool-skill-registry-to-front-end-visible-artifact',
  }),
  Object.freeze({
    id: 'P',
    name: 'project_guide',
    status: 'RED',
    source: 'CANNOT_SEE',
    evidence: 'only-200-step-plan-exists-no-per-project-guide-artifact-yet',
    required_next: 'create-project-guide-P-artifact-with-agent-workflow-binding',
  }),
  Object.freeze({
    id: 'C',
    name: 'council_vote',
    status: 'PARTIAL',
    source: 'mcp-asolaria-fabric-council-query+/api/council-verdicts',
    evidence: 'query+verdict-loop-PROVEN-WHEN-UP-CONVERGE-signed-but-verdict-read-lane-repeatedly-all_bases_unavailable-timeout-this-session-availability-not-green',
    required_next: 'cold-path-verdict-cache-or-fallback-so-front-end-not-blocked-when-bus-flaps-then-green',
  }),
  Object.freeze({
    id: 'Q',
    name: 'swarm_queue',
    status: 'PARTIAL',
    source: 'tools/behcs/answer-producer.mjs+/api/loop/pending',
    evidence: 'answer-producer-byte-stable-loop-pending-lane-fetch-flaky',
    required_next: 'stabilize-pending-lane-cold-path-receipt-before-green',
  }),
  Object.freeze({
    id: 'R',
    name: 'memory_index',
    status: 'GREEN',
    source: 'docs/CLAIMSLEDGER-2026-06-12.hbp+docs/ASOLARIA-AS-NEURAL-NETWORK.hbp',
    evidence: 'tagged-receipted-claims-and-memory-index-discipline-exist',
    required_next: 'front-end-must-show-only-receipted-claims-not-raw-prose',
  }),
  Object.freeze({
    id: 'E',
    name: 'local_engine',
    status: 'PARTIAL',
    source: 'docs/LIRIS-LOCAL-ENGINE-SURFACE-CATCH-2026-06-12.hbp+docs/ACER-LOCAL-ENGINE-CENSUS-2026-06-12.hbp',
    evidence: 'local-engine-surfaces-enumerated-but-cold-path-receipts-not-all-authored-by-owner-vantage',
    required_next: 'owner-vantage-cold-path-receipts-for-each-dashboard-engine',
  }),
  Object.freeze({
    id: 'A',
    name: 'route_api',
    status: 'GREEN',
    source: 'tools/behcs/route-health-baseline.mjs+tools/behcs/dashboard-resolver.mjs',
    evidence: 'route-health-and-dashboard-resolver-parity-baselines-are-sealed',
    required_next: 'keep-route-boundary-vs-down-distinction-in-front-end',
  }),
  Object.freeze({
    id: 'D',
    name: 'dashboard_parity',
    status: 'PARTIAL',
    source: 'docs/DASHBOARD-RESOLVER-PARITY-BASELINE-2026-06-11.hbp+docs/ACER-FRONTEND-PARITY-ABSORPTION-READBACK-2026-06-12.hbp',
    evidence: 'parity-template-exists-but-per-dashboard-cold-path-receipts-still-missing',
    required_next: 'enumerate-dashboard-cold-path-receipts-before-shadow',
  }),
  Object.freeze({
    id: 'G',
    name: 'gate_state',
    status: 'GREEN',
    source: 'tools/behcs/nnest-watcher-gate.mjs+docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
    evidence: 'gate-state-and-class1-cosign-law-are sealed; live actions still defer',
    required_next: 'front-end-visible-gates-must-not-confuse-authorization-with-action',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => { try { return String(x == null ? '' : x).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

function normalizeStatus(value) {
  const s = safe(value).toUpperCase();
  return STATUSES.includes(s) ? s : 'RED';
}

export function normalizeCell(input) {
  try {
    const id = safe(prop(input, 'id', '')).toUpperCase();
    const source = safe(prop(input, 'source', 'CANNOT_SEE')) || 'CANNOT_SEE';
    const evidence = safe(prop(input, 'evidence', ''));
    const cannot_see = source === 'CANNOT_SEE';
    const has_pointer = cannot_see || !!source || /^[A-Fa-f0-9]{16,64}$/.test(evidence);
    return {
      id: REQUIRED_MATRIX_IDS.includes(id) ? id : 'UNKNOWN',
      name: safe(prop(input, 'name', 'unknown')),
      status: normalizeStatus(prop(input, 'status', 'RED')),
      source,
      evidence,
      required_next: safe(prop(input, 'required_next', 'define-next-artifact')),
      cannot_see,
      has_pointer,
      row_sha16: sha16([id, prop(input, 'name', ''), prop(input, 'status', ''), source, evidence].join('|')),
    };
  } catch {
    return {
      id: 'UNKNOWN',
      name: 'invalid',
      status: 'RED',
      source: 'CANNOT_SEE',
      evidence: 'normalize-threw',
      required_next: 'repair-hostile-cell',
      cannot_see: true,
      has_pointer: true,
      row_sha16: sha16('invalid-cell'),
    };
  }
}

export function buildMatrix(input = MATRIX_CELLS) {
  const source = Array.isArray(input) ? input : MATRIX_CELLS;
  const cells = source.map(normalizeCell);
  const byId = new Map(cells.map((cell) => [cell.id, cell]));
  const missing_required = REQUIRED_MATRIX_IDS.filter((id) => !byId.has(id));
  const status_counts = Object.fromEntries(STATUSES.map((status) => [status, cells.filter((cell) => cell.status === status).length]));
  const all_have_pointer = cells.every((cell) => cell.has_pointer);
  const all_green = missing_required.length === 0 && cells.length === REQUIRED_MATRIX_IDS.length && cells.every((cell) => cell.status === 'GREEN');
  const matrix_sha16 = sha16(cells.map((cell) => `${cell.id}:${cell.status}:${cell.row_sha16}`).join('|'));
  return {
    tool: MATRIX_ID,
    cells,
    summary: {
      required: REQUIRED_MATRIX_IDS.length,
      cells: cells.length,
      missing_required,
      status_counts,
      all_have_pointer,
      all_green,
      cutover_ready: all_green && all_have_pointer,
      matrix_sha16,
      c015_status: 'PARTIAL_MATRIX_BUILT_GAPS_REMAIN',
    },
  };
}

export function emitRows(input = MATRIX_CELLS, opts = {}) {
  try {
    const matrix = buildMatrix(input);
    const capRaw = Number.parseInt(String(prop(opts, 'limit', matrix.cells.length)), 10);
    const cap = Math.max(0, Math.min(Number.isFinite(capRaw) ? capRaw : matrix.cells.length, matrix.cells.length));
    const s = matrix.summary;
    const rows = [
      `FEPMHDR|tool=${MATRIX_ID}|purpose=root-front-end-parity-matrix-before-any-dashboard-cutover|required=${s.required}|cells=${s.cells}|matrix_sha16=${s.matrix_sha16}|read_only=1|process_launch=0|no_fetch=1|no_write=1|no_mint=1|no_cutover=1|json=0`,
      `FEPMSUM|green=${s.status_counts.GREEN}|partial=${s.status_counts.PARTIAL}|red=${s.status_counts.RED}|gated=${s.status_counts.GATED}|all_have_pointer=${s.all_have_pointer ? 1 : 0}|all_green=${s.all_green ? 1 : 0}|cutover_ready=${s.cutover_ready ? 1 : 0}|C015_status=${s.c015_status}|json=0`,
      `FEPMGATE|cutover=${s.cutover_ready ? 'ALLOW_AFTER_OPERATOR_COSIGN' : 'HOLD'}|rule=${CUTOVER_GATE}|reason=${s.cutover_ready ? 'all-cells-green' : 'red-or-partial-or-gated-cells-remain'}|json=0`,
    ];
    for (const cell of matrix.cells.slice(0, cap)) {
      rows.push(
        `FEPMCELL|id=${safe(cell.id)}|name=${safe(cell.name)}|status=${safe(cell.status)}|source=${safe(cell.source)}`
        + `|cannot_see=${cell.cannot_see ? 1 : 0}|has_pointer=${cell.has_pointer ? 1 : 0}|row_sha16=${safe(cell.row_sha16)}`
        + `|evidence=${safe(cell.evidence)}|required_next=${safe(cell.required_next)}|json=0`,
      );
    }
    rows.push(`FEPMFTR|state=SEALED-FRONTEND-PARITY-MATRIX|emitted=${cap}|cutover_performed=0|old_dashboards_deleted=0|json=0`);
    return rows;
  } catch {
    return [
      `FEPMHDR|tool=${MATRIX_ID}|purpose=root-front-end-parity-matrix-before-any-dashboard-cutover|required=${REQUIRED_MATRIX_IDS.length}|cells=0|read_only=1|process_launch=0|no_cutover=1|json=0`,
      `FEPMGATE|cutover=HOLD|rule=${CUTOVER_GATE}|reason=emit-threw-held-invalid|json=0`,
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const matrix = buildMatrix();
  const rows = emitRows();
  add('all-required-cells-present', matrix.summary.required === 10 && matrix.summary.missing_required.length === 0);
  add('c015-partial-not-closed', matrix.summary.c015_status === 'PARTIAL_MATRIX_BUILT_GAPS_REMAIN' && matrix.summary.cutover_ready === false);
  add('mtp-gaps-visible', matrix.cells.find((c) => c.id === 'M').status === 'RED' && matrix.cells.find((c) => c.id === 'T').status === 'PARTIAL' && matrix.cells.find((c) => c.id === 'P').status === 'RED');
  add('every-cell-has-pointer-or-cannot-see', matrix.summary.all_have_pointer === true && matrix.cells.every((c) => c.has_pointer));
  add('gate-holds-cutover', rows.some((row) => row.startsWith('FEPMGATE|') && row.includes('cutover=HOLD')));
  add('rows-hbp-only', rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  let threw = false;
  try {
    normalizeCell(null);
    normalizeCell({ get id() { throw new Error('boom'); } });
    buildMatrix(null);
    emitRows([Object.defineProperty({}, 'source', { get() { throw new Error('boom'); } })]);
  } catch { threw = true; }
  add('total-never-throws', threw === false);
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number.parseInt(limitArg.slice('--limit='.length), 10) : MATRIX_CELLS.length;
  process.stdout.write(emitRows(MATRIX_CELLS, { limit }).join('\n') + '\n');
}
