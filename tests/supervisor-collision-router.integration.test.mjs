import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeCollisionInput,
  planCollisionRoute,
  planToHbpRows,
} from '../tools/behcs/supervisor-collision-router.mjs';

test('HBP collision row flows through classify, plan, and HBP output rows', () => {
  const row = 'COLLISION|agent_system=logical|role=sector-agent|from=hbp|to=cube|json=0';
  const normalized = normalizeCollisionInput(row);
  const plan = planCollisionRoute(row);
  const out = planToHbpRows(plan);

  assert.equal(normalized.head, 'COLLISION');
  assert.equal(plan.ok, true);
  assert.equal(plan.state, 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR');
  assert.equal(plan.translator_route, 'tools/behcs/omnidirectional-translator-router.mjs');
  assert.equal(out.length, 3);
  assert.ok(out.every((line) => line.includes('json=0')));
  assert.ok(out.every((line) => !line.includes('{"')));
});

test('object input remains compatibility-only but follows the same planner', () => {
  const plan = planCollisionRoute({
    head: 'OBJECT',
    agent_system: 'real',
    kind: 'free_agent',
    free_hilbert: '1604-1621',
  });

  assert.equal(plan.ok, true);
  assert.equal(plan.classification, 'REAL_AGENT');
  assert.equal(plan.state, 'REAL_COLLISION_REROUTE_READY_DRAFT');
  assert.match(plan.required, /1604-1621/);
});

test('planner never marks routes executable or mutating', () => {
  const plans = [
    planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|json=0'),
    planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|json=0'),
    planCollisionRoute('COLLISION|kind=free_agent|role=logical_18|json=0'),
  ];

  assert.ok(plans.every((plan) => plan.executable === false));
  assert.ok(plans.every((plan) => plan.mutates === false));
});
