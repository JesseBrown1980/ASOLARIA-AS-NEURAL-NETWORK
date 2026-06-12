import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mintPid } from './github-pid-register.mjs';

export const RECONCILE_ID = 'github-live-pid-reconcile.v1';
export const SNAPSHOT_SOURCE = 'liris-supervisors-hbp-2026-06-12-count41-acer-office-pending';
export const RECONCILE_STATUS = Object.freeze({
  MATCH: 'MATCH',
  DIVERGENT: 'DIVERGENT',
  PENDING: 'PENDING-OFFICE-SNAPSHOT',
});

export const LIVE_SNAPSHOT = Object.freeze({
  shannon: Object.freeze({
    name: 'shannon',
    role: 'AGT',
    tier: 4,
    prime: 1,
    nest: 1,
    live_pid: 'AGT-SHANNON-PID-HD16C-A04-W1024-P01-N00001',
    live_hex: 'HD16C',
    live_source: 'AGT-SHANNON-PID-HD16C-A04-W1024-P01-N00001',
  }),
  hermes: Object.freeze({
    name: 'hermes',
    role: 'AGT',
    tier: 4,
    prime: 1,
    nest: 1,
    live_pid: 'AGT-HERMES-PID-HD17C-A04-W1024-P01-N00001',
    live_hex: 'HD17C',
    live_source: 'AGT-HERMES-PID-HD17C-A04-W1024-P01-N00001',
  }),
  deepseek: Object.freeze({
    name: 'deepseek',
    role: 'AGT',
    tier: 4,
    prime: 67,
    nest: 67,
    live_pid: 'AGT-DEEPSEEK-TUI-PID-HD15C-A04-W1024-P67-N00067',
    live_hex: 'HD15C',
    live_source: 'AGT-DEEPSEEK-TUI-PID-HD15C-A04-W1024-P67-N00067',
  }),
});

function keyFor(name) {
  const k = String(name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!k) throw new Error('name-required');
  return k;
}

function hbpValue(field, value) {
  const s = String(value ?? '');
  if (!s || /[|\r\n]/.test(s)) throw new Error(`${field}-invalid`);
  return s.replace(/[^A-Za-z0-9._:/-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
}

export function reconcile({ name, role = 'AGT', tier, prime, nest } = {}) {
  const key = keyFor(name);
  const snap = LIVE_SNAPSHOT[key];
  const p = mintPid({
    role: snap?.role || role,
    name: key,
    tier: tier ?? snap?.tier ?? 4,
    prime: prime ?? snap?.prime ?? 1,
    nest: nest ?? snap?.nest ?? 1,
  });
  if (!snap) {
    return {
      name: key,
      status: RECONCILE_STATUS.PENDING,
      snapshot_source: SNAPSHOT_SOURCE,
      github_pid: p.pid,
      github_hex: p.hex,
      github_sha16: p.sha16,
      live_pid: 'none',
      live_hex: 'none',
      live_source: 'none',
    };
  }
  const status = p.hex === snap.live_hex ? RECONCILE_STATUS.MATCH : RECONCILE_STATUS.DIVERGENT;
  return {
    name: key,
    status,
    snapshot_source: SNAPSHOT_SOURCE,
    github_pid: p.pid,
    github_hex: p.hex,
    github_sha16: p.sha16,
    live_pid: snap.live_pid,
    live_hex: snap.live_hex,
    live_source: snap.live_source,
  };
}

export function emitReconcileRow(r) {
  const x = r.status ? r : reconcile(r);
  return `PIDRECONCILE|name=${hbpValue('name', x.name)}|status=${x.status}|github_pid=${hbpValue('github_pid', x.github_pid)}|github_hex=${x.github_hex}|github_sha16=${x.github_sha16}|live_pid=${hbpValue('live_pid', x.live_pid)}|live_hex=${x.live_hex}|snapshot_source=${SNAPSHOT_SOURCE}|json=0`;
}

export function emitSnapshotRows() {
  const rows = [`PIDRECONCILEHDR|tool=${RECONCILE_ID}|snapshot_source=${SNAPSHOT_SOURCE}|entries=${Object.keys(LIVE_SNAPSHOT).length}|mode=github-proposed-vs-live-office-snapshot|json=0`];
  for (const name of Object.keys(LIVE_SNAPSHOT).sort()) rows.push(emitReconcileRow(reconcile({ name })));
  rows.push('PIDRECONCILEFTR|rule=github-pid-is-PROPOSED-until-live-office-assignment-or-alias-map-byte-receipted|unknown=PENDING-OFFICE-SNAPSHOT-not-fabricated|json=0');
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const shannon = reconcile({ name: 'shannon' });
  const hermes = reconcile({ name: 'hermes' });
  const deepseek = reconcile({ name: 'deepseek' });
  add('shannon-divergent', shannon.github_hex === 'HE2EC' && shannon.live_hex === 'HD16C' && shannon.status === RECONCILE_STATUS.DIVERGENT);
  add('hermes-divergent', hermes.github_hex === 'HDFEC' && hermes.live_hex === 'HD17C' && hermes.status === RECONCILE_STATUS.DIVERGENT);
  add('deepseek-corrected-h4dac', deepseek.github_hex === 'H4DAC' && deepseek.live_hex === 'HD15C' && deepseek.status === RECONCILE_STATUS.DIVERGENT);
  add('no-stale-hb5ec', deepseek.github_hex !== 'HB5EC');
  add('unknown-pending', reconcile({ name: 'new-model' }).status === RECONCILE_STATUS.PENDING);
  add('rows-hbp-only', emitSnapshotRows().every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  add('source-named', SNAPSHOT_SOURCE.includes('count41'));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitSnapshotRows()) console.log(row);
}
