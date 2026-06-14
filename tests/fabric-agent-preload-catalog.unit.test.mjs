import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMITTERS, HOST_NODES, LAWS, LEVEL_INDEX, ROLES, ROUTES, TOOLS, WORKFLOW,
  classifyPayloadForRoute, emitPreloadRows, routeById, selfTest, toolById,
} from '../tools/behcs/fabric-agent-preload-catalog.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('preload catalog teaches the send-hbp vs send-json route split', () => {
  assert.equal(routeById('send-hbp').method, 'POST');
  assert.equal(routeById('send-json').method, 'POST');
  assert.equal(classifyPayloadForRoute({ route_id: 'send-hbp', payload_kind: 'single-hbp-row-json0' }), 'ACCEPT_SINGLE_HBP_ROW');
  assert.equal(classifyPayloadForRoute({ route_id: 'send-hbp', payload_kind: 'operator-packet-lines' }), 'REJECT_WRONG_ROUTE');
  assert.equal(classifyPayloadForRoute({ route_id: 'send-json', payload_kind: 'operator-packet-lines' }), 'ACCEPT_JSON_ENVELOPE');
});

test('preload catalog includes the laws, tools, roles, and cadence agents need', () => {
  assert.ok(LAWS.includes('all-agent-artifact-system-addresses-get-PID-or-handle'));
  assert.ok(LAWS.includes('quants-are-address-and-evidence-classes-not-raw-material'));
  assert.ok(TOOLS.some((t) => t.id === 'pixel-room-handle'));
  assert.ok(TOOLS.some((t) => t.id === 'github-live-pid-reconcile'));
  assert.ok(TOOLS.some((t) => t.id === 'catch-count-ledger' && t.gate.includes('md-final-release-claims-held')));
  assert.ok(TOOLS.some((t) => t.id === 'mlc-engine-wiring-increment' && t.gate.includes('process_launch-0')));
  assert.ok(TOOLS.some((t) => t.id === 'frontend-parity-matrix' && t.gate.includes('no-cutover')));
  assert.ok(TOOLS.some((t) => t.id === 'model-selector-matrix' && t.gate.includes('live-model-invocation-0')));
  assert.ok(TOOLS.some((t) => t.id === 'project-guide-matrix' && t.gate.includes('no-cutover')));
  assert.ok(TOOLS.some((t) => t.id === 'tool-skill-registry-matrix' && t.gate.includes('live-tool-execution-0')));
  assert.ok(ROLES.some((r) => r.id === 'flywheel' && r.must_do.includes('compare-to-acer-local-truth')));
  assert.ok(WORKFLOW.join('-').includes('memory-index-plan'));
  assert.equal(toolById('token-cube-catalog-binder').gate, 'mint-write-live-DEFER_TO_OPERATOR');
});

test('preload catalog indexes all 16 levels and pipes through PID emitter, hookwall, and GNN', () => {
  assert.equal(LEVEL_INDEX.length, 16);
  assert.equal(LEVEL_INDEX[0].tier, 'A00');
  assert.equal(LEVEL_INDEX[0].translate_down, 'A01');
  assert.equal(LEVEL_INDEX[15].translate_down, 'physical-cap');
  assert.ok(EMITTERS.some((e) => e.id === 'pid-emitter' && e.after.includes('hookwall+gnn')));
  assert.ok(EMITTERS.some((e) => e.id === 'hookwall'));
  assert.ok(EMITTERS.some((e) => e.id === 'gnn-edge'));
});

test('folder microkernels and sister reflection host nodes stay row-only and PID-labeled', () => {
  assert.ok(HOST_NODES.some((h) => h.id === 'folder-microkernel' && h.label.includes('PID-specific')));
  assert.ok(HOST_NODES.some((h) => h.id === 'sister-reflection'));
  assert.ok(HOST_NODES.every((h) => h.process_launch === 0));
});

test('all preload rows are HBP-only and preserve gates', () => {
  const rows = emitPreloadRows();
  assert.ok(rows.length >= ROUTES.length + TOOLS.length + ROLES.length + LEVEL_INDEX.length + 5);
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  assert.ok(rows.some((row) => row.includes('process_launch=0')));
  assert.ok(rows.some((row) => row.includes('raw_pixels=0')));
  assert.ok(rows.some((row) => row.includes('PENDING-OFFICE-SNAPSHOT')));
  assert.ok(rows.some((row) => row.includes('connection_label=PID-specific')));
});

test('unknown routes or HBP injection are rejected before catalog use', () => {
  assert.throws(() => routeById('missing'));
  assert.throws(() => classifyPayloadForRoute({ route_id: 'send-json', payload_kind: 'bad|pipe' }));
});
