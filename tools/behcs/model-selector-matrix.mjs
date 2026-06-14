#!/usr/bin/env node
// model-selector-matrix.mjs - held-safe M-cell selector for root front-end parity.
//
// This is not a model runner. It makes the front-end model_selector cell visible by
// mapping operator/front-end needs to already-receipted backend roles. Every row is
// descriptor-only: no model invocation, no fetch, no write, no spawn, no cutover.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SELECTOR_ID = 'model-selector-matrix.v1';
export const FRONTEND_CELL = 'M';
export const M_CELL_STATUS = 'PARTIAL_SELECTOR_ARTIFACT_BUILT_LIVE_MODEL_GATED';
export const STATUSES = Object.freeze(['GREEN', 'PARTIAL', 'GATED', 'RED']);

export const MODEL_ROLES = Object.freeze([
  Object.freeze({
    id: 'law-gate',
    lane: 'gate',
    status: 'GREEN',
    source: 'canon/laws/LAW-SLICE-ENGINE.md+docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
    evidence: 'SLICE-ENGINE-LAW-canonized-and-class1-cosign-sealed-seq3565',
    use: 'front-end-gate-state-and-action-vs-authorization-explainer',
    next: 'show-gate-state-without-implying-action',
  }),
  Object.freeze({
    id: 'fabric-council',
    lane: 'council',
    status: 'PARTIAL',
    source: 'mcp-asolaria-fabric-council-query+/api/council-verdicts',
    evidence: 'query-loop-proven-when-up-but-verdict-read-lane-availability-remains-partial',
    use: 'rank-next-bounded-work-when-the-fabric-lane-is-available',
    next: 'cold-path-verdict-cache-before-green',
  }),
  Object.freeze({
    id: 'heal-proposal',
    lane: 'self-heal',
    status: 'GREEN',
    source: 'tools/behcs/heal-envelope-emitter.mjs',
    evidence: 'schema-valid-proposal-emitter-hardened-against-injection-and-totality-attacks',
    use: 'render-self-heal-proposals-only',
    next: 'advance-only-through-registrar-cosign-feeder-daemons-under-gate',
  }),
  Object.freeze({
    id: 'mlc-descriptor',
    lane: 'engine-wiring',
    status: 'PARTIAL',
    source: 'tools/behcs/mlc-engine-wiring-increment.mjs',
    evidence: 'C036-descriptor-matrix-proven-launch-free-live-engine-not-launched',
    use: 'route-MTP-HRM-GNN-Fischer-Mamba-AoT-descriptor-questions',
    next: 'wait-for-fabric-ranked-live-daemon-contract-before-launch',
  }),
  Object.freeze({
    id: 'fischer-draft-standin',
    lane: 'judge',
    status: 'PARTIAL',
    source: 'tools/behcs/mlc-engine-wiring-increment.mjs',
    evidence: 'Fischer-is-explicitly-DRAFT_STANDIN_NOT_FISCHER-no-liveness-overclaim',
    use: 'display-draft-judge-score-with-warning',
    next: 'replace-standin-only-after-real-Fischer-contract-and-proof',
  }),
  Object.freeze({
    id: 'frozen-gemma-proof-gated',
    lane: 'vision',
    status: 'GATED',
    source: 'docs/ACER-VISUAL-PREDICTION-FROZEN-GEMMA-PROOF-GATE-2026-06-12.hbp',
    evidence: 'frozen-Gemma-loop-requires-double-run-frame-proof-receipts-before-claiming-live',
    use: 'route-pixel-world-or-vision-requests-to-proof-gate-not-live-model',
    next: 'C017-double-run-and-frame-proof-receipts',
  }),
  Object.freeze({
    id: 'answer-producer',
    lane: 'candidate',
    status: 'PARTIAL',
    source: 'tools/behcs/answer-producer.mjs',
    evidence: 'candidate-emitter-exists-but-loop-pending-lane-is-not-front-end-green',
    use: 'draft-answer-or-candidate-production-descriptor',
    next: 'stabilize-pending-lane-cold-path-receipt',
  }),
  Object.freeze({
    id: 'route-health',
    lane: 'sensor',
    status: 'GREEN',
    source: 'tools/behcs/route-health-baseline.mjs',
    evidence: '4944-4947-4949-route-health-baseline-and-bus-contract-fix-sealed',
    use: 'preflight-route-and-dashboard-health-questions',
    next: 'preserve-route-boundary-vs-down-distinction',
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

export function normalizeRole(input) {
  try {
    const id = safe(prop(input, 'id', 'unknown')) || 'unknown';
    const lane = safe(prop(input, 'lane', 'unknown')) || 'unknown';
    const source = safe(prop(input, 'source', 'CANNOT_SEE')) || 'CANNOT_SEE';
    const evidence = safe(prop(input, 'evidence', ''));
    const status = normalizeStatus(prop(input, 'status', 'RED'));
    return {
      id,
      lane,
      status,
      source,
      evidence,
      use: safe(prop(input, 'use', 'define-use')),
      next: safe(prop(input, 'next', 'define-next-proof')),
      live_invocation: 0,
      process_launch: 0,
      row_sha16: sha16([id, lane, status, source, evidence].join('|')),
    };
  } catch {
    return {
      id: 'invalid',
      lane: 'invalid',
      status: 'RED',
      source: 'CANNOT_SEE',
      evidence: 'normalize-threw',
      use: 'none',
      next: 'fix-invalid-selector-row',
      live_invocation: 0,
      process_launch: 0,
      row_sha16: sha16('invalid'),
    };
  }
}

export function selectRole(input = {}) {
  try {
    const need = safe(prop(input, 'need', input)).toLowerCase();
    const candidates = MODEL_ROLES.map(normalizeRole);
    const pick = (id, reason) => ({ need: safe(need || 'default'), selected: id, reason, role: candidates.find((r) => r.id === id) });
    if (/route|health|api|dashboard/.test(need)) return pick('route-health', 'route-needs-use-sensor-baseline');
    if (/\bheal\b|repair|\bself\b/.test(need)) return pick('heal-proposal', 'self-heal-needs-use-proposal-emitter-only');
    if (/mlc|engine|wire|mtp|hrm|gnn|mamba|aot/.test(need)) return pick('mlc-descriptor', 'engine-needs-use-descriptor-matrix-no-launch');
    if (/fischer|judge|score/.test(need)) return pick('fischer-draft-standin', 'judge-needs-use-draft-standin-warning');
    if (/gemma|vision|pixel|frame|world/.test(need)) return pick('frozen-gemma-proof-gated', 'vision-needs-use-proof-gate-not-live-model');
    if (/answer|candidate|draft/.test(need)) return pick('answer-producer', 'answer-needs-use-candidate-descriptor');
    if (/law|gate|cosign|authorization/.test(need)) return pick('law-gate', 'gate-needs-use-slice-engine-law');
    return pick('fabric-council', 'default-to-fabric-ranking-when-available');
  } catch {
    return { need: 'invalid', selected: 'fabric-council', reason: 'selector-threw-default-held', role: normalizeRole(MODEL_ROLES[1]) };
  }
}

export function buildSelector(input = MODEL_ROLES) {
  const roles = (Array.isArray(input) ? input : MODEL_ROLES).map(normalizeRole);
  const count = (status) => roles.filter((role) => role.status === status).length;
  const live_invocation_ready = false;
  return {
    tool: SELECTOR_ID,
    frontend_cell: FRONTEND_CELL,
    roles,
    summary: {
      total: roles.length,
      green: count('GREEN'),
      partial: count('PARTIAL'),
      gated: count('GATED'),
      red: count('RED'),
      live_invocation_ready,
      m_cell_status: M_CELL_STATUS,
      cutover_ready: false,
    },
  };
}

export function emitRows(input = MODEL_ROLES, opts = {}) {
  try {
    const built = buildSelector(input);
    const s = built.summary;
    const limitRaw = Number.parseInt(safe(prop(opts, 'limit', built.roles.length)), 10);
    const limit = Math.max(0, Math.min(Number.isFinite(limitRaw) ? limitRaw : built.roles.length, built.roles.length));
    const rows = [
      `MODSELHDR|tool=${SELECTOR_ID}|frontend_cell=${FRONTEND_CELL}|purpose=model-selector-M-visible-role-routing-before-any-model-invocation|roles=${s.total}|read_only=1|process_launch=0|live_model_invocation=0|no_fetch=1|no_write=1|no_spawn=1|json=0`,
      `MODSELSUM|green=${s.green}|partial=${s.partial}|gated=${s.gated}|red=${s.red}|M_cell_status=${s.m_cell_status}|cutover_ready=0|json=0`,
    ];
    for (const role of built.roles.slice(0, limit)) {
      rows.push(`MODSELROLE|id=${safe(role.id)}|lane=${safe(role.lane)}|status=${safe(role.status)}|source=${safe(role.source)}|use=${safe(role.use)}|next=${safe(role.next)}|row_sha16=${safe(role.row_sha16)}|process_launch=0|live_invocation=0|json=0`);
    }
    const need = prop(opts, 'need', '');
    if (need) {
      const selected = selectRole({ need });
      rows.push(`MODSELROUTE|need=${safe(selected.need)}|selected=${safe(selected.selected)}|reason=${safe(selected.reason)}|selected_status=${safe(prop(selected.role, 'status', 'RED'))}|json=0`);
    }
    rows.push(`MODSELGATE|front_end_cell=M|status=PARTIAL|reason=selector-artifact-built-but-live-model-invocation-and-frozen-Gemma-proof-remain-gated|process_launch=0|live_model_invocation=0|json=0`);
    return rows;
  } catch {
    return [
      `MODSELHDR|tool=${SELECTOR_ID}|frontend_cell=${FRONTEND_CELL}|purpose=model-selector-M-visible-role-routing-before-any-model-invocation|roles=0|read_only=1|process_launch=0|live_model_invocation=0|json=0`,
      'MODSELGATE|front_end_cell=M|status=RED|reason=emit-threw-held-invalid|process_launch=0|live_model_invocation=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const selector = buildSelector();
  add('all-roles-present', selector.summary.total === 8 && selector.roles.some((r) => r.id === 'frozen-gemma-proof-gated'));
  add('m-cell-partial-not-green', selector.summary.m_cell_status === M_CELL_STATUS && selector.summary.cutover_ready === false);
  add('no-live-invocation', selector.roles.every((r) => r.process_launch === 0 && r.live_invocation === 0) && selector.summary.live_invocation_ready === false);
  add('routes-heal', selectRole({ need: 'self heal proposal' }).selected === 'heal-proposal');
  add('routes-vision-to-proof-gate', selectRole({ need: 'pixel frame world model' }).selected === 'frozen-gemma-proof-gated');
  add('routes-default-to-council', selectRole({ need: 'unknown next work' }).selected === 'fabric-council');
  const hostile = emitRows([{ id: 'x|bad', lane: 'l\nbad', status: 'GREEN', source: 's|json=1', evidence: 'e\nMODSELGATE|process_launch=1' }], { need: 'fischer|json=1\nMODSELGATE|process_launch=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeRole({ get id() { throw new Error('boom'); } }); selectRole({ get need() { throw new Error('boom'); } }); emitRows(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const needArg = process.argv.find((arg) => arg.startsWith('--need='));
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const opts = {
    need: needArg ? needArg.slice('--need='.length) : '',
    limit: limitArg ? limitArg.slice('--limit='.length) : MODEL_ROLES.length,
  };
  process.stdout.write(emitRows(MODEL_ROLES, opts).join('\n') + '\n');
}
