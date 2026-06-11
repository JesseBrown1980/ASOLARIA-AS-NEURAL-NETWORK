#!/usr/bin/env node
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const translator = require('../omni-processor/omnitranslator-v0.js');

export const FABRIC_ENDPOINTS = Object.freeze({
  hbp: { kind: 'fabric-format', gate: 'planned-parser' },
  hbi: { kind: 'fabric-index', gate: 'planned-parser' },
  mcp_pipe: { kind: 'tool-pipe', gate: 'mcp-token-binding' },
  webmcp: { kind: 'browser-tool-pipe', gate: 'webmcp-token-binding' },
  cube: { kind: 'bh-cube', gate: 'cube-token-binding' },
  whiteroom: { kind: 'mint-surface', gate: 'operator-pair-before-mint' },
  shannon: { kind: 'consensus-surface', gate: 'shannon-envelope-contract' },
  frozen_slice: { kind: 'deterministic-model-slice', gate: 'subscription-and-surface-authority' },
  geospatial_agent: { kind: 'space-time-agent', gate: 'mtp-geospatial-contract' },
  hrm_agent: { kind: 'hierarchical-reasoning-agent', gate: 'hrm-inside-llm-contract' },
});

function dialectIds() {
  return translator.listDialects().map((dialect) => dialect.id);
}

function pairSet() {
  return new Set(translator.listPairs());
}

export function listRouterEndpoints() {
  return {
    dialects: translator.listDialects(),
    implementedPairs: translator.listPairs(),
    fabricEndpoints: FABRIC_ENDPOINTS,
  };
}

export function planRoute(from, to) {
  const dialects = new Set(dialectIds());
  const pairs = pairSet();
  const direct = `${from}->${to}`;

  if (pairs.has(direct)) {
    return { from, to, state: 'IMPLEMENTED_DIRECT', executable: true, path: [direct], gates: [] };
  }

  const viaTrunk = [`${from}->omnilanguage`, `omnilanguage->${to}`];
  if (from !== 'omnilanguage' && to !== 'omnilanguage' && pairs.has(viaTrunk[0]) && pairs.has(viaTrunk[1])) {
    return { from, to, state: 'IMPLEMENTED_VIA_OMNILANGUAGE_TRUNK', executable: true, path: viaTrunk, gates: [] };
  }

  const fromKnown = dialects.has(from) || Object.hasOwn(FABRIC_ENDPOINTS, from);
  const toKnown = dialects.has(to) || Object.hasOwn(FABRIC_ENDPOINTS, to);
  const gates = [];

  if (!fromKnown) gates.push(`unknown-from:${from}`);
  if (!toKnown) gates.push(`unknown-to:${to}`);
  if (fromKnown && toKnown) {
    gates.push('translator-pair-not-implemented');
    if (!dialects.has(from) || !dialects.has(to)) gates.push('fabric-token-binding-required');
    gates.push('T0-T1-classifier-or-language-engine-remap-requires-cosign');
  }

  return {
    from,
    to,
    state: fromKnown && toKnown ? 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE' : 'UNKNOWN_ENDPOINT',
    executable: false,
    path: ['omnilanguage-trunk-planned'],
    gates,
  };
}

export function routeTranslate(input, from, to) {
  const plan = planRoute(from, to);
  if (!plan.executable) {
    return { ok: false, ...plan, output: null, note: 'No translation executed; route is a planned/gated fabric bridge.' };
  }

  if (plan.state === 'IMPLEMENTED_DIRECT') {
    return { ok: true, ...plan, output: translator.translate(input, from, to).output };
  }

  const first = translator.translate(input, from, 'omnilanguage').output;
  const second = translator.translate(first, 'omnilanguage', to).output;
  return { ok: true, ...plan, output: second };
}

export function statusRows() {
  const endpointCount = dialectIds().length + Object.keys(FABRIC_ENDPOINTS).length;
  const rows = [
    `OMNITRANSHDR|ok=1|component=2|dialects=${dialectIds().length}|fabric_endpoints=${Object.keys(FABRIC_ENDPOINTS).length}|implemented_pairs=${translator.listPairs().length}|state=ROUTER_READY_NO_ENGINE_EDIT|json=0`,
  ];

  for (const pair of translator.listPairs()) rows.push(`OMNITRANSPAIR|pair=${pair}|state=IMPLEMENTED|json=0`);
  for (const [id, meta] of Object.entries(FABRIC_ENDPOINTS)) {
    rows.push(`OMNITRANSFABRIC|id=${id}|kind=${meta.kind}|gate=${meta.gate}|state=PLANNED_TOKEN_BINDING|json=0`);
  }
  rows.push(`OMNITRANSEND|endpoints=${endpointCount}|gated_execution=0|json=0`);
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

  const direct = routeTranslate('@packet from=liris to=asolaria verb=test.ping input_a=1', 'omnilanguage', 'json');
  add('direct-omnilanguage-json', direct.ok && direct.output.from === 'liris' && direct.output.input_a === '1');

  const reverse = routeTranslate({ from: 'liris', to: 'asolaria', verb: 'test.ping' }, 'json', 'omnilanguage');
  add('direct-json-omnilanguage', reverse.ok && String(reverse.output).includes('verb=test.ping'));

  const planned = planRoute('json', 'cube');
  add('planned-cube-route-not-executable', planned.state === 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE' && planned.executable === false);

  const unknown = planRoute('json', 'not_a_surface');
  add('unknown-endpoint-blocked', unknown.state === 'UNKNOWN_ENDPOINT' && unknown.executable === false);

  const rows = statusRows();
  add('hbp-status-rows', rows[0].startsWith('OMNITRANSHDR|') && rows.some((row) => row.includes('mcp_pipe')));

  return { ok: checks.every((check) => check.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const check of result.checks) console.log(`${check.ok ? 'PASS' : 'FAIL'} ${check.name}${check.detail ? ' ' + check.detail : ''}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--route') {
    const from = process.argv[3];
    const to = process.argv[4];
    const input = process.argv.slice(5).join(' ');
    console.log(JSON.stringify(routeTranslate(input, from, to), null, 2));
  } else {
    console.error('usage: omnidirectional-translator-router.mjs --status | --self-test | --route <from> <to> <input>');
    process.exit(1);
  }
}
