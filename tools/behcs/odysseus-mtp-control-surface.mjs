#!/usr/bin/env node
// odysseus-mtp-control-surface.mjs - binds Odysseus M/T/P cells to v8 map3d.
//
// Descriptor-only. This absorbs the Odysseus/ChatOS pattern as an agent work
// surface: model selector, tool/skill registry, project guide, and real graph
// band. It does not render a phone UI, launch a model/tool/workflow, fetch a
// dashboard, or perform a front-end cutover.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildUpgrade } from './eight-byte-host-process-upgrade.mjs';
import { M_CELL_STATUS, buildSelector, selectRole } from './model-selector-matrix.mjs';
import { P_CELL_STATUS, buildGuide, guideSection } from './project-guide-matrix.mjs';
import { T_CELL_STATUS, buildRegistry, registryItem } from './tool-skill-registry-matrix.mjs';

export const SURFACE_ID = 'odysseus-mtp-control-surface.v1';
export const ODYSSEUS_SOURCE = 'docs/LIRIS-ODYSSEUS-CHATOS-FRONTEND-ABSORPTION-2026-06-12.hbp';
export const BANDS = Object.freeze(['M-model-selector', 'T-tool-skill', 'P-project-guide', 'MAP3D-v8-real-graph']);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

function bandRow({ id, source, status, evidence, next }) {
  return Object.freeze({
    id,
    source: safe(source),
    status: safe(status),
    evidence: safe(evidence),
    next: safe(next),
    row_sha16: sha16([id, source, status, evidence, next].join('|')),
    process_launch: 0,
    live_model_invocation: 0,
    live_tool_execution: 0,
    workflow_execution: 0,
    cutover: 0,
  });
}

export function buildSurface(input = {}) {
  const selector = buildSelector();
  const registry = buildRegistry();
  const guide = buildGuide();
  const graph = buildUpgrade();
  const modelNeed = safe(prop(input, 'model_need') || 'fischer score');
  const toolNeed = safe(prop(input, 'tool_need') || 'cosign submit schema');
  const projectTopic = safe(prop(input, 'project_topic') || 'frontier catch queue');
  const bands = Object.freeze([
    bandRow({
      id: 'M',
      source: 'tools/behcs/model-selector-matrix.mjs',
      status: selector.summary.red === 0 ? 'PARTIAL_DESCRIPTOR_BACKED' : 'RED',
      evidence: `${M_CELL_STATUS}:roles-${selector.summary.total}:green-${selector.summary.green}:partial-${selector.summary.partial}:gated-${selector.summary.gated}`,
      next: 'live-model-contract-and-runtime-proof-before-green',
    }),
    bandRow({
      id: 'T',
      source: 'tools/behcs/tool-skill-registry-matrix.mjs',
      status: registry.summary.red === 0 ? 'PARTIAL_DESCRIPTOR_BACKED' : 'RED',
      evidence: `${T_CELL_STATUS}:items-${registry.summary.total}:green-${registry.summary.green}:partial-${registry.summary.partial}:gated-${registry.summary.gated}`,
      next: 'submit-schema-and-live-tool-execution-proof-before-green',
    }),
    bandRow({
      id: 'P',
      source: 'tools/behcs/project-guide-matrix.mjs',
      status: guide.summary.red === 0 ? 'PARTIAL_DESCRIPTOR_BACKED' : 'RED',
      evidence: `${P_CELL_STATUS}:sections-${guide.summary.total}:green-${guide.summary.green}:partial-${guide.summary.partial}:gated-${guide.summary.gated}`,
      next: 'workflow-binding-and-cosign-submit-schema-proof-before-green',
    }),
    bandRow({
      id: 'MAP3D',
      source: 'tools/behcs/eight-byte-host-process-upgrade.mjs',
      status: graph.summary.p5_materialized === false && graph.summary.provider_compute_replaced === false ? 'REAL_MATH_DESCRIPTOR_BACKED' : 'RED',
      evidence: `hosts-${graph.summary.hosts}:systems-${graph.summary.systems}:node_per_agent-${graph.summary.node_per_agent}:p5_materialized-${graph.summary.p5_materialized ? 1 : 0}`,
      next: 'phone-render-proof-or-browser-screenshot-is-external-to-this-repo',
    }),
  ]);
  const mRoute = selectRole({ need: modelNeed });
  const tRoute = registryItem({ topic: toolNeed });
  const pRoute = guideSection({ topic: projectTopic });
  return Object.freeze({
    tool: SURFACE_ID,
    source: ODYSSEUS_SOURCE,
    bands,
    routes: Object.freeze({
      model: Object.freeze({ need: modelNeed, selected: mRoute.selected, status: safe(prop(mRoute.role, 'status', 'RED')) }),
      tool: Object.freeze({ topic: toolNeed, selected: tRoute.selected, status: safe(prop(tRoute.item, 'status', 'RED')) }),
      project: Object.freeze({ topic: projectTopic, selected: pRoute.selected, status: safe(prop(pRoute.section, 'status', 'RED')) }),
    }),
    summary: Object.freeze({
      bands: bands.length,
      descriptor_backed_bands: bands.filter((b) => b.status !== 'RED').length,
      mtp_descriptor_backed: bands.filter((b) => ['M', 'T', 'P'].includes(b.id) && b.status === 'PARTIAL_DESCRIPTOR_BACKED').length,
      phone_render_proven_here: false,
      cutover_ready: false,
      live_execution_ready: false,
    }),
  });
}

export function emitRows(input = {}) {
  try {
    const surface = buildSurface(input);
    const s = surface.summary;
    const rows = [
      `ODYSSEUSMTPHDR|tool=${SURFACE_ID}|source=${ODYSSEUS_SOURCE}|purpose=bind-MTP-descriptor-cells-to-v8-map3d-agent-control-surface|bands=${s.bands}|descriptor_backed=${s.descriptor_backed_bands}|mtp_descriptor_backed=${s.mtp_descriptor_backed}|process_launch=0|live_execution=0|cutover=0|json=0`,
      `ODYSSEUSMTPSUM|phone_render_proven_here=0|cutover_ready=0|live_execution_ready=0|pattern_absorption=1|code_copy=0|json=0`,
    ];
    for (const band of surface.bands) {
      rows.push(`ODYSSEUSMTPBAND|id=${band.id}|status=${band.status}|source=${band.source}|evidence=${band.evidence}|next=${band.next}|row_sha16=${band.row_sha16}|process_launch=0|live_model_invocation=0|live_tool_execution=0|workflow_execution=0|cutover=0|json=0`);
    }
    rows.push(`ODYSSEUSMTPROUTE|cell=M|need=${safe(surface.routes.model.need)}|selected=${safe(surface.routes.model.selected)}|selected_status=${safe(surface.routes.model.status)}|live_model_invocation=0|json=0`);
    rows.push(`ODYSSEUSMTPROUTE|cell=T|topic=${safe(surface.routes.tool.topic)}|selected=${safe(surface.routes.tool.selected)}|selected_status=${safe(surface.routes.tool.status)}|live_tool_execution=0|json=0`);
    rows.push(`ODYSSEUSMTPROUTE|cell=P|topic=${safe(surface.routes.project.topic)}|selected=${safe(surface.routes.project.selected)}|selected_status=${safe(surface.routes.project.status)}|workflow_execution=0|json=0`);
    rows.push('ODYSSEUSMTPGATE|rule=descriptor-backed-agent-control-surface-not-phone-render-proof-not-live-cutover|provider_terms_apply=1|operator_cosign_required_for_live_actions=1|cutover=0|process_launch=0|json=0');
    return rows;
  } catch {
    return [
      `ODYSSEUSMTPHDR|tool=${SURFACE_ID}|source=${ODYSSEUS_SOURCE}|purpose=bind-MTP-descriptor-cells-to-v8-map3d-agent-control-surface|bands=0|process_launch=0|live_execution=0|cutover=0|json=0`,
      'ODYSSEUSMTPGATE|rule=emit-threw-held-invalid|provider_terms_apply=1|operator_cosign_required_for_live_actions=1|cutover=0|process_launch=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const surface = buildSurface();
  add('all-bands-present', surface.summary.bands === 4 && BANDS.length === 4);
  add('mtp-descriptor-backed-not-green-cutover', surface.summary.mtp_descriptor_backed === 3 && surface.summary.cutover_ready === false);
  add('map3d-bound-to-v8-real-math', surface.bands.some((b) => b.id === 'MAP3D' && b.status === 'REAL_MATH_DESCRIPTOR_BACKED'));
  add('routes-through-existing-mtp-tools', surface.routes.model.selected === 'fischer-draft-standin' && surface.routes.tool.selected === 'cosign-submit-schema' && surface.routes.project.selected === 'frontier-queue');
  add('no-live-execution', surface.bands.every((b) => b.process_launch === 0 && b.live_model_invocation === 0 && b.live_tool_execution === 0 && b.workflow_execution === 0 && b.cutover === 0));
  add('phone-render-not-claimed-here', surface.summary.phone_render_proven_here === false);
  const hostile = emitRows({ model_need: 'x|bad\nODYSSEUSMTPGATE|cutover=1', tool_need: 'y|bad', project_topic: 'z\nbad' });
  add('rows-hbp-only', hostile.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { buildSurface({ get model_need() { throw new Error('boom'); } }); emitRows(null); return true; } catch { return false; } })());
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
