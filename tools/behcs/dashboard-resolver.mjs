#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// COMPONENT|1 dashboard resolver: (pid, device, timestamp) -> tightest-scoped
// dashboard route. Pure deterministic table lookup -- no live dashboard
// launch, no fabric call, no disk write. The LAW of this resolver:
// tightest possible, but NEVER tighter than the evidence supports.
// Anything unproven demotes down the ladder with an explicit gate; the
// resolver never guesses a tight route from dirty or conflicting inputs.

export const RESOLVER_ID = 'dashboard-resolver.v1';
export const FRESH_WINDOW_S = 3600;

export const DEVICES = Object.freeze({
  acer: { kind: 'desktop' },
  liris: { kind: 'desktop' },
  falcon: { kind: 'android' },
});

// BH-room scoping per PROVEN|1: scout00-03 / review04-07 / write08-15 / test16-23.
// room_source = P-field of the PID is a DRAFT ASSUMPTION -- bilateral contest welcome.
export const ROOM_BANDS = Object.freeze([
  Object.freeze({ band: 'scout', lo: 0, hi: 3 }),
  Object.freeze({ band: 'review', lo: 4, hi: 7 }),
  Object.freeze({ band: 'write', lo: 8, hi: 15 }),
  Object.freeze({ band: 'test', lo: 16, hi: 23 }),
]);

const PID_RE = /^([A-Z][A-Z0-9-]*)-PID-([A-Z][0-9A-F]{4})-A(\d{2})-W(\d{3})-P(\d{2})-N(\d{5})$/;
const TS_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const DIRTY_RE = /[|\r\n]/;

function hostHint(prefix) {
  if (prefix.startsWith('OP-')) return 'operator';
  if (prefix.includes('ACER')) return 'acer';
  if (prefix.includes('LIRIS')) return 'liris';
  if (prefix.includes('FALCON')) return 'falcon';
  return null;
}

function globalReadonly(gate) {
  const route = '/dash/global/readonly';
  return {
    ok: true,
    state: 'GLOBAL_READONLY',
    scope: 'GLOBAL_READONLY',
    route,
    eyes: `${route}/hbp`,
    hands: null,
    room_band: 'none',
    gates: [gate],
  };
}

function deviceScope(dev, gate) {
  const route = `/dash/${dev}`;
  return {
    ok: true,
    state: 'DEVICE_SCOPE',
    scope: 'DEVICE',
    route,
    eyes: `${route}/hbp`,
    hands: { url: `${route}/post`, gate: 'gated-POST-operator-cosign' },
    room_band: 'none',
    gates: [gate],
  };
}

export function resolveDashboard(pid, device, ts, nowIso) {
  // Rung 1: dirty input never routes. Pipe/CR/LF or non-string (when present)
  // is rejected outright so no caller input can reach a route or an HBP row.
  for (const [label, value] of [['pid', pid], ['device', device], ['ts', ts], ['now', nowIso]]) {
    if (value != null && (typeof value !== 'string' || DIRTY_RE.test(value))) {
      return {
        ok: false,
        state: 'INVALID_INPUT',
        scope: 'NONE',
        route: null,
        eyes: null,
        hands: null,
        room_band: 'none',
        gates: [`dirty-${label}`],
      };
    }
  }

  // Rung 2: without a known device there is no device dashboard to scope to.
  const dev = Object.hasOwn(DEVICES, String(device ?? '').toLowerCase())
    ? String(device).toLowerCase()
    : null;
  if (!dev) return globalReadonly('unknown-or-missing-device');

  // Rung 3: a valid PID whose host prefix contradicts the device is a
  // conflict -- the resolver never picks a side, it demotes to broadest.
  const pidMatch = PID_RE.exec(String(pid ?? ''));
  if (pidMatch) {
    const hint = hostHint(pidMatch[1]);
    if (hint && hint !== 'operator' && hint !== dev) {
      return globalReadonly(`pid-device-conflict:${hint}-vs-${dev}`);
    }
  }

  // Rung 4: no valid PID -> device scope only.
  if (!pidMatch) return deviceScope(dev, 'invalid-or-missing-pid');

  // Rungs 5-7: the timestamp must be strict ISO-8601 Zulu, not in the
  // future, and inside the freshness window, or the tuple is not proven.
  if (!TS_RE.test(String(nowIso ?? ''))) return deviceScope(dev, 'malformed-now');
  if (!TS_RE.test(String(ts ?? ''))) return deviceScope(dev, 'malformed-ts');
  const tsMs = Date.parse(ts);
  const nowMs = Date.parse(nowIso);
  if (Number.isNaN(tsMs) || Number.isNaN(nowMs)) return deviceScope(dev, 'unparseable-ts');
  if (tsMs > nowMs) return deviceScope(dev, 'ts-in-future');
  if ((nowMs - tsMs) / 1000 > FRESH_WINDOW_S) return deviceScope(dev, 'stale-ts');

  // Rung 8: full tuple proven -> AGENT_TIGHT. Route is built only from the
  // device table key, the regex-validated PID, and fixed literals.
  const plane = Number(pidMatch[5]);
  const band = ROOM_BANDS.find((b) => plane >= b.lo && plane <= b.hi) ?? null;
  const route = `/dash/${dev}/pid/${pidMatch[0]}${band ? `/room/${band.band}${pidMatch[5]}` : ''}`;
  return {
    ok: true,
    state: 'AGENT_TIGHT',
    scope: 'AGENT',
    route,
    eyes: `${route}/hbp`,
    hands: { url: `${route}/post`, gate: 'gated-POST-operator-cosign' },
    room_band: band ? band.band : 'none',
    gates: [],
  };
}

function sha16(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

export function statusRows() {
  const rows = [
    `DASHRESHDR|ok=1|id=${RESOLVER_ID}|component=1|devices=${Object.keys(DEVICES).length}|bands=${ROOM_BANDS.length}|fresh_window_s=${FRESH_WINDOW_S}|state=RESOLVER_READY_NO_LAUNCH_NO_FABRIC_CALL|json=0`,
    'DASHRESLADDER|rung=1|rule=dirty-input-never-routes|verdict=INVALID_INPUT|json=0',
    'DASHRESLADDER|rung=2|rule=unknown-or-missing-device|verdict=GLOBAL_READONLY|json=0',
    'DASHRESLADDER|rung=3|rule=pid-device-conflict-never-guess|verdict=GLOBAL_READONLY|json=0',
    'DASHRESLADDER|rung=4|rule=invalid-or-missing-pid|verdict=DEVICE_SCOPE|json=0',
    'DASHRESLADDER|rung=5|rule=malformed-ts-or-now|verdict=DEVICE_SCOPE|json=0',
    'DASHRESLADDER|rung=6|rule=ts-in-future|verdict=DEVICE_SCOPE|json=0',
    'DASHRESLADDER|rung=7|rule=stale-ts-beyond-window|verdict=DEVICE_SCOPE|json=0',
    'DASHRESLADDER|rung=8|rule=full-tuple-proven|verdict=AGENT_TIGHT|json=0',
  ];
  for (const [id, meta] of Object.entries(DEVICES)) {
    rows.push(`DASHRESDEVICE|id=${id}|kind=${meta.kind}|route=/dash/${id}|json=0`);
  }
  for (const band of ROOM_BANDS) {
    rows.push(`DASHRESBAND|band=${band.band}|lo=${String(band.lo).padStart(2, '0')}|hi=${String(band.hi).padStart(2, '0')}|source=P-field-DRAFT-ASSUMPTION|json=0`);
  }
  rows.push('DASHRESSAFETY|mutates=0|pure_function=1|no_live_dashboard_launch=1|no_fabric_call=1|json=0');
  rows.push(`DASHRESEND|rungs=8|state=COMPONENT_1_SEED|json=0`);
  return rows;
}

// STEP|166-style parity: fixed clock, fixed cases, host- and time-free rows.
// Regenerated rows must byte-match the sealed baseline on every machine.
const PARITY_NOW = '2026-06-11T12:00:00.000Z';
const PARITY_CASES = Object.freeze([
  { id: '01', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer', ts: '2026-06-11T11:59:00.000Z' },
  { id: '02', pid: 'LIRIS-PID-H2BC1-A07-W110-P05-N00001', device: 'liris', ts: '2026-06-11T11:30:00.000Z' },
  { id: '03', pid: 'OP-JESSE-PID-G0000-A00-W000-P00-N00000', device: 'falcon', ts: '2026-06-11T11:59:59.000Z' },
  { id: '04', pid: null, device: 'acer', ts: '2026-06-11T11:59:00.000Z' },
  { id: '05', pid: 'NOT-A-REAL-PID', device: 'liris', ts: '2026-06-11T11:59:00.000Z' },
  { id: '06', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'toaster', ts: '2026-06-11T11:59:00.000Z' },
  { id: '07', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer', ts: '2026-06-11T09:00:00.000Z' },
  { id: '08', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer', ts: 'yesterday-ish' },
  { id: '09', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'acer', ts: '2026-06-11T13:00:00.000Z' },
  { id: '10', pid: 'ACER-PID-H9E2A-A07-W104-P00-N00000', device: 'liris', ts: '2026-06-11T11:59:00.000Z' },
  { id: '11', pid: 'EVIL-PID|json=1', device: 'acer', ts: '2026-06-11T11:59:00.000Z' },
  { id: '12', pid: 'ACER-PID-H9E2A-A07-W104-P24-N00000', device: 'acer', ts: '2026-06-11T11:59:00.000Z' },
]);

export function emitParityRows() {
  const rows = [
    `DASHRESPARITYHDR|component=1|cases=${PARITY_CASES.length}|fixed_now=${PARITY_NOW}|rule=rows-byte-identical-on-every-machine|json=0`,
  ];
  const outputs = [];
  for (const probe of PARITY_CASES) {
    const out = resolveDashboard(probe.pid, probe.device, probe.ts, PARITY_NOW);
    const serialized = JSON.stringify(out);
    outputs.push(serialized);
    rows.push(
      `DASHRESPARITY|case=${probe.id}|input_sha16=${sha16([probe.pid, probe.device, probe.ts])}|state=${out.state}|scope=${out.scope}|route=${out.route ?? 'none'}|room_band=${out.room_band}|gates=${out.gates.length ? out.gates.join('+') : 'none'}|output_sha16=${sha16(serialized)}|json=0`,
    );
  }
  rows.push(
    `DASHRESPARITYFTR|cases=${PARITY_CASES.length}|bundle_sha16=${sha16(outputs.join('\n'))}|exit=byte-match-when-regenerated-file-equals-sealed-baseline|json=0`,
  );
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok });
  const NOW = PARITY_NOW;

  const tight = resolveDashboard('ACER-PID-H9E2A-A07-W104-P00-N00000', 'acer', '2026-06-11T11:59:00.000Z', NOW);
  add('agent-tight-with-scout-band', tight.state === 'AGENT_TIGHT' && tight.room_band === 'scout' && tight.route.endsWith('/room/scout00'));
  add('missing-pid-demotes-to-device', resolveDashboard(null, 'acer', '2026-06-11T11:59:00.000Z', NOW).state === 'DEVICE_SCOPE');
  add('unknown-device-demotes-to-global', resolveDashboard('ACER-PID-H9E2A-A07-W104-P00-N00000', 'toaster', '2026-06-11T11:59:00.000Z', NOW).state === 'GLOBAL_READONLY');
  add('stale-ts-demotes-to-device', resolveDashboard('ACER-PID-H9E2A-A07-W104-P00-N00000', 'acer', '2026-06-11T09:00:00.000Z', NOW).gates.includes('stale-ts'));
  add('conflict-demotes-to-global', resolveDashboard('ACER-PID-H9E2A-A07-W104-P00-N00000', 'liris', '2026-06-11T11:59:00.000Z', NOW).gates[0].startsWith('pid-device-conflict'));
  add('operator-pid-no-conflict', resolveDashboard('OP-JESSE-PID-G0000-A00-W000-P00-N00000', 'falcon', '2026-06-11T11:59:59.000Z', NOW).state === 'AGENT_TIGHT');
  add('pipe-pid-rejected', resolveDashboard('EVIL-PID|json=1', 'acer', '2026-06-11T11:59:00.000Z', NOW).state === 'INVALID_INPUT');
  add('global-hands-are-null', resolveDashboard('x', 'toaster', 'x', NOW).hands === null);
  add('status-rows-hbp-only', statusRows().every((row) => row.endsWith('json=0') && !row.includes('{"')));

  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--parity') {
    process.stdout.write(emitParityRows().join('\n') + '\n');
  } else if (cmd === '--resolve') {
    const [pid, device, ts, now] = process.argv.slice(3);
    console.log(JSON.stringify(resolveDashboard(pid, device, ts, now ?? new Date().toISOString()), null, 2));
  } else {
    console.error('usage: dashboard-resolver.mjs --status | --self-test | --parity | --resolve <pid> <device> <ts> [now]');
    process.exit(1);
  }
}
