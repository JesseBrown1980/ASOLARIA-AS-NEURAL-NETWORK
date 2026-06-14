import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  DEFAULT_FIELD_NODES, FIELD_ID, VIEWER_REPORT,
  buildScientificField, emitRows, selfTest,
} from '../tools/behcs/odysseus-scientific-3d-field.mjs';

test('odysseus scientific 3D field self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('field uses real BH coordinates from the pre-existence graph', () => {
  const field = buildScientificField();
  assert.equal(field.tool, FIELD_ID);
  assert.equal(field.viewer_report, VIEWER_REPORT);
  assert.equal(field.summary.nodes, DEFAULT_FIELD_NODES);
  assert.equal(field.summary.phases, 6);
  assert.ok(field.coordinates.every((n) => n.bh_index === n.sector * 3072 + n.lane * 1024 + n.glyph));
  assert.ok(field.coordinates.every((n) => n.cylinder_phase === n.bh_index % 6));
  assert.ok(field.coordinates.every((n) => n.cylinder_ring === Math.floor(n.bh_index / 6)));
});

test('host PID descriptors are plotted separately from potential field voxels', () => {
  const field = buildScientificField();
  assert.deepEqual(new Set(field.hosts.map((h) => h.agent_type)), new Set(['LOGICAL-WAVE', 'FROZEN-BRAIN', 'REAL-FREE']));
  assert.ok(field.hosts.every((h) => h.host_handle_bytes === 8 && h.node_per_agent === 0 && h.process_launch === 0));
  assert.ok(field.coordinates.every((n) => n.triad_state === 'POTENTIAL' && n.process_launch === 0));
});

test('coordinate event replay is explicitly not live nanosecond telemetry', () => {
  const field = buildScientificField({ nodes: 64, frames: 16 });
  assert.equal(field.summary.live_pid_telemetry, false);
  assert.equal(field.summary.coordinate_replay_only, true);
  assert.equal(field.replay.length, 16);
  assert.ok(field.replay.every((e) => e.kind === 'COORDINATE_REPLAY_NOT_LIVE_TELEMETRY'));
  assert.ok(field.replay.every((e) => e.live_pid_telemetry === 0 && e.process_launch === 0));
});

test('emitted rows are HBP-only and cross-checkable by Acer', () => {
  const rows = emitRows({ nodes: 64, frames: 16 });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.startsWith('ODYSCI3DMATH|') && row.includes('bh_index=sector*3072+lane*1024+glyph')));
  assert.ok(rows.some((row) => row.startsWith('ODYSCI3DHOST|') && row.includes('host_handle_bytes=8')));
  assert.ok(rows.some((row) => row.startsWith('ODYSCI3DEVENT|') && row.includes('live_pid_telemetry=0')));
  assert.ok(rows.some((row) => row.startsWith('ODYSCI3DGATE|') && row.includes('not-live-nanosecond-PID-telemetry')));
});

test('tool stays descriptor-only and does not launch UI or devices', () => {
  const source = readFileSync(new URL('../tools/behcs/odysseus-scientific-3d-field.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process|node:http|node:net|createWriteStream/);
});
