import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FRONTEND_CELL,
  M_CELL_STATUS,
  MODEL_ROLES,
  SELECTOR_ID,
  buildSelector,
  emitRows,
  normalizeRole,
  selectRole,
  selfTest,
} from '../tools/behcs/model-selector-matrix.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('selector materializes the M cell as PARTIAL, not live-ready GREEN', () => {
  const selector = buildSelector();
  assert.equal(selector.tool, SELECTOR_ID);
  assert.equal(selector.frontend_cell, FRONTEND_CELL);
  assert.equal(selector.summary.m_cell_status, M_CELL_STATUS);
  assert.equal(selector.summary.cutover_ready, false);
  assert.equal(selector.summary.live_invocation_ready, false);
  assert.equal(selector.summary.total, MODEL_ROLES.length);
});

test('known needs route to explicit roles without invoking a model', () => {
  assert.equal(selectRole({ need: 'self heal proposal' }).selected, 'heal-proposal');
  assert.equal(selectRole({ need: 'MTP HRM GNN engine wiring' }).selected, 'mlc-descriptor');
  assert.equal(selectRole({ need: 'Fischer judge score' }).selected, 'fischer-draft-standin');
  assert.equal(selectRole({ need: 'pixel frame world model' }).selected, 'frozen-gemma-proof-gated');
  assert.equal(selectRole({ need: 'route health dashboard' }).selected, 'route-health');
  assert.equal(selectRole({ need: 'unknown next step' }).selected, 'fabric-council');
});

test('frozen Gemma and live engine routes stay gated/partial rather than overclaimed', () => {
  const selector = buildSelector();
  assert.equal(selector.roles.find((r) => r.id === 'frozen-gemma-proof-gated').status, 'GATED');
  assert.equal(selector.roles.find((r) => r.id === 'mlc-descriptor').status, 'PARTIAL');
  assert.equal(selector.roles.find((r) => r.id === 'fischer-draft-standin').evidence.includes('DRAFT_STANDIN_NOT_FISCHER'), true);
});

test('normalize/select/emit are total against hostile inputs', () => {
  assert.doesNotThrow(() => normalizeRole(null));
  assert.doesNotThrow(() => normalizeRole({ get id() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => selectRole({ get need() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => emitRows(null));
  const rows = emitRows([{ id: 'x|bad', lane: 'l\nbad', status: 'GREEN', source: 's|json=1', evidence: 'e\nMODSELGATE|process_launch=1' }], {
    need: 'vision|json=1\nMODSELGATE|process_launch=1',
  });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.equal(rows.join('\n').split('\n').length, rows.length);
  assert.equal(rows.filter((row) => row.startsWith('MODSELGATE|')).length, 1);
});

test('emitted rows are HBP-only and hold live invocation at zero', () => {
  const rows = emitRows(MODEL_ROLES, { need: 'fischer score', limit: 3 });
  assert.ok(rows.some((row) => row.startsWith('MODSELHDR|') && row.includes('process_launch=0') && row.includes('live_model_invocation=0')));
  assert.ok(rows.some((row) => row.startsWith('MODSELSUM|') && row.includes(`M_cell_status=${M_CELL_STATUS}`)));
  assert.ok(rows.some((row) => row.startsWith('MODSELROUTE|') && row.includes('selected=fischer-draft-standin')));
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
});

test('tool imports no spawn/write/network/live model capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/model-selector-matrix.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process|import\(/.test(src), false);
});
