import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  FRONTEND_CELL,
  REGISTRY_ID,
  REGISTRY_ITEMS,
  T_CELL_STATUS,
  buildRegistry,
  emitRows,
  normalizeItem,
  registryItem,
  selfTest,
} from '../tools/behcs/tool-skill-registry-matrix.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('registry materializes the T cell as PARTIAL, not live-tool-ready GREEN', () => {
  const registry = buildRegistry();
  assert.equal(registry.tool, REGISTRY_ID);
  assert.equal(registry.frontend_cell, FRONTEND_CELL);
  assert.equal(registry.summary.t_cell_status, T_CELL_STATUS);
  assert.equal(registry.summary.cutover_ready, false);
  assert.equal(registry.summary.live_tool_execution_ready, false);
  assert.equal(registry.summary.total, REGISTRY_ITEMS.length);
});

test('known tool and skill topics route to explicit items without execution', () => {
  assert.equal(registryItem({ topic: 'tool skill registry' }).selected, 'preload-catalog');
  assert.equal(registryItem({ topic: 'self heal repair' }).selected, 'heal-envelope-emitter');
  assert.equal(registryItem({ topic: 'route health dashboard' }).selected, 'route-health-baseline');
  assert.equal(registryItem({ topic: 'cosign submit schema proof' }).selected, 'cosign-submit-schema');
  assert.equal(registryItem({ topic: 'live engine daemon launch' }).selected, 'live-engine-daemon-contract');
});

test('live execution, submit schema, and daemon launch stay gated/partial', () => {
  const registry = buildRegistry();
  assert.equal(registry.items.find((x) => x.id === 'cosign-submit-schema').status, 'GATED');
  assert.equal(registry.items.find((x) => x.id === 'live-engine-daemon-contract').status, 'GATED');
  assert.equal(registry.items.find((x) => x.id === 'fabric-council').status, 'PARTIAL');
  assert.ok(registry.items.every((x) => x.process_launch === 0 && x.live_tool_execution === 0 && x.cutover === 0));
});

test('normalize/route/emit are total and injection-safe', () => {
  assert.doesNotThrow(() => normalizeItem(null));
  assert.doesNotThrow(() => normalizeItem({ get id() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => registryItem({ get topic() { throw new Error('boom'); } }));
  assert.doesNotThrow(() => emitRows(null));
  const rows = emitRows([{ id: 'x|bad', kind: 'tool\nbad', status: 'GREEN', source: 'src|json=1', exposes: 'a\nTOOLSKILLGATE|cutover=1' }], {
    topic: 'schema|json=1\nTOOLSKILLGATE|process_launch=1',
  });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.equal(rows.join('\n').split('\n').length, rows.length);
  assert.equal(rows.filter((row) => row.startsWith('TOOLSKILLGATE|')).length, 1);
});

test('cap=0 emits zero detail rows and keeps the held gate', () => {
  const rows = emitRows(REGISTRY_ITEMS, { limit: 0 });
  assert.equal(rows.filter((row) => row.startsWith('TOOLSKILL|')).length, 0);
  assert.ok(rows.some((row) => row.startsWith('TOOLSKILLGATE|') && row.includes('status=PARTIAL')));
});

test('emitted rows are HBP-only and hold live action at zero', () => {
  const rows = emitRows(REGISTRY_ITEMS, { topic: 'cosign submit schema', limit: 3 });
  assert.ok(rows.some((row) => row.startsWith('TOOLSKILLHDR|') && row.includes('process_launch=0') && row.includes('live_tool_execution=0')));
  assert.ok(rows.some((row) => row.startsWith('TOOLSKILLSUM|') && row.includes(`T_cell_status=${T_CELL_STATUS}`)));
  assert.ok(rows.some((row) => row.startsWith('TOOLSKILLROUTE|') && row.includes('selected=cosign-submit-schema')));
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
});

test('tool imports no spawn/write/network/live execution capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/tool-skill-registry-matrix.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process|import\(/.test(src), false);
});
