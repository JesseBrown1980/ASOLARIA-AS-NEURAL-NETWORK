import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyRoomAction,
  createFolderHostCall,
  createPixelRoomTask,
  emitFolderHostRows,
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
  assert.match(a.identity16, /^[0-9a-f]{32}$/);
  assert.equal(a.identity_bytes, 16);
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
  assert.equal(createPixelRoomTask({ ...base, kind: 'real', prime: 4 }).room_lane, 'L1');
});

test('control actions are gated; read and draft actions are not live control', () => {
  assert.equal(classifyRoomAction('LOOK').verdict, 'READ_READY');
  assert.equal(classifyRoomAction('LOOK').live_control, 0);
  assert.equal(classifyRoomAction('PREDICT').verdict, 'DRAFT_READY');
  assert.equal(classifyRoomAction('PREDICT').live_control, 0);
  assert.equal(classifyRoomAction('TYPE').verdict, 'DEFER_TO_OPERATOR');
  assert.equal(classifyRoomAction('TYPE').live_control, 1);
});

test('surface-tier gates fail closed for hidden or unknown actions', () => {
  const hidden = createPixelRoomTask({ ...base, surface_tier: 'hidden', action: 'LOOK' });
  assert.equal(hidden.verdict, 'DEFER_TO_SUPERVISOR');
  assert.equal(hidden.live_control, 1);
  assert.equal(hidden.access_gate, 'restricted-surface');
  const typo = createPixelRoomTask({ ...base, action: 'typ' });
  assert.equal(typo.verdict, 'DEFER_TO_SUPERVISOR');
  assert.equal(typo.live_control, 1);
  assert.equal(typo.access_gate, 'unknown-action-fail-closed');
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

test('folder dashboard can delegate to a lower-level host row without launching it', () => {
  const call = createFolderHostCall({
    ...base,
    folder: 'dashboards/A08',
    host_process: 'child-host.mjs',
    child_room: 'A09-child-room',
    child_route: '/api/child/room',
    child_action: 'PLAN',
  });
  assert.equal(call.parent.tier, 'A08');
  assert.equal(call.child.tier, 'A09');
  assert.equal(call.process_launch, 0);
  assert.equal(call.process_gate, 'HBP_ROW_ONLY');
  assert.equal(call.logical_nesting, 'row-chain-unbounded');
  const rows = emitFolderHostRows(call);
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  assert.ok(rows.some((row) => row.includes('PIXFOLDERHOST|')));
  assert.ok(rows.some((row) => row.includes('process_launch=0')));
});

test('folder host calls can chain through all 16 physical levels without reminting parent strings', () => {
  let parent = createPixelRoomTask({ ...base, tier: 0, room: 'root-room', action: 'LOOK' });
  const delegations = new Set();
  let rows = 0;
  for (let level = 1; level <= 15; level += 1) {
    const call = createFolderHostCall({
      parent,
      child_room: `room-level-${level}`,
      child_tier: level,
      child_nest: level + 1,
      child_action: 'LOOK',
      folder: `dashboards/A${String(level).padStart(2, '0')}`,
      host_process: 'HBP-ROW-ONLY',
    });
    delegations.add(call.delegation_sha16);
    rows += emitFolderHostRows(call).length;
    assert.equal(call.process_launch, 0);
    assert.equal(call.child.tier, `A${String(level).padStart(2, '0')}`);
    parent = call.child;
  }
  assert.equal(parent.tier, 'A15');
  assert.equal(delegations.size, 15);
  assert.equal(rows, 45);
});
