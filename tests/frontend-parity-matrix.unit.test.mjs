import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CUTOVER_GATE,
  MATRIX_CELLS,
  MATRIX_ID,
  REQUIRED_MATRIX_IDS,
  buildMatrix,
  emitRows,
  normalizeCell,
  selfTest,
} from '../tools/behcs/frontend-parity-matrix.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('the ten Odysseus root front-end matrices are present in stable order', () => {
  assert.deepEqual(REQUIRED_MATRIX_IDS, ['M', 'T', 'P', 'C', 'Q', 'R', 'E', 'A', 'D', 'G']);
  assert.deepEqual(MATRIX_CELLS.map((cell) => cell.id), REQUIRED_MATRIX_IDS);
});

test('matrix is explicit about M/T/P gaps and does not claim cutover readiness', () => {
  const matrix = buildMatrix();
  assert.equal(matrix.tool, MATRIX_ID);
  assert.equal(matrix.summary.cutover_ready, false);
  assert.equal(matrix.summary.c015_status, 'PARTIAL_MATRIX_BUILT_GAPS_REMAIN');
  assert.equal(matrix.cells.find((cell) => cell.id === 'M').status, 'PARTIAL');
  assert.equal(matrix.cells.find((cell) => cell.id === 'T').status, 'PARTIAL');
  assert.equal(matrix.cells.find((cell) => cell.id === 'P').status, 'RED');
});

test('model_selector cell M is PARTIAL after selector artifact, not GREEN live model readiness', () => {
  const matrix = buildMatrix();
  const m = matrix.cells.find((cell) => cell.id === 'M');
  assert.equal(m.status, 'PARTIAL');
  assert.equal(m.source, 'tools/behcs/model-selector-matrix.mjs');
  assert.match(m.evidence, /live-model-invocation-remains-gated/);
  assert.equal(matrix.summary.cutover_ready, false);
});

test('every cell has a route/file/sha pointer or explicit CANNOT_SEE', () => {
  const matrix = buildMatrix();
  assert.equal(matrix.summary.all_have_pointer, true);
  for (const cell of matrix.cells) assert.equal(cell.has_pointer, true, cell.id);
});

test('all green custom matrix is the only cutover-ready state', () => {
  const green = REQUIRED_MATRIX_IDS.map((id) => ({ id, name: `cell_${id}`, status: 'GREEN', source: `source-${id}`, evidence: `evidence-${id}` }));
  assert.equal(buildMatrix(green).summary.cutover_ready, true);
  assert.equal(buildMatrix(green.map((cell, i) => (i === 0 ? { ...cell, status: 'PARTIAL' } : cell))).summary.cutover_ready, false);
});

test('normalize/emit are total and injection-safe', () => {
  const hostile = { id: 'M|bad', name: 'x\nFEPMGATE|cutover=ALLOW', status: 'GREEN', source: 'src|json=1', evidence: 'ev\rbad' };
  const cell = normalizeCell(hostile);
  assert.equal(/[|\r\n]/.test(cell.name + cell.source + cell.evidence), false);
  assert.doesNotThrow(() => normalizeCell(null));
  assert.doesNotThrow(() => normalizeCell({ get id() { throw new Error('boom'); } }));
  const rows = emitRows([hostile], { limit: 1 });
  assert.ok(rows.every((row) => !/[\r\n]/.test(row) && row.endsWith('|json=0')));
  assert.equal(rows.filter((row) => row.startsWith('FEPMGATE|')).length, 1);
});

test('emitted rows are HBP-only and cutover is held', () => {
  const rows = emitRows();
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.startsWith('FEPMGATE|') && row.includes('cutover=HOLD') && row.includes(CUTOVER_GATE)));
  assert.ok(rows.some((row) => row.startsWith('FEPMSUM|') && row.includes('C015_status=PARTIAL_MATRIX_BUILT_GAPS_REMAIN')));
});

test('council_vote cell C is PARTIAL not GREEN — verdict-read lane availability is flaky (acer review 7cbb7e2)', () => {
  const matrix = buildMatrix();
  const c = matrix.cells.find((cell) => cell.id === 'C');
  assert.equal(c.status, 'PARTIAL');
  assert.match(c.evidence, /availability-not-green|all_bases_unavailable/);
  // an overclaimed GREEN would have inflated cutover-readiness; it must stay held
  assert.equal(matrix.summary.cutover_ready, false);
});

test('tool imports no spawn/write/network/live cutover capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/frontend-parity-matrix.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process/.test(src), false);
});
