#!/usr/bin/env node
// project-guide-matrix.mjs - held-safe P-cell guide for root front-end parity.
//
// This is not a UI and not a workflow executor. It gives the front end a stable
// project-guide table: each guide section points to sealed repo artifacts and
// names the remaining gate. No spawn, no fetch, no write, no cutover.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const GUIDE_ID = 'project-guide-matrix.v1';
export const FRONTEND_CELL = 'P';
export const P_CELL_STATUS = 'PARTIAL_GUIDE_ARTIFACT_BUILT_WORKFLOW_BINDING_GATED';
export const STATUSES = Object.freeze(['GREEN', 'PARTIAL', 'GATED', 'RED']);

export const GUIDE_SECTIONS = Object.freeze([
  Object.freeze({
    id: 'law-spine',
    status: 'GREEN',
    source: 'canon/laws/LAW-SLICE-ENGINE.md+docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
    shows: 'canonical-law+class1-cosign-seal+authorization-vs-action-boundary',
    next: 'display-as-gate-context-not-action-button',
  }),
  Object.freeze({
    id: 'frontier-queue',
    status: 'PARTIAL',
    source: 'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp+tools/behcs/catch-count-ledger.mjs',
    shows: 'self-extending-frontier-queue+open-partial-catch-state',
    next: 'continue-ask-fabric-loop-until-open-gates-close',
  }),
  Object.freeze({
    id: 'frontend-parity',
    status: 'PARTIAL',
    source: 'tools/behcs/frontend-parity-matrix.mjs',
    shows: 'M-T-P-C-Q-R-E-A-D-G-cell-state-before-cutover',
    next: 'all-cells-green-plus-operator-cosign-before-any-cutover',
  }),
  Object.freeze({
    id: 'model-selector',
    status: 'PARTIAL',
    source: 'tools/behcs/model-selector-matrix.mjs',
    shows: 'model-role-routing-with-live-invocation-held-at-zero',
    next: 'runtime-proof-and-live-model-contract-before-green',
  }),
  Object.freeze({
    id: 'engine-wiring',
    status: 'PARTIAL',
    source: 'tools/behcs/mlc-engine-wiring-increment.mjs',
    shows: 'C036-descriptor-wiring-MTP-HRM-GNN-Fischer-Mamba-AoT',
    next: 'fabric-ranked-daemon-contract-before-process-launch',
  }),
  Object.freeze({
    id: 'route-health',
    status: 'GREEN',
    source: 'tools/behcs/route-health-baseline.mjs+docs/ACER-BUS-HEALTH-CONTRACT-FIX-2026-06-13.hbp',
    shows: 'route-boundary-vs-down-and-canonical-4947-behcs-health-contract',
    next: 'keep-vantage-relative-labels-visible',
  }),
  Object.freeze({
    id: 'cosign-submit',
    status: 'GATED',
    source: 'docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
    shows: 'single-writer-cosign-submit-route-known-from-seal-receipt-but-schema-proof-not-yet-front-end-artifact',
    next: 'build-cosign-submit-schema-proof-before-exposing-submit-form',
  }),
  Object.freeze({
    id: 'memory-index',
    status: 'GREEN',
    source: 'docs/CLAIMSLEDGER-2026-06-12.hbp+docs/ASOLARIA-AS-NEURAL-NETWORK.hbp',
    shows: 'receipted-claims-and-memory-index-discipline',
    next: 'show-only-tagged-receipted-claims',
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

export function normalizeSection(input) {
  try {
    const id = safe(prop(input, 'id', 'unknown')) || 'unknown';
    const source = safe(prop(input, 'source', 'CANNOT_SEE')) || 'CANNOT_SEE';
    const status = normalizeStatus(prop(input, 'status', 'RED'));
    const shows = safe(prop(input, 'shows', 'define-visible-guide'));
    return {
      id,
      status,
      source,
      shows,
      next: safe(prop(input, 'next', 'define-next-proof')),
      process_launch: 0,
      cutover: 0,
      row_sha16: sha16([id, status, source, shows].join('|')),
    };
  } catch {
    return {
      id: 'invalid',
      status: 'RED',
      source: 'CANNOT_SEE',
      shows: 'normalize-threw',
      next: 'fix-invalid-guide-row',
      process_launch: 0,
      cutover: 0,
      row_sha16: sha16('invalid'),
    };
  }
}

export function guideSection(input = {}) {
  try {
    const topic = safe(prop(input, 'topic', input)).toLowerCase();
    const sections = GUIDE_SECTIONS.map(normalizeSection);
    const pick = (id, reason) => ({ topic: safe(topic || 'default'), selected: id, reason, section: sections.find((s) => s.id === id) });
    if (/submit|schema|chain/.test(topic)) return pick('cosign-submit', 'cosign-submit-remains-schema-gated');
    if (/law|gate|cosign|authorization/.test(topic)) return pick('law-spine', 'law-and-gate-context');
    if (/queue|frontier|catch|open|partial/.test(topic)) return pick('frontier-queue', 'frontier-and-catch-state');
    if (/front|parity|cutover|cell/.test(topic)) return pick('frontend-parity', 'frontend-cell-state');
    if (/model|selector|gemma|fischer/.test(topic)) return pick('model-selector', 'model-role-routing');
    if (/engine|mlc|mtp|hrm|mamba|aot/.test(topic)) return pick('engine-wiring', 'engine-wiring-descriptor');
    if (/route|health|api|dashboard/.test(topic)) return pick('route-health', 'route-health-guide');
    return pick('memory-index', 'default-to-receipted-memory-index');
  } catch {
    return { topic: 'invalid', selected: 'memory-index', reason: 'guide-threw-default-held', section: normalizeSection(GUIDE_SECTIONS[7]) };
  }
}

export function buildGuide(input = GUIDE_SECTIONS) {
  const sections = (Array.isArray(input) ? input : GUIDE_SECTIONS).map(normalizeSection);
  const count = (status) => sections.filter((section) => section.status === status).length;
  return {
    tool: GUIDE_ID,
    frontend_cell: FRONTEND_CELL,
    sections,
    summary: {
      total: sections.length,
      green: count('GREEN'),
      partial: count('PARTIAL'),
      gated: count('GATED'),
      red: count('RED'),
      p_cell_status: P_CELL_STATUS,
      cutover_ready: false,
    },
  };
}

export function emitRows(input = GUIDE_SECTIONS, opts = {}) {
  try {
    const built = buildGuide(input);
    const s = built.summary;
    const limitRaw = Number.parseInt(safe(prop(opts, 'limit', built.sections.length)), 10);
    const limit = Math.max(0, Math.min(Number.isFinite(limitRaw) ? limitRaw : built.sections.length, built.sections.length));
    const rows = [
      `PROJGUIDEHDR|tool=${GUIDE_ID}|frontend_cell=P|purpose=project-guide-before-any-front-end-cutover|sections=${s.total}|read_only=1|process_launch=0|no_fetch=1|no_write=1|no_spawn=1|no_cutover=1|json=0`,
      `PROJGUIDESUM|green=${s.green}|partial=${s.partial}|gated=${s.gated}|red=${s.red}|P_cell_status=${s.p_cell_status}|cutover_ready=0|json=0`,
    ];
    for (const section of built.sections.slice(0, limit)) {
      rows.push(`PROJGUIDE|id=${safe(section.id)}|status=${safe(section.status)}|source=${safe(section.source)}|shows=${safe(section.shows)}|next=${safe(section.next)}|row_sha16=${safe(section.row_sha16)}|process_launch=0|cutover=0|json=0`);
    }
    const topic = prop(opts, 'topic', '');
    if (topic) {
      const selected = guideSection({ topic });
      rows.push(`PROJGUIDEROUTE|topic=${safe(selected.topic)}|selected=${safe(selected.selected)}|reason=${safe(selected.reason)}|selected_status=${safe(prop(selected.section, 'status', 'RED'))}|json=0`);
    }
    rows.push('PROJGUIDEGATE|front_end_cell=P|status=PARTIAL|reason=guide-artifact-built-but-workflow-binding-and-cosign-submit-schema-remain-gated|process_launch=0|cutover=0|json=0');
    return rows;
  } catch {
    return [
      `PROJGUIDEHDR|tool=${GUIDE_ID}|frontend_cell=P|purpose=project-guide-before-any-front-end-cutover|sections=0|read_only=1|process_launch=0|no_cutover=1|json=0`,
      'PROJGUIDEGATE|front_end_cell=P|status=RED|reason=emit-threw-held-invalid|process_launch=0|cutover=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const guide = buildGuide();
  add('all-sections-present', guide.summary.total === 8 && guide.sections.some((s) => s.id === 'cosign-submit'));
  add('p-cell-partial-not-green', guide.summary.p_cell_status === P_CELL_STATUS && guide.summary.cutover_ready === false);
  add('no-live-action', guide.sections.every((s) => s.process_launch === 0 && s.cutover === 0));
  add('routes-project-frontier', guideSection({ topic: 'frontier catch queue' }).selected === 'frontier-queue');
  add('routes-cosign-schema', guideSection({ topic: 'cosign submit schema' }).selected === 'cosign-submit');
  add('routes-default-memory', guideSection({ topic: 'unknown guide' }).selected === 'memory-index');
  const hostile = emitRows([{ id: 'x|bad', status: 'GREEN', source: 's|json=1', shows: 'a\nPROJGUIDEGATE|cutover=1' }], { topic: 'route|json=1\nPROJGUIDEGATE|cutover=1' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { normalizeSection({ get id() { throw new Error('boom'); } }); guideSection({ get topic() { throw new Error('boom'); } }); emitRows(null); return true; } catch { return false; } })());
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
    limit: limitArg ? limitArg.slice('--limit='.length) : GUIDE_SECTIONS.length,
  };
  process.stdout.write(emitRows(GUIDE_SECTIONS, opts).join('\n') + '\n');
}
