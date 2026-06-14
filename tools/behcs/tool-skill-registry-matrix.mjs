#!/usr/bin/env node
// tool-skill-registry-matrix.mjs - held-safe T-cell registry for root front-end parity.
//
// This is not a tool executor, not a submit form, and not a live daemon launcher. It
// makes the front-end tool_skill cell visible by routing tool/skill needs to sealed
// descriptor artifacts and naming the remaining gate. Descriptor-only: no fetch,
// no fs, no spawn, no write, no mint, no cutover.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REGISTRY_ID = 'tool-skill-registry-matrix.v1';
export const FRONTEND_CELL = 'T';
export const T_CELL_STATUS = 'PARTIAL_REGISTRY_ARTIFACT_BUILT_LIVE_TOOL_EXECUTION_GATED';
export const STATUSES = Object.freeze(['GREEN', 'PARTIAL', 'GATED', 'RED']);

export const REGISTRY_ITEMS = Object.freeze([
  Object.freeze({
    id: 'preload-catalog',
    kind: 'tool-index',
    status: 'GREEN',
    source: 'tools/behcs/fabric-agent-preload-catalog.mjs',
    exposes: 'laws+routes+tools+roles+workflow-preload-catalog',
    next: 'front-end-may-read-as-index-but-must-not-execute-actions-from-it',
  }),
  Object.freeze({
    id: 'model-selector-matrix',
    kind: 'frontend-tool',
    status: 'PARTIAL',
    source: 'tools/behcs/model-selector-matrix.mjs',
    exposes: 'M-cell-model-role-routing-with-live-invocation-held',
    next: 'runtime-proof-and-live-model-contract-before-green',
  }),
  Object.freeze({
    id: 'project-guide-matrix',
    kind: 'frontend-tool',
    status: 'PARTIAL',
    source: 'tools/behcs/project-guide-matrix.mjs',
    exposes: 'P-cell-guide-to-sealed-artifacts-and-open-gates',
    next: 'workflow-binding-and-submit-schema-before-green',
  }),
  Object.freeze({
    id: 'heal-envelope-emitter',
    kind: 'tool',
    status: 'GREEN',
    source: 'tools/behcs/heal-envelope-emitter.mjs',
    exposes: 'schema-valid-self-heal-proposal-envelopes-only',
    next: 'advance-only-through-registrar-cosign-feeder-daemons-under-gate',
  }),
  Object.freeze({
    id: 'route-health-baseline',
    kind: 'tool',
    status: 'GREEN',
    source: 'tools/behcs/route-health-baseline.mjs+docs/ACER-BUS-HEALTH-CONTRACT-FIX-2026-06-13.hbp',
    exposes: '4944-4947-4949-route-health-and-route-boundary-vs-down',
    next: 'keep-vantage-relative-labels-visible',
  }),
  Object.freeze({
    id: 'mlc-engine-wiring-increment',
    kind: 'tool',
    status: 'PARTIAL',
    source: 'tools/behcs/mlc-engine-wiring-increment.mjs',
    exposes: 'C036-MTP-HRM-GNN-Fischer-Mamba-AoT-descriptor-wiring',
    next: 'fabric-ranked-daemon-contract-before-process-launch',
  }),
  Object.freeze({
    id: 'fabric-council',
    kind: 'skill',
    status: 'PARTIAL',
    source: 'mcp-asolaria-fabric-council-query+/api/council-verdicts',
    exposes: 'ask-fabric-verdict-loop-when-available',
    next: 'cold-path-verdict-cache-before-green',
  }),
  Object.freeze({
    id: 'cosign-submit-schema',
    kind: 'tool',
    status: 'GATED',
    source: 'docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
    exposes: 'single-writer-cosign-submit-route-known-but-submit-schema-not-front-end-proofed',
    next: 'build-cosign-submit-schema-proof-before-exposing-submit-form',
  }),
  Object.freeze({
    id: 'live-engine-daemon-contract',
    kind: 'skill',
    status: 'GATED',
    source: 'docs/LIRIS-MLC-ENGINE-WIRING-INCREMENT-2026-06-14.hbp+docs/ACER-ATTACK-LIRIS-MLC-ENGINE-WIRING-2026-06-14.hbp',
    exposes: 'C036-live-engine-launch-remains-contract-gated',
    next: 'wait-for-fabric-ranked-daemon-route-and-schema-before-any-launch',
  }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => { try { return String(x == null ? '' : x).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

function normalizeStatus(value) {
  const status = safe(value).toUpperCase();
  return STATUSES.includes(status) ? status : 'RED';
}

export function normalizeItem(input) {
  try {
    const id = safe(prop(input, 'id', 'unknown')) || 'unknown';
    const kind = safe(prop(input, 'kind', 'tool')) || 'tool';
    const source = safe(prop(input, 'source', 'CANNOT_SEE')) || 'CANNOT_SEE';
    const exposes = safe(prop(input, 'exposes', 'define-visible-capability'));
    const status = normalizeStatus(prop(input, 'status', 'RED'));
    return {
      id,
      kind,
      status,
      source,
      exposes,
      next: safe(prop(input, 'next', 'define-next-proof')),
      process_launch: 0,
      live_tool_execution: 0,
      cutover: 0,
      row_sha16: sha16([id, kind, status, source, exposes].join('|')),
    };
  } catch {
    return {
      id: 'invalid',
      kind: 'invalid',
      status: 'RED',
      source: 'CANNOT_SEE',
      exposes: 'normalize-threw',
      next: 'fix-invalid-tool-skill-row',
      process_launch: 0,
      live_tool_execution: 0,
      cutover: 0,
      row_sha16: sha16('invalid'),
    };
  }
}

export function registryItem(input = {}) {
  try {
    const topic = safe(prop(input, 'topic', input)).toLowerCase();
    const items = REGISTRY_ITEMS.map(normalizeItem);
    const pick = (id, reason) => ({ topic: safe(topic || 'default'), selected: id, reason, item: items.find((x) => x.id === id) });
    if (/submit|schema|chain|cosign/.test(topic)) return pick('cosign-submit-schema', 'submit-requests-remain-schema-gated');
    if (/route|health|api|dashboard/.test(topic)) return pick('route-health-baseline', 'route-requests-use-health-baseline');
    if (/\bheal\b|repair|\bself\b/.test(topic)) return pick('heal-envelope-emitter', 'heal-requests-use-proposal-emitter-only');
    if (/model|selector|gemma|fischer/.test(topic)) return pick('model-selector-matrix', 'model-requests-use-M-selector-no-live-invocation');
    if (/project|guide|frontier|queue|catch/.test(topic)) return pick('project-guide-matrix', 'project-requests-use-P-guide');
    if (/live|daemon|launch/.test(topic)) return pick('live-engine-daemon-contract', 'live-daemon-requests-stay-contract-gated');
    if (/mlc|engine|mtp|hrm|gnn|mamba|aot/.test(topic)) return pick('mlc-engine-wiring-increment', 'engine-requests-use-descriptor-no-launch');
    if (/council|fabric|verdict|ask/.test(topic)) return pick('fabric-council', 'fabric-requests-use-council-loop-when-available');
    return pick('preload-catalog', 'default-to-preload-catalog-index');
  } catch {
    return { topic: 'invalid', selected: 'preload-catalog', reason: 'registry-threw-default-held', item: normalizeItem(REGISTRY_ITEMS[0]) };
  }
}

export function buildRegistry(input = REGISTRY_ITEMS) {
  const items = (Array.isArray(input) ? input : REGISTRY_ITEMS).map(normalizeItem);
  const count = (status) => items.filter((item) => item.status === status).length;
  return {
    tool: REGISTRY_ID,
    frontend_cell: FRONTEND_CELL,
    items,
    summary: {
      total: items.length,
      green: count('GREEN'),
      partial: count('PARTIAL'),
      gated: count('GATED'),
      red: count('RED'),
      t_cell_status: T_CELL_STATUS,
      live_tool_execution_ready: false,
      cutover_ready: false,
    },
  };
}

export function emitRows(input = REGISTRY_ITEMS, opts = {}) {
  try {
    const built = buildRegistry(input);
    const s = built.summary;
    const limitRaw = Number.parseInt(safe(prop(opts, 'limit', built.items.length)), 10);
    const limit = Math.max(0, Math.min(Number.isFinite(limitRaw) ? limitRaw : built.items.length, built.items.length));
    const rows = [
      `TOOLSKILLHDR|tool=${REGISTRY_ID}|frontend_cell=T|purpose=tool-skill-registry-before-any-live-tool-execution|items=${s.total}|read_only=1|process_launch=0|live_tool_execution=0|no_fetch=1|no_write=1|no_spawn=1|no_mint=1|no_cutover=1|json=0`,
      `TOOLSKILLSUM|green=${s.green}|partial=${s.partial}|gated=${s.gated}|red=${s.red}|T_cell_status=${s.t_cell_status}|cutover_ready=0|json=0`,
    ];
    for (const item of built.items.slice(0, limit)) {
      rows.push(`TOOLSKILL|id=${safe(item.id)}|kind=${safe(item.kind)}|status=${safe(item.status)}|source=${safe(item.source)}|exposes=${safe(item.exposes)}|next=${safe(item.next)}|row_sha16=${safe(item.row_sha16)}|process_launch=0|live_tool_execution=0|cutover=0|json=0`);
    }
    const topic = prop(opts, 'topic', '');
    if (topic) {
      const selected = registryItem({ topic });
      rows.push(`TOOLSKILLROUTE|topic=${safe(selected.topic)}|selected=${safe(selected.selected)}|reason=${safe(selected.reason)}|selected_status=${safe(prop(selected.item, 'status', 'RED'))}|json=0`);
    }
    rows.push('TOOLSKILLGATE|front_end_cell=T|status=PARTIAL|reason=registry-artifact-built-but-live-tool-execution-submit-form-and-live-daemon-contract-remain-gated|process_launch=0|live_tool_execution=0|cutover=0|json=0');
    return rows;
  } catch {
    return [
      `TOOLSKILLHDR|tool=${REGISTRY_ID}|frontend_cell=T|purpose=tool-skill-registry-before-any-live-tool-execution|items=0|read_only=1|process_launch=0|live_tool_execution=0|no_cutover=1|json=0`,
      'TOOLSKILLGATE|front_end_cell=T|status=RED|reason=emit-threw-held-invalid|process_launch=0|live_tool_execution=0|cutover=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const registry = buildRegistry();
  add('all-items-present', registry.summary.total === 9 && registry.items.some((x) => x.id === 'cosign-submit-schema'));
  add('t-cell-partial-not-green', registry.summary.t_cell_status === T_CELL_STATUS && registry.summary.cutover_ready === false);
  add('no-live-tool-execution', registry.items.every((x) => x.process_launch === 0 && x.live_tool_execution === 0 && x.cutover === 0));
  add('routes-cosign-schema', registryItem({ topic: 'cosign submit schema' }).selected === 'cosign-submit-schema');
  add('routes-tool-skill-default', registryItem({ topic: 'tool skill registry' }).selected === 'preload-catalog');
  add('routes-live-engine-gated', registryItem({ topic: 'live engine daemon launch' }).selected === 'live-engine-daemon-contract');
  const hostile = emitRows([{ id: 'x|bad', kind: 'tool\nbad', status: 'GREEN', source: 's|json=1', exposes: 'e\nTOOLSKILLGATE|process_launch=1' }], { topic: 'schema|json=1\nTOOLSKILLGATE|process_launch=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeItem({ get id() { throw new Error('boom'); } }); registryItem({ get topic() { throw new Error('boom'); } }); emitRows(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const topicArg = process.argv.find((arg) => arg.startsWith('--topic='));
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const opts = {
    topic: topicArg ? topicArg.slice('--topic='.length) : '',
    limit: limitArg ? limitArg.slice('--limit='.length) : REGISTRY_ITEMS.length,
  };
  process.stdout.write(emitRows(REGISTRY_ITEMS, opts).join('\n') + '\n');
}
