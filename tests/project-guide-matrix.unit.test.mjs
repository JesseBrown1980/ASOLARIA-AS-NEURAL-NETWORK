import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FRONTEND_CELL,
  GUIDE_ID,
  GUIDE_SECTIONS,
  P_CELL_STATUS,
  buildGuide,
  emitRows,
  guideSection,
  normalizeSection,
  selfTest,
} from '../tools/behcs/project-guide-matrix.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('guide materializes the P cell as PARTIAL, not cutover-ready GREEN', () => {
  const guide = buildGuide();
  assert.equal(guide.tool, GUIDE_ID);
  assert.equal(guide.frontend_cell, FRONTEND_CELL);
  assert.equal(guide.summary.p_cell_status, P_CELL_STATUS);
  assert.equal(guide.summary.cutover_ready, false);
  assert.equal(guide.summary.total, GUIDE_SECTIONS.length);
});

test('known guide topics route to explicit sections without executing workflow', () => {
  assert.equal(guideSection({ topic: 'frontier catch queue' }).selected, 'frontier-queue');
  assert.equal(guideSection({ topic: 'frontend parity cutover cells' }).selected, 'frontend-parity');
  assert.equal(guideSection({ topic: 'model selector gemma fischer' }).selected, 'model-selector');
  assert.equal(guideSection({ topic: 'engine MTP HRM Mamba AoT' }).selected, 'engine-wiring');
  assert.equal(guideSection({ topic: 'cosign submit schema proof' }).selected, 'cosign-submit');
  assert.equal(guideSection({ topic: 'unknown guide' }).selected, 'memory-index');
});

test('open gates remain visible and prevent P from overclaiming GREEN', () => {
  const guide = buildGuide();
  assert.equal(guide.sections.find((s) => s.id === 'cosign-submit').status, 'GATED');
  assert.equal(guide.sections.find((s) => s.id === 'engine-wiring').status, 'PARTIAL');
  assert.equal(guide.sections.find((s) => s.id === 'frontier-queue').status, 'PARTIAL');
});

test('normalize/guide/emit are total and injection-safe', () => {
  assert.doesNotThrow(() => normalizeSection(null));
  assert.doesNotThrow(() => normalizeSection({ get id() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => guideSection({ get topic() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => emitRows(null));
  const rows = emitRows([{ id: 'x|bad', status: 'GREEN', source: 'src|json=1', shows: 'a\nPROJGUIDEGATE|cutover=1' }], {
    topic: 'route|json=1\nPROJGUIDEGATE|cutover=1',
  });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.equal(rows.join('\n').split('\n').length, rows.length);
  assert.equal(rows.filter((row) => row.startsWith('PROJGUIDEGATE|')).length, 1);
});

test('emitted rows are HBP-only and hold cutover at zero', () => {
  const rows = emitRows(GUIDE_SECTIONS, { topic: 'cosign submit schema', limit: 3 });
  assert.ok(rows.some((row) => row.startsWith('PROJGUIDEHDR|') && row.includes('process_launch=0') && row.includes('no_cutover=1')));
  assert.ok(rows.some((row) => row.startsWith('PROJGUIDESUM|') && row.includes(`P_cell_status=${P_CELL_STATUS}`)));
  assert.ok(rows.some((row) => row.startsWith('PROJGUIDEROUTE|') && row.includes('selected=cosign-submit')));
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
});

test('tool imports no spawn/write/network/live cutover capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/project-guide-matrix.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process|import\(/.test(src), false);
});
