import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  FABRIC_ENDPOINTS,
  listRouterEndpoints,
  planRoute,
  routeTranslate,
  selfTest,
  statusRows,
} from '../tools/behcs/omnidirectional-translator-router.mjs';

const require = createRequire(import.meta.url);
const translatorCore = require('../tools/omni-processor/omnitranslator-v0.js');

test('component 2 router exposes dialects, fabric endpoints, and implemented pairs', () => {
  const endpoints = listRouterEndpoints();
  assert.ok(endpoints.dialects.some((dialect) => dialect.id === 'omnilanguage'));
  assert.ok(endpoints.dialects.some((dialect) => dialect.id === 'json'));
  assert.ok(endpoints.implementedPairs.includes('omnilanguage->json'));
  assert.ok(Object.hasOwn(FABRIC_ENDPOINTS, 'mcp_pipe'));
  assert.ok(Object.hasOwn(FABRIC_ENDPOINTS, 'cube'));
});

test('implemented omnilanguage to json pair executes through existing translator', () => {
  const result = routeTranslate('@packet from=liris to=asolaria verb=test.ping input_a=1', 'omnilanguage', 'json');
  assert.equal(result.ok, true);
  assert.equal(result.state, 'IMPLEMENTED_DIRECT');
  assert.equal(result.output.from, 'liris');
  assert.equal(result.output.input_a, '1');
});

test('fabric endpoints are planned routes, not fabricated translations', () => {
  const plan = planRoute('json', 'cube');
  assert.equal(plan.executable, false);
  assert.equal(plan.state, 'DRAFT_ROUTE_ONLY_NOT_EXECUTABLE');
  assert.ok(plan.gates.includes('fabric-token-binding-required'));
});

test('unknown endpoints are blocked', () => {
  const plan = planRoute('json', 'not_a_surface');
  assert.equal(plan.executable, false);
  assert.equal(plan.state, 'UNKNOWN_ENDPOINT');
  assert.ok(plan.gates.includes('unknown-to:not_a_surface'));
});

test('audit lane emits HBP pipe rows, not JSON', () => {
  routeTranslate('@packet from=acer verb=audit.probe input_a=2', 'omnilanguage', 'json');
  const auditUrl = new URL('../logs/omnitranslator-audit.hbp', import.meta.url);
  const rows = readFileSync(auditUrl, 'utf8').trim().split('\n');
  const last = rows[rows.length - 1];
  assert.ok(last.startsWith('OMNITRANSAUDIT|'), 'audit row must be an HBP pipe row');
  assert.ok(last.endsWith('|json=0'), 'audit row must close with json=0');
  assert.ok(!last.includes('{"'), 'audit lane must carry no JSON');
  assert.match(last, /\|output_sha16=[0-9a-f]{16}\|/, 'content referenced by sha16, never inlined');
});

test('translator core rejects dialect ids that could inject HBP fields', () => {
  assert.throws(() => translatorCore.registerDialect('bad|json=1', { pair_status: 'implemented' }), /dialect id must match/);
  assert.throws(() => translatorCore.registerDialect('bad\nrow', { pair_status: 'implemented' }), /dialect id must match/);
  assert.throws(() => translatorCore.registerPair('omnilanguage', 'json|mutates=1', () => ({})), /dialect id must match/);
});

test('status emits HBP rows and self-test passes', () => {
  const rows = statusRows();
  assert.ok(rows[0].startsWith('OMNITRANSHDR|ok=1|component=2'));
  assert.ok(rows.every((row) => row.includes('json=0')));
  assert.ok(rows.some((row) => row.includes('OMNITRANSFABRIC|id=webmcp')));
  assert.equal(selfTest().ok, true);
});
