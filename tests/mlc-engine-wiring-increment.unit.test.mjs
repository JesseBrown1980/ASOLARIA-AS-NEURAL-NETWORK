import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  ENGINE_LANES,
  FISCHER_SCORE_KIND,
  LIVE_GATE,
  WIRING_ID,
  buildWiring,
  emitRows,
  selfTest,
  wireLine,
} from '../tools/behcs/mlc-engine-wiring-increment.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('engine lanes cover MTP, HRM, GNN, Fischer, Mamba, and AoT', () => {
  assert.deepEqual(ENGINE_LANES.map((lane) => lane.id), ['mtp', 'hrm', 'gnn', 'fischer', 'mamba', 'aot']);
  assert.ok(ENGINE_LANES.every((lane) => lane.state && lane.source));
});

test('descriptor build maps MLC lines without launching live engines', () => {
  const built = buildWiring({ nodes: 18, strides: [1, 2], prefix: 'WIRETEST' });
  assert.equal(built.tool, WIRING_ID);
  assert.equal(built.summary.entries, 33);
  assert.equal(built.summary.all_no_launch, true);
  assert.equal(built.summary.c036_status, 'OPEN_LIVE_ENGINE_NOT_LAUNCHED');
  assert.ok(built.entries.every((entry) => entry.process_launch === 0 && entry.live_launch_gate === LIVE_GATE));
});

test('Fischer/Mamba/AoT are handles only, not live execution', () => {
  const built = buildWiring({ nodes: 14, strides: [1] });
  assert.equal(FISCHER_SCORE_KIND, 'DRAFT_STANDIN_NOT_FISCHER');
  assert.ok(built.entries.every((entry) => entry.fischer_score_kind === 'DRAFT_STANDIN_NOT_FISCHER'));
  assert.ok(built.entries.every((entry) => entry.mamba_sequence_block.startsWith('block_')));
  assert.ok(built.entries.every((entry) => ['OBSERVE_NEXT', 'RECURSE_LOCAL', 'DECOMPOSE_PATH', 'HOLD_FOR_SUPERVISOR'].includes(entry.aot_step)));
});

test('wireLine is total and sanitizes HBP delimiters', () => {
  const hostile = {
    from: { pid: 'from|bad\nrow' },
    to: { pid: 'to\rbad' },
    watcher: 'mtp_field_proxy',
    fischer_move: 'BRIDGE|INJECT',
    sequence_block: 'block_0\nX',
    aot_step: 'DECOMPOSE_PATH',
  };
  const wired = wireLine(hostile);
  assert.equal(wired.primary_engine, 'mtp');
  assert.equal(/[|\r\n]/.test(wired.from_pid), false);
  assert.doesNotThrow(() => wireLine(null));
  assert.doesNotThrow(() => wireLine({ get from() { throw new Error('boom'); } }));
});

test('emitted rows are HBP-only and carry the live-launch gate', () => {
  const rows = emitRows({ nodes: 12, cap: 5, fabric_request_id: 'council-q-1781430832486-2x1l0p' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.startsWith('MLCEWIREGATE|') && row.includes('C036_status=OPEN_LIVE_ENGINE_NOT_LAUNCHED')));
  assert.ok(rows.some((row) => row.startsWith('MLCEWIRELANES|') && row.includes('fischer_score_kind=DRAFT_STANDIN_NOT_FISCHER')));
});

test('tool imports no spawn/write/network/live engine capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/mlc-engine-wiring-increment.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|Start-Process|Stop-Process/.test(src), false);
});
