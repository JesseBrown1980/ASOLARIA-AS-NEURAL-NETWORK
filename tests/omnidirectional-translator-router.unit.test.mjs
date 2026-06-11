import assert from 'node:assert/strict';
import test from 'node:test';

import {
  FABRIC_ENDPOINTS,
  listRouterEndpoints,
  planRoute,
  routeTranslate,
  selfTest,
  statusRows,
} from '../tools/behcs/omnidirectional-translator-router.mjs';

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

test('status emits HBP rows and self-test passes', () => {
  const rows = statusRows();
  assert.ok(rows[0].startsWith('OMNITRANSHDR|ok=1|component=2'));
  assert.ok(rows.every((row) => row.includes('json=0')));
  assert.ok(rows.some((row) => row.includes('OMNITRANSFABRIC|id=webmcp')));
  assert.equal(selfTest().ok, true);
});
