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

test('numeric-zero-equivalent runtime values are absent', () => {
  for (const value of ['0.0', '00', '+0', '-0', '0x0']) {
    const plan = planCollisionRoute(`COLLISION|agent_system=logical|role=supervisor|port=${value}|json=0`);
    assert.equal(plan.ok, true, value);
    assert.equal(plan.classification, 'LOGICAL_AGENT', value);
    assert.equal(plan.state, 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR', value);
  }
});

test('real collision can become draft-ready with an attested free range', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|free_hilbert=1604-1621|json=0');
  assert.equal(plan.ok, true);
  assert.equal(plan.state, 'REAL_COLLISION_REROUTE_READY_DRAFT');
  assert.match(plan.required, /1604-1621/);
});

test('sentinel and zero-equivalent free addresses do not unblock real collisions', () => {
  for (const field of ['free_real_address', 'free_hilbert', 'next_free_hilbert', 'target_free_range', 'free_range']) {
    for (const value of ['-', '0', '0.0', '00', '+0', '-0', 'none', 'null', 'false']) {
      const plan = planCollisionRoute(`COLLISION|agent_system=real|kind=free_agent|${field}=${value}|json=0`);
      assert.equal(plan.ok, false, `${field}=${value}`);
      assert.equal(plan.classification, 'REAL_AGENT', `${field}=${value}`);
      assert.equal(plan.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS', `${field}=${value}`);
    }
  }
  const livePort = planCollisionRoute('COLLISION|port=4949|free_real_address=-|json=0');
  assert.equal(livePort.ok, false);
  assert.equal(livePort.classification, 'REAL_AGENT');
  assert.equal(livePort.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');
});

test('token inference uses boundaries instead of substrings', () => {
  const plan = planCollisionRoute('COLLISION|role=fireworker|json=0');
  assert.equal(plan.ok, false);
  assert.equal(plan.classification, 'UNCLASSIFIED');
  assert.equal(plan.target_router, 'file-level-review');
});

test('fallback token inference ignores freeform identity and route fields', () => {
  const namePlan = planCollisionRoute('COLLISION|agent=sup-dan_omniflywheel_router|json=0');
  assert.equal(namePlan.ok, false);
  assert.equal(namePlan.classification, 'UNCLASSIFIED');
  assert.equal(namePlan.target_router, 'file-level-review');

  const reasonPlan = planCollisionRoute('COLLISION|reason=needs_omniflywheel_review|json=0');
  assert.equal(reasonPlan.ok, false);
  assert.equal(reasonPlan.classification, 'UNCLASSIFIED');
  assert.equal(reasonPlan.target_router, 'file-level-review');
});

test('dedicated classification fields still allow token inference', () => {
  const rolePlan = planCollisionRoute('COLLISION|role=omniflywheel|json=0');
  assert.equal(rolePlan.ok, false);
  assert.equal(rolePlan.classification, 'REAL_AGENT');
  assert.equal(rolePlan.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');

  const kindPlan = planCollisionRoute('COLLISION|kind=free_agent_007|json=0');
  assert.equal(kindPlan.ok, false);
  assert.equal(kindPlan.classification, 'REAL_AGENT');
  assert.equal(kindPlan.state, 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');
});

test('canonical logical vocabulary infers agreed supervisor roles', () => {
  for (const role of ['supervisor', 'prof', 'professor', 'council']) {
    const plan = planCollisionRoute(`COLLISION|role=${role}|json=0`);
    assert.equal(plan.ok, true, role);
    assert.equal(plan.classification, 'LOGICAL_AGENT', role);
    assert.equal(plan.state, 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR', role);
    assert.equal(plan.target_router, 'logical-overlay-router', role);
  }
});

test('write is not a logical inference token', () => {
  const plan = planCollisionRoute('COLLISION|role=write|json=0');
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
