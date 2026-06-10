import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ROUTER_SURFACES,
  planCollisionRoute,
  planToHbpRows,
  statusRows,
} from '../tools/behcs/supervisor-collision-router.mjs';

test('logical collisions route to the worker/council fabric plan', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|json=0');
  assert.equal(plan.target_router, ROUTER_SURFACES.logical.id);
  assert.equal(plan.target_route, '/api/constructions/atlas/system/council/dispatch-plan');
  assert.equal(plan.action, 'PRESERVE_LOGICAL_COLLISION');
});

test('real collisions route only as gated omniflywheel drafts', () => {
  const blocked = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|json=0');
  const ready = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|free_hilbert=1604-1621|json=0');

  assert.equal(blocked.target_router, ROUTER_SURFACES.real.id);
  assert.equal(blocked.target_route, '/api/omniflywheel');
  assert.equal(blocked.ok, false);
  assert.ok(blocked.gates.includes('operator-pair-cosign-before-real-mint-or-launch'));

  assert.equal(ready.target_router, ROUTER_SURFACES.real.id);
  assert.equal(ready.target_route, '/api/omniflywheel');
  assert.equal(ready.ok, true);
  assert.ok(ready.gates.includes('operator-pair-cosign-before-real-mint-or-launch'));
});

test('fabric bridge hints use the omnidirectional translator route', () => {
  const plan = planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|from=HBP|to=Cube|json=0');
  assert.equal(plan.translator_route, 'tools/behcs/omnidirectional-translator-router.mjs');
});

test('fabric outputs remain HBP-only and non-executable', () => {
  const plans = [
    planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|json=0'),
    planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|json=0'),
  ];
  const rows = [...statusRows(), ...plans.flatMap(planToHbpRows)];

  assert.ok(plans.every((plan) => plan.executable === false));
  assert.ok(plans.every((plan) => plan.mutates === false));
  assert.ok(rows.every((row) => row.includes('json=0')));
  assert.ok(rows.every((row) => !row.includes('{"')));
});
