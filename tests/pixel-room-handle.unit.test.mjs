import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyRoomAction,
  createPixelRoomTask,
  emitPixelRoomRows,
  mintPixelRoom,
  normalizeSha16,
  selfTest,
  tuplePreimage,
} from '../tools/behcs/pixel-room-handle.mjs';

const base = {
  runtime: 'codex',
  pid: 'AGT-PIXEL-ROOM-PID-H000C-A08-W1024-P01-N00001',
  room: 'A08-scout-room-0001',
  surface: 'omniscrcpy-backend',
  route: '/api/omniscrcpy/status',
  tier: 8,
  kind: 'logical',
  prime: 1,
};

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('mints deterministic 8-byte room handles', () => {
  const a = mintPixelRoom(base);
  const b = mintPixelRoom(base);
  assert.match(a.handle, /^[0-9a-f]{16}$/);
  assert.equal(a.handle_bytes, 8);
  assert.equal(a.handle, b.handle);
});

test('tuple preimage is unambiguous and rejects HBP injection delimiters', () => {
  assert.notEqual(tuplePreimage(['a', 'b-c']), tuplePreimage(['a-b', 'c']));
  assert.throws(() => tuplePreimage(['ok', 'bad|pipe']));
  assert.throws(() => createPixelRoomTask({ ...base, route: '/ok\nbad' }));
});

test('three systems are regulated by yin-yang and prime parity', () => {
  assert.equal(createPixelRoomTask({ ...base, kind: 'logical', prime: 0 }).agent_type, 'LOGICAL-WAVE');
  assert.equal(createPixelRoomTask({ ...base, kind: 'real', prime: 0 }).agent_type, 'FROZEN-BRAIN');
  assert.equal(createPixelRoomTask({ ...base, kind: 'real', prime: 1 }).agent_type, 'REAL-FREE');
  assert.equal(createPixelRoomTask({ ...base, kind: 'real', prime: 4 }).prime_mod3, 1);
});

test('control actions are gated; read and draft actions are not live control', () => {
  assert.deepEqual(classifyRoomAction('LOOK'), { action: 'LOOK', verdict: 'READ_READY', live_control: 0 });
  assert.deepEqual(classifyRoomAction('PREDICT'), { action: 'PREDICT', verdict: 'DRAFT_READY', live_control: 0 });
  assert.deepEqual(classifyRoomAction('TYPE'), { action: 'TYPE', verdict: 'DEFER_TO_OPERATOR', live_control: 1 });
});

test('proof rows carry hashes only, not raw pixel payloads or DOM authority', () => {
  const task = createPixelRoomTask({
    ...base,
    action: 'LOOK',
    pixel_sha16: '0123456789abcdef',
    pixel_delta_sha16: '1111111111111111',
    world_rollout_sha16: '2222222222222222',
    correction_sha16: '3333333333333333',
  });
  const rows = emitPixelRoomRows(task);
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  assert.ok(rows.some((row) => row.includes('raw_pixels=0') && row.includes('dom_authority=0')));
  assert.ok(rows.some((row) => row.includes('pixel_sha16=0123456789abcdef')));
});

test('sha16 slots require lowercase digest handles or none', () => {
  assert.equal(normalizeSha16('pixel_sha16', 'none'), 'none');
  assert.equal(normalizeSha16('pixel_sha16', 'ABCDEFABCDEFABCD'), 'abcdefabcdefabcd');
  assert.throws(() => normalizeSha16('pixel_sha16', 'not-a-digest'));
});

test('emitted rows include MCP token-thrift and no live launch', () => {
  const rows = emitPixelRoomRows({ ...base, action: 'CLICK' });
  assert.ok(rows.some((row) => row.includes('control_gate=DEFER_TO_OPERATOR')));
  assert.ok(rows.some((row) => row.includes('mcp_payload=sha16-row-handles-not-full-context')));
  assert.ok(rows.some((row) => row.includes('nothing_launched=1')));
});
