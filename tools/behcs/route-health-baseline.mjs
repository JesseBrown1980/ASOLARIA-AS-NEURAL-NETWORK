#!/usr/bin/env node
// route-health-baseline.mjs - read-only health baseline for the core fabric routes.
//
// CONTEXT (operator continue cycle 2026-06-13): after SLICE-ENGINE-LAW and the
// heal-envelope-emitter, the next queued item is a route-health baseline for the
// core moving lanes: Liris mirror :4944, BEHCS bus :4947, Acer fabric :4949.
//
// SAFETY: probe-only, HBP rows only, no spawn/exec/write/mint/restart. A DOWN or
// BOUNDARY result is an observation, not an action. Engines remain operator-gated.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const TOOL_ID = 'route-health-baseline.v1';
export const ROUTE_TARGETS = Object.freeze([
  Object.freeze({ id: 'liris_mirror_4944', role: 'liris-mirror-dashboard', base: 'http://127.0.0.1:4944', path: '/health' }),
  Object.freeze({ id: 'behcs_bus_4947', role: 'behcs-bus', base: 'http://127.0.0.1:4947', path: '/behcs/health' }),
  Object.freeze({ id: 'acer_fabric_4949', role: 'acer-fabric-dashboard', base: 'http://192.168.1.50:4949', path: '/health' }),
]);

const STATES = Object.freeze(['UP', 'ROUTE_BOUNDARY', 'HTTP_DEGRADED', 'DOWN', 'TIMEOUT', 'UNPROBED']);
const safe = (s) => { try { return String(s == null ? '' : s).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const sha16 = (s) => createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex').slice(0, 16).toUpperCase();
const isObj = (x) => x !== null && typeof x === 'object';

function targetById(id) {
  return ROUTE_TARGETS.find((t) => t.id === id);
}

function portOf(base) {
  try {
    const u = new URL(base);
    return Number(u.port || (u.protocol === 'https:' ? 443 : 80));
  } catch {
    return 0;
  }
}

function stateFor(sample) {
  const status = Number(sample.http_status || 0);
  const error = safe(sample.error).toLowerCase();
  if (sample.ok === true && status >= 200 && status < 300) return 'UP';
  if ([400, 401, 403, 404].includes(status)) return 'ROUTE_BOUNDARY';
  if (status > 0) return 'HTTP_DEGRADED';
  if (error.includes('timeout') || error.includes('abort')) return 'TIMEOUT';
  if (error) return 'DOWN';
  return 'UNPROBED';
}

export function normalizeProbe(sample = {}) {
  const raw = isObj(sample) ? sample : {};
  const target = targetById(raw.id) || {};
  const base = raw.base || target.base || '';
  const path = raw.path || target.path || '/health';
  const body = raw.body == null ? '' : String(raw.body).slice(0, 512);
  const priorHash = /^[0-9A-Fa-f]{16}$/.test(String(raw.body_sha16 || '')) ? String(raw.body_sha16).toUpperCase() : '';
  const out = {
    id: safe(raw.id || target.id || 'unknown'),
    role: safe(raw.role || target.role || 'unknown'),
    base: safe(base),
    port: Number(raw.port || portOf(base)),
    path: safe(path),
    ok: raw.ok === true,
    http_status: Number(raw.http_status || 0),
    latency_ms: Number.isFinite(raw.latency_ms) ? Math.max(0, Math.round(raw.latency_ms)) : 0,
    source: safe(raw.source || 'sample'),
    error: safe(raw.error || ''),
    body_sha16: priorHash || sha16(body),
  };
  out.state = STATES.includes(raw.state) ? raw.state : stateFor(out);
  out.answered = ['UP', 'ROUTE_BOUNDARY', 'HTTP_DEGRADED'].includes(out.state);
  return out;
}

export function routeHealthBaseline(samples = [], opts = {}) {
  const byId = new Map((Array.isArray(samples) ? samples : []).map((s) => [s?.id, s]));
  const results = ROUTE_TARGETS.map((target) => normalizeProbe(byId.get(target.id) || { ...target, source: 'unprobed' }));
  const counts = Object.fromEntries(STATES.map((s) => [s, results.filter((r) => r.state === s).length]));
  const answered = results.filter((r) => r.answered).length;
  return {
    tool: TOOL_ID,
    ts: opts.ts || new Date().toISOString(),
    process_launch: 0,
    read_only: true,
    results,
    summary: {
      target_count: ROUTE_TARGETS.length,
      up: counts.UP,
      route_boundary: counts.ROUTE_BOUNDARY,
      http_degraded: counts.HTTP_DEGRADED,
      down: counts.DOWN,
      timeout: counts.TIMEOUT,
      unprobed: counts.UNPROBED,
      answered,
      all_core_up: counts.UP === ROUTE_TARGETS.length,
      all_core_answered: answered === ROUTE_TARGETS.length,
    },
  };
}

export function emitRows(input) {
  try {
    const baseline = isObj(input) && Array.isArray(input.results) ? input : routeHealthBaseline([]);
    const s = baseline.summary || {};
    const rows = [
      `RHBHDR|tool=${TOOL_ID}|ts=${safe(baseline.ts)}|target_count=${safe(s.target_count)}|read_only=1|process_launch=0|json=0`,
    ];
    for (const r of baseline.results.map(normalizeProbe)) {
      rows.push(`RHBROUTE|id=${safe(r.id)}|role=${safe(r.role)}|base=${safe(r.base)}|port=${safe(r.port)}|path=${safe(r.path)}|state=${safe(r.state)}|http_status=${safe(r.http_status)}|latency_ms=${safe(r.latency_ms)}|source=${safe(r.source)}|error=${safe(r.error)}|body_sha16=${safe(r.body_sha16)}|json=0`);
    }
    rows.push(`RHBSUM|up=${safe(s.up)}|route_boundary=${safe(s.route_boundary)}|http_degraded=${safe(s.http_degraded)}|down=${safe(s.down)}|timeout=${safe(s.timeout)}|unprobed=${safe(s.unprobed)}|answered=${safe(s.answered)}|all_core_up=${s.all_core_up ? 1 : 0}|all_core_answered=${s.all_core_answered ? 1 : 0}|json=0`);
    rows.push('RHBGATE|read_only=1|probe_only=1|no_spawn=1|no_write=1|no_mint=1|no_restart=1|operator_gate_for_repair=1|tag=PROVEN-READONLY-BASELINE|json=0');
    return rows;
  } catch {
    return [
      `RHBHDR|tool=${TOOL_ID}|ts=INVALID|target_count=${ROUTE_TARGETS.length}|read_only=1|process_launch=0|json=0`,
      'RHBERROR|error=emit-threw-on-hostile-input|json=0',
      'RHBGATE|read_only=1|probe_only=1|no_spawn=1|no_write=1|no_mint=1|no_restart=1|operator_gate_for_repair=1|tag=INVALID-HELD|json=0',
    ];
  }
}

export async function probeTarget(target, opts = {}) {
  const started = Date.now();
  const fetcher = opts.fetcher || globalThis.fetch;
  const timeoutMs = Number.isFinite(opts.timeoutMs) ? Math.max(1, opts.timeoutMs) : 1500;
  const base = target?.base || '';
  const path = target?.path || '/health';
  if (typeof fetcher !== 'function') {
    return normalizeProbe({ ...target, source: 'live-fetch', error: 'fetch-unavailable', latency_ms: Date.now() - started });
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = new URL(path, base).toString();
    const response = await fetcher(url, { method: 'GET', signal: controller.signal, headers: { accept: 'application/json,text/plain,*/*' } });
    const body = typeof response.text === 'function' ? await response.text() : '';
    return normalizeProbe({
      ...target,
      source: 'live-fetch',
      ok: response.ok === true,
      http_status: response.status,
      latency_ms: Date.now() - started,
      body,
    });
  } catch (err) {
    const name = err && err.name === 'AbortError' ? 'timeout' : (err?.code || err?.message || 'fetch-error');
    return normalizeProbe({ ...target, source: 'live-fetch', error: name, latency_ms: Date.now() - started });
  } finally {
    clearTimeout(timer);
  }
}

export async function probeRoutes(opts = {}) {
  const results = [];
  for (const target of ROUTE_TARGETS) {
    results.push(await probeTarget(target, opts));
  }
  return routeHealthBaseline(results, { ts: opts.ts });
}

export function selfTest() {
  const samples = [
    { id: 'liris_mirror_4944', ok: true, http_status: 200, latency_ms: 12, body: '{"ok":true}' },
    { id: 'behcs_bus_4947', error: 'ECONNREFUSED', latency_ms: 4 },
    { id: 'acer_fabric_4949', http_status: 404, latency_ms: 30, body: '{"routes":["/health"]}' },
  ];
  const b = routeHealthBaseline(samples, { ts: '2026-06-13T23:00:00.000Z' });
  const rows = emitRows(b);
  const checks = [
    ['three-targets', b.results.length === 3],
    ['state-classification', b.results[0].state === 'UP' && b.results[1].state === 'DOWN' && b.results[2].state === 'ROUTE_BOUNDARY'],
    ['summary-counts', b.summary.up === 1 && b.summary.down === 1 && b.summary.route_boundary === 1 && b.summary.answered === 2],
    ['hbp-only', rows.every((r) => r.endsWith('|json=0') && !/[\r\n]/.test(r) && !r.includes('{"'))],
    ['gate-readonly', rows.some((r) => r.startsWith('RHBGATE|') && r.includes('no_restart=1'))],
    ['injection-safe', emitRows(routeHealthBaseline([{ id: 'liris_mirror_4944', error: 'x|json=0\nFAKE|x=1' }])).every((r) => !/[\r\n]/.test(r))],
    ['body-hash-preserved', rows.some((r) => r.includes(`body_sha16=${b.results[0].body_sha16}`)) && b.results[0].body_sha16 !== sha16('')],
  ].map(([name, ok]) => ({ name, ok: Boolean(ok) }));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const baseline = process.argv.includes('--probe')
    ? await probeRoutes()
    : routeHealthBaseline([
      { id: 'liris_mirror_4944', ok: true, http_status: 200, latency_ms: 0, source: 'fabric-health-read', body: 'ok=true service=super-asolaria-os-dashboard-liris-mirror port=4944' },
      { id: 'behcs_bus_4947', source: 'not-probed-in-demo' },
      { id: 'acer_fabric_4949', http_status: 404, source: 'fabric-route-map-read', body: 'route-map-visible health-path-boundary' },
    ], { ts: '2026-06-13T23:00:00.000Z' });
  for (const row of emitRows(baseline)) console.log(row);
}
