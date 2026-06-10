import assert from 'node:assert/strict';
import test from 'node:test';

import { planCollisionRoute } from '../tools/behcs/supervisor-collision-router.mjs';

const cases = [
  {
    name: 'logical preserve',
    row: 'COLLISION|agent_system=logical|role=sector-agent|json=0',
    ok: true,
    classification: 'LOGICAL_AGENT',
    state: 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR',
  },
  {
    name: 'real blocked',
    row: 'COLLISION|agent_system=real|kind=free_agent|json=0',
    ok: false,
    classification: 'REAL_AGENT',
    state: 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS',
  },
  {
    name: 'real reroute draft',
    row: 'COLLISION|agent_system=real|kind=free_agent|free_hilbert=1604-1621|json=0',
    ok: true,
    classification: 'REAL_AGENT',
    state: 'REAL_COLLISION_REROUTE_READY_DRAFT',
  },
  {
    name: 'runtime wins real',
    row: 'COLLISION|agent_system=logical|role=supervisor|port=4957|json=0',
    ok: false,
    classification: 'REAL_AGENT',
    state: 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS',
  },
  {
    name: 'sentinel port does not win real',
    row: 'COLLISION|agent_system=logical|role=supervisor|port=none|json=0',
    ok: true,
    classification: 'LOGICAL_AGENT',
    state: 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR',
  },
  {
    name: 'mixed split',
    row: 'COLLISION|kind=free_agent|role=logical_18|json=0',
    ok: false,
    classification: 'MIXED_OR_AMBIGUOUS',
    state: 'MIXED_COLLISION_HELD_SPLIT_REQUIRED',
  },
  {
    name: 'non collision head held',
    row: 'STATUS|agent_system=logical|role=sector-agent|json=0',
    ok: false,
    classification: 'UNCLASSIFIED',
    state: 'UNCLASSIFIED_COLLISION_HELD',
  },
  {
    name: 'substring token not inferred',
    row: 'COLLISION|role=fireworker|json=0',
    ok: false,
    classification: 'UNCLASSIFIED',
    state: 'UNCLASSIFIED_COLLISION_HELD',
  },
];

for (const c of cases) {
  test(`contract matrix: ${c.name}`, () => {
    const plan = planCollisionRoute(c.row);
    assert.equal(plan.ok, c.ok);
    assert.equal(plan.classification, c.classification);
    assert.equal(plan.state, c.state);
  });
}
