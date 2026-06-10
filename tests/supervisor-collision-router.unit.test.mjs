import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyCollision,
  parseHbpRow,
  planCollisionRoute,
  planToHbpRows,
  selfTest,
  statusRows,
} from '../tools/behcs/supervisor-collision-router.mjs';

test('parses HBP rows without JSON hot path', () => {
  const parsed = parseHbpRow('COLLISION|agent_system=logical|role=sector-agent|json=0');
  assert.equal(parsed.head, 'COLLISION');
  assert.equal(parsed.fields.agent_system, 'logical');
  assert.equal(parsed.fields.role, 'sector-agent');
});

test('non-collision HBP heads are held instead of routed', () => {
  const plan = planCollisionRoute('STATUS|agent_system=logical|role=sector-agent|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.classification, 'UNCLASSIFIED');
  assert.equal(plan.classification_state, 'HELD_NON_COLLISION_HEAD');
  assert.equal(plan.target_router, 'file-level-review');
});

test('logical collision is preserved and routed to supervisor planning', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|collision_with=operator_GAC|json=0');
  assert.equal(plan.ok, true);
  assert.equal(plan.classification, 'LOGICAL_AGENT');
  assert.equal(plan.state, 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR');
  assert.equal(plan.target_router, 'logical-overlay-router');
});

test('real collision blocks until a free real address is supplied', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|occupied=1|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.classification, 'REAL_AGENT');
  assert.equal(plan.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');
  assert.ok(plan.gates.includes('operator-pair-cosign-before-real-mint-or-launch'));
});

test('runtime-bound rows are real even when labeled as logical roles', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=logical|role=supervisor|port=4957|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.classification, 'REAL_AGENT');
  assert.equal(plan.reason, 'runtime-bound-os-pid-port-or-flywheel');
  assert.equal(plan.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');
});

test('sentinel runtime values are absent and do not override logical labels', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=logical|role=supervisor|port=none|json=0');
  assert.equal(plan.ok, true);
  assert.equal(plan.classification, 'LOGICAL_AGENT');
  assert.equal(plan.state, 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR');
});

test('real collision can become draft-ready with an attested free range', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|free_hilbert=1604-1621|json=0');
  assert.equal(plan.ok, true);
  assert.equal(plan.state, 'REAL_COLLISION_REROUTE_READY_DRAFT');
  assert.match(plan.required, /1604-1621/);
});

test('token inference uses boundaries instead of substrings', () => {
  const plan = planCollisionRoute('COLLISION|role=fireworker|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.classification, 'UNCLASSIFIED');
  assert.equal(plan.target_router, 'file-level-review');
});

test('mixed rows are held for split instead of guessed', () => {
  const classified = classifyCollision('COLLISION|kind=free_agent|role=logical_18|json=0');
  assert.equal(classified.classification, 'MIXED_OR_AMBIGUOUS');
  const plan = planCollisionRoute('COLLISION|kind=free_agent|role=logical_18|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.state, 'MIXED_COLLISION_HELD_SPLIT_REQUIRED');
});

test('status and plans emit HBP rows only', () => {
  const rows = [
    ...statusRows(),
    ...planToHbpRows(planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|json=0')),
  ];
  assert.ok(rows.every((row) => row.includes('json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
  assert.equal(selfTest().ok, true);
});
