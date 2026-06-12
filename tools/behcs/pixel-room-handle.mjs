import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { KIND_BITS, KINDS, classifyAgentType } from './github-pid-register.mjs';

export const PIXEL_ROOM_ID = 'pixel-room-handle.v1';
export const HANDLE_BYTES = 8;
export const UNIT_SEPARATOR = '\x1f';
export const READ_ACTIONS = Object.freeze(['LOOK', 'READ', 'PROBE', 'DIFF', 'HASH', 'INDEX', 'CAPTURE']);
export const DRAFT_ACTIONS = Object.freeze(['PLAN', 'PREDICT', 'CORRECT', 'ROLL_OUT', 'REVIEW']);
export const CONTROL_ACTIONS = Object.freeze(['TYPE', 'CLICK', 'ENTER', 'DRAG', 'SCROLL', 'HOTKEY', 'REMOTE_ACT', 'SHELL', 'WRITE', 'DELETE', 'SUBMIT', 'OPEN', 'LAUNCH', 'MINT']);

const sha256 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex');
const sha16 = (text) => sha256(text).slice(0, 16);
const SHA16_RE = /^[0-9a-f]{16}$/;

function safeScalar(field, value, { allowEmpty = false } = {}) {
  const s = String(value ?? '');
  if (!allowEmpty && s.length === 0) throw new Error(`${field}-required`);
  if (/[|\r\n\x1f]/.test(s)) throw new Error(`${field}-contains-hbp-or-tuple-delimiter`);
  return s;
}

function safeRuntime(runtime) {
  const rt = safeScalar('runtime', runtime).toLowerCase();
  if (!/^[a-z0-9._-]+$/.test(rt)) throw new Error(`runtime-must-be-token:${runtime}`);
  return rt;
}

function safeKind(kind) {
  const k = safeScalar('kind', kind || 'logical').toLowerCase();
  if (!KINDS.includes(k)) throw new Error(`kind-must-be-real-or-logical:${kind}`);
  return k;
}

function intInRange(field, value, min, max) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isInteger(n) || n < min || n > max) throw new Error(`${field}-out-of-range:${value}`);
  return n;
}

function hbpToken(field, value) {
  const s = safeScalar(field, value);
  const token = s.replace(/[^A-Za-z0-9._:/-]+/g, '-').replace(/^-|-$/g, '');
  return token || 'empty';
}

export function tuplePreimage(parts) {
  return [PIXEL_ROOM_ID, ...parts].map((part, i) => {
    const s = safeScalar(`tuple_${i}`, part);
    return `${Buffer.byteLength(s, 'utf8')}:${s}`;
  }).join(UNIT_SEPARATOR);
}

export function normalizeSha16(field, value = 'none') {
  const s = safeScalar(field, value, { allowEmpty: true }).toLowerCase();
  if (!s || s === 'none') return 'none';
  if (!SHA16_RE.test(s)) throw new Error(`${field}-must-be-lowercase-sha16-or-none`);
  return s;
}

export function classifyRoomAction(action) {
  const a = hbpToken('action', String(action || 'LOOK').toUpperCase()).replace(/-/g, '_');
  if (READ_ACTIONS.includes(a)) return { action: a, verdict: 'READ_READY', live_control: 0 };
  if (DRAFT_ACTIONS.includes(a)) return { action: a, verdict: 'DRAFT_READY', live_control: 0 };
  if (CONTROL_ACTIONS.includes(a)) return { action: a, verdict: 'DEFER_TO_OPERATOR', live_control: 1 };
  return { action: a, verdict: 'DEFER_TO_SUPERVISOR', live_control: 0 };
}

export function mintPixelRoom({
  runtime = 'codex',
  pid = 'PROPOSED',
  room,
  surface,
  route,
  tier = 8,
  kind = 'logical',
  prime = 0,
  nest = 1,
} = {}) {
  const rt = safeRuntime(runtime);
  const k = safeKind(kind);
  const p = intInRange('prime', prime, 0, 99);
  const t = intInRange('tier', tier, 0, 15);
  const n = intInRange('nest', nest, 1, 99999);
  const agentType = classifyAgentType({ yin_yang: k, prime: p });
  const pidValue = safeScalar('pid', pid);
  const roomValue = safeScalar('room', room);
  const surfaceValue = safeScalar('surface', surface);
  const routeValue = safeScalar('route', route);
  const preimage = tuplePreimage(['ROOM', rt, agentType, k, String(p), String(t), String(n), pidValue, roomValue, surfaceValue, routeValue]);
  const h = sha256(preimage);
  return {
    handle: h.slice(0, HANDLE_BYTES * 2),
    handle_bytes: HANDLE_BYTES,
    runtime: rt,
    pid: pidValue,
    room: roomValue,
    surface: surfaceValue,
    route: routeValue,
    route_sha16: sha16(routeValue),
    room_sha16: sha16(roomValue),
    surface_sha16: sha16(surfaceValue),
    tier: `A${String(t).padStart(2, '0')}`,
    nest: String(n).padStart(5, '0'),
    yin_yang: k,
    yin_yang_bit: KIND_BITS[k],
    prime: String(p).padStart(2, '0'),
    prime_mod3: p % 3,
    prime_parity: p % 2 === 0 ? 'even' : 'odd',
    agent_type: agentType,
    preimage_sha16: h.slice(16, 32),
  };
}

export function createPixelRoomTask(input = {}) {
  const room = mintPixelRoom(input);
  const a = classifyRoomAction(input.action || 'LOOK');
  return {
    ...room,
    ...a,
    pixel_sha16: normalizeSha16('pixel_sha16', input.pixel_sha16 ?? input.pixelSha16 ?? 'none'),
    pixel_delta_sha16: normalizeSha16('pixel_delta_sha16', input.pixel_delta_sha16 ?? input.pixelDeltaSha16 ?? 'none'),
    world_rollout_sha16: normalizeSha16('world_rollout_sha16', input.world_rollout_sha16 ?? input.worldRolloutSha16 ?? 'none'),
    correction_sha16: normalizeSha16('correction_sha16', input.correction_sha16 ?? input.correctionSha16 ?? 'none'),
    target_sha16: normalizeSha16('target_sha16', input.target_sha16 ?? input.targetSha16 ?? 'none'),
  };
}

export function emitPixelRoomRows(input = {}) {
  const task = input.handle ? input : createPixelRoomTask(input);
  return [
    `PIXROOMHDR|tool=${PIXEL_ROOM_ID}|handle=${task.handle}|handle_bytes=${task.handle_bytes}|pid=${hbpToken('pid', task.pid)}|runtime=${task.runtime}|agent_type=${task.agent_type}|tier=${task.tier}|room=${hbpToken('room', task.room)}|surface=${hbpToken('surface', task.surface)}|route_sha16=${task.route_sha16}|json=0`,
    `PIXROOMDIV|handle=${task.handle}|three_system=${task.agent_type}|yin_yang=${task.yin_yang}|yin_yang_bit=${task.yin_yang_bit}|prime=${task.prime}|prime_mod3=${task.prime_mod3}|prime_parity=${task.prime_parity}|nest=${task.nest}|rule=three-systems-three-rules-yin-yang-primes-all-pid|json=0`,
    `PIXROOMPROOF|handle=${task.handle}|action=${task.action}|verdict=${task.verdict}|pixel_sha16=${task.pixel_sha16}|pixel_delta_sha16=${task.pixel_delta_sha16}|world_rollout_sha16=${task.world_rollout_sha16}|correction_sha16=${task.correction_sha16}|target_sha16=${task.target_sha16}|raw_pixels=0|dom_authority=0|json=0`,
    `PIXROOMGATE|handle=${task.handle}|live_control=${task.live_control}|control_gate=${task.live_control ? 'DEFER_TO_OPERATOR' : 'not-live-control'}|economy=REAL-FREE-deterministic-sweep-plus-LOGICAL-WAVE-token-thrift-via-handles|mcp_payload=sha16-row-handles-not-full-context|nothing_launched=1|json=0`,
  ];
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
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
  const t = createPixelRoomTask({ ...base, action: 'LOOK', pixel_sha16: '0123456789abcdef' });
  add('handle-shape', /^[0-9a-f]{16}$/.test(t.handle));
  add('deterministic', createPixelRoomTask({ ...base, action: 'LOOK' }).handle === createPixelRoomTask({ ...base, action: 'LOOK' }).handle);
  add('tuple-split-no-collision', sha16(tuplePreimage(['a', 'b-c'])) !== sha16(tuplePreimage(['a-b', 'c'])));
  add('separation-logical', createPixelRoomTask({ ...base, kind: 'logical', prime: 0 }).agent_type === 'LOGICAL-WAVE');
  add('separation-frozen', createPixelRoomTask({ ...base, kind: 'real', prime: 0 }).agent_type === 'FROZEN-BRAIN');
  add('separation-real-free', createPixelRoomTask({ ...base, kind: 'real', prime: 1 }).agent_type === 'REAL-FREE');
  add('control-deferred', createPixelRoomTask({ ...base, action: 'TYPE' }).verdict === 'DEFER_TO_OPERATOR');
  add('no-raw-pixels-row', emitPixelRoomRows(t).some((row) => row.includes('raw_pixels=0') && row.includes('pixel_sha16=0123456789abcdef')));
  add('rows-hbp-only', emitPixelRoomRows(t).every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  add('hbp-injection-rejected', (() => { try { createPixelRoomTask({ ...base, room: 'bad|room' }); return false; } catch { return true; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitPixelRoomRows({
    runtime: process.argv[2] || 'codex',
    pid: process.argv[3] || 'PROPOSED',
    room: process.argv[4] || 'A08-scout-room-0001',
    surface: process.argv[5] || 'backend-pixels',
    route: process.argv[6] || '/api/omniscrcpy/status',
    action: process.argv[7] || 'LOOK',
    kind: 'logical',
    prime: 1,
  })) console.log(row);
}
