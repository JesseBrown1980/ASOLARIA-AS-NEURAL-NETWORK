#!/usr/bin/env node
// program-cube-ingestion-map.mjs - descriptor map for local programs before any cube promotion.
//
// This is a census and routing artifact only. It does not enumerate processes, read arbitrary
// program files, patch binaries, start daemons, mint cubes, or write outside stdout. Live changes
// must move through hookwall, GNN, OmniShannon, white-room, GC, and operator/fabric promotion.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const MAP_ID = 'program-cube-ingestion-map.v1';
export const STATUSES = Object.freeze([
  'OWNED_DESCRIPTOR_READY',
  'EXTERNAL_READ_ONLY',
  'DEVICE_WAITING_FOR_PHYSICAL',
  'CLOUD_COPY_ONLY',
  'GATED',
]);

export const PIPELINE = Object.freeze([
  'census',
  'map3',
  'cube3',
  'hookwall',
  'gnn',
  'omnishannon',
  'white-room',
  'gc',
  'promotion-gate',
]);

export const SURFACES = Object.freeze([
  Object.freeze({
    id: 'asolaria-nn-tools',
    lane: 'owned-repo',
    status: 'OWNED_DESCRIPTOR_READY',
    evidence: 'ASOLARIA-AS-NEURAL-NETWORK/tools/behcs',
    next: 'seal-descriptor-tools-and-tests-before-any-runtime-binding',
  }),
  Object.freeze({
    id: 'sister-onmetal-tools',
    lane: 'owned-repo',
    status: 'OWNED_DESCRIPTOR_READY',
    evidence: 'Asolaria-ASI-On-Metal-Fabric-and-matrix/tools',
    next: 'absorb-via-git-blob-hash-sidecars-before-cross-hydration',
  }),
  Object.freeze({
    id: 'live-node-processes',
    lane: 'external-program',
    status: 'EXTERNAL_READ_ONLY',
    evidence: '8-node-processes-observed-on-liris-host',
    next: 'map-process-owner-and-source-before-patch-proposal',
  }),
  Object.freeze({
    id: 'codex-session',
    lane: 'external-program',
    status: 'EXTERNAL_READ_ONLY',
    evidence: 'current-agent-host-process',
    next: 'do-not-self-modify-running-agent-use-repo-artifacts-only',
  }),
  Object.freeze({
    id: 'browser-webview-surfaces',
    lane: 'external-program',
    status: 'EXTERNAL_READ_ONLY',
    evidence: 'edge-webview-process-family',
    next: 'only-ingest-public-descriptor-claims-no-profile-or-token-access',
  }),
  Object.freeze({
    id: 'sovlinux-2tb',
    lane: 'device',
    status: 'DEVICE_WAITING_FOR_PHYSICAL',
    evidence: 'SOVLINUX-kernel-and-index-to-be-farmed-when-mounted',
    next: 'read-only-walk-first-then-cube-descriptors-no-raw-write',
  }),
  Object.freeze({
    id: 'usb-128gb',
    lane: 'device',
    status: 'DEVICE_WAITING_FOR_PHYSICAL',
    evidence: 'packed-usb-surface-to-be-farmed-when-mounted',
    next: 'read-only-walk-first-then-cube-descriptors-no-raw-write',
  }),
  Object.freeze({
    id: 'google-35tb-notebooklm',
    lane: 'cloud-copy',
    status: 'CLOUD_COPY_ONLY',
    evidence: 'NotebookLM-canon-docs-and-drive-copy',
    next: 'cloud-remains-copy-and-critic-not-primary-authority',
  }),
  Object.freeze({
    id: 'falcon-aether-phone-hosts',
    lane: 'device',
    status: 'GATED',
    evidence: 'phone-file-manager-hosts-require-per-device-proof',
    next: 'round-trip-pull-push-hash-proof-before-message-or-promotion',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

export function normalizeStatus(value) {
  const status = safe(value).toUpperCase();
  return STATUSES.includes(status) ? status : 'GATED';
}

export function normalizeSurface(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown'));
    const lane = safe(prop(input, 'lane', 'unknown'));
    const status = normalizeStatus(prop(input, 'status', 'GATED'));
    const evidence = safe(prop(input, 'evidence', 'not-proven'));
    const next = safe(prop(input, 'next', 'define-next-proof'));
    const map3 = sha16(`map:${id}:${lane}:${status}`);
    const cube3 = sha16(`cube:${map3}:${evidence}`);
    return Object.freeze({
      id,
      lane,
      status,
      evidence,
      next,
      map3,
      cube3,
      pid16: sha16(`pid:${id}:${cube3}`),
      process_launch: 0,
      live_patch: 0,
      raw_write: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      lane: 'invalid',
      status: 'GATED',
      evidence: 'normalize-threw',
      next: 'fix-invalid-program-surface-row',
      map3: sha16('invalid-map'),
      cube3: sha16('invalid-cube'),
      pid16: sha16('invalid-pid'),
      process_launch: 0,
      live_patch: 0,
      raw_write: 0,
    });
  }
}

export function buildMap(input = SURFACES) {
  const surfaces = (Array.isArray(input) ? input : SURFACES).map(normalizeSurface);
  const count = (status) => surfaces.filter((s) => s.status === status).length;
  return Object.freeze({
    tool: MAP_ID,
    pipeline: PIPELINE,
    surfaces,
    summary: Object.freeze({
      total: surfaces.length,
      owned: count('OWNED_DESCRIPTOR_READY'),
      external_read_only: count('EXTERNAL_READ_ONLY'),
      device_waiting: count('DEVICE_WAITING_FOR_PHYSICAL'),
      cloud_copy: count('CLOUD_COPY_ONLY'),
      gated: count('GATED'),
      ready_for_live_patch: false,
    }),
  });
}

export function emitRows(input = SURFACES, opts = {}) {
  try {
    const built = buildMap(input);
    const limitRaw = Number.parseInt(safe(prop(opts, 'limit', built.surfaces.length)), 10);
    const limit = Math.max(0, Math.min(Number.isFinite(limitRaw) ? limitRaw : built.surfaces.length, built.surfaces.length));
    const rows = [
      `PROGCUBEHDR|tool=${MAP_ID}|purpose=program-surface-to-cube-ingestion-map-before-any-local-program-update|surfaces=${built.summary.total}|pipeline=${PIPELINE.join('+')}|read_only=1|process_launch=0|live_patch=0|raw_write=0|json=0`,
      `PROGCUBESUM|owned=${built.summary.owned}|external_read_only=${built.summary.external_read_only}|device_waiting=${built.summary.device_waiting}|cloud_copy=${built.summary.cloud_copy}|gated=${built.summary.gated}|ready_for_live_patch=0|json=0`,
    ];
    for (const s of built.surfaces.slice(0, limit)) {
      rows.push(`PROGCUBE|id=${s.id}|lane=${s.lane}|status=${s.status}|evidence=${s.evidence}|map3=${s.map3}|cube3=${s.cube3}|pid16=${s.pid16}|next=${s.next}|process_launch=0|live_patch=0|raw_write=0|json=0`);
    }
    rows.push('PROGCUBEGATE|rule=census-before-patch+owner-proof-before-edit+hookwall-gnn-omnishannon-white-room-gc-before-promotion|blind_mutation=0|external_program_patch=0|device_raw_write=0|cloud_primary_authority=0|operator_cosign_required=1|json=0');
    return rows;
  } catch {
    return [
      `PROGCUBEHDR|tool=${MAP_ID}|purpose=program-surface-to-cube-ingestion-map-before-any-local-program-update|surfaces=0|read_only=1|process_launch=0|live_patch=0|raw_write=0|json=0`,
      'PROGCUBEGATE|rule=emit-threw-held-invalid|blind_mutation=0|external_program_patch=0|device_raw_write=0|operator_cosign_required=1|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildMap();
  add('all-surfaces-present', built.summary.total === 9 && built.surfaces.some((s) => s.id === 'sovlinux-2tb'));
  add('pipeline-has-gates', PIPELINE.includes('hookwall') && PIPELINE.includes('gnn') && PIPELINE.includes('omnishannon') && PIPELINE.includes('white-room') && PIPELINE.includes('gc'));
  add('no-live-mutation', built.surfaces.every((s) => s.process_launch === 0 && s.live_patch === 0 && s.raw_write === 0));
  add('unknown-status-gated', normalizeSurface({ id: 'x', status: 'launch-now' }).status === 'GATED');
  add('owned-not-live-ready', built.summary.owned === 2 && built.summary.ready_for_live_patch === false);
  add('device-and-cloud-bounded', built.summary.device_waiting === 2 && built.summary.cloud_copy === 1 && built.summary.gated === 1);
  const hostile = emitRows([{ id: 'bad|id', lane: 'l\nx', status: 'GREEN', evidence: 'e\nPROGCUBEGATE|live_patch=1', next: 'n|json=1' }]);
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('limit-works', emitRows(SURFACES, { limit: 1 }).filter((row) => row.startsWith('PROGCUBE|')).length === 1);
  add('total-never-throws', (() => { try { normalizeSurface({ get id() { throw new Error('boom'); } }); buildMap(null); emitRows(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows()) console.log(row);
}
