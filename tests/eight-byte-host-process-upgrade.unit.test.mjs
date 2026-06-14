import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BH_INDEX_MAX, HOST_HANDLE_BYTES, NODE_REPLACEMENT_POLICY, ROUTE_TYPES,
  buildUpgrade, classifyPrimeExponent, classifyUpgradeClaim, deriveHostAddress,
  distanceBetween, emitRows, mod6Integrity, selfTest,
} from '../tools/behcs/eight-byte-host-process-upgrade.mjs';

test('eight-byte host-process upgrade self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('real bh_index cylinder math is derived from PID register fields', () => {
  const host = deriveHostAddress({ name: 'logical mcp agent', kind: 'logical', prime: 0 });
  assert.equal(HOST_HANDLE_BYTES, 8);
  assert.equal(host.bh_index, host.sector * 3072 + host.lane * 1024 + host.glyph);
  assert.ok(host.bh_index >= 0 && host.bh_index <= BH_INDEX_MAX);
  assert.equal(host.cylinder_phase, host.bh_index % 6);
  assert.equal(host.cylinder_ring, Math.floor(host.bh_index / 6));
});

test('three agent systems map through yin-yang and prime parity', () => {
  const built = buildUpgrade();
  assert.deepEqual(new Set(built.hosts.map((h) => h.agent_type)), new Set(['LOGICAL-WAVE', 'FROZEN-BRAIN', 'REAL-FREE']));
  assert.ok(built.hosts.every((h) => ['hookwall', 'gnn', 'shannon'].includes(h.watcher)));
  assert.ok(built.hosts.every((h) => h.node_per_agent === 0 && h.process_launch === 0));
});

test('prime power tiers separate p p2 p3 and fold p5 p7 p9 honestly to pk proposals', () => {
  assert.deepEqual(classifyPrimeExponent(1), { exponent: 1, tier: 'prime', materialized: true, status: 'REAL_DISTINCT' });
  assert.equal(classifyPrimeExponent(2).tier, 'p2');
  assert.equal(classifyPrimeExponent(3).tier, 'p3');
  for (const exponent of [5, 7, 9]) {
    const tier = classifyPrimeExponent(exponent);
    assert.equal(tier.tier, 'pk');
    assert.equal(tier.materialized, false);
    assert.equal(tier.status, 'PROPOSAL_FOLDED_TO_PK');
  }
});

test('PID distance is abs delta bh_index, not fake 3D euclidean distance', () => {
  const near = distanceBetween({ bh_index: 1000, sha16: 'aaaaaaaaaaaaaaaa' }, { bh_index: 2000, sha16: 'bbbbbbbbbbbbbbbb' });
  const regional = distanceBetween({ bh_index: 1000, sha16: 'aaaaaaaaaaaaaaaa' }, { bh_index: 100000, sha16: 'bbbbbbbbbbbbbbbb' });
  assert.equal(near.bucket, 'near4096');
  assert.equal(regional.bucket, 'regional131072');
  assert.equal(regional.metric, 'abs-delta-bh-index-not-euclidean-3d');
});

test('mod-6 integrity catches corrupted external lanes but never proves truth alone', () => {
  assert.equal(mod6Integrity(11, 13, { claimedLaneA: 2, claimedLaneB: 1 }).verdict, 'FORCED_CONSISTENT');
  assert.equal(mod6Integrity(11, 13, { claimedLaneB: 2 }).verdict, 'FORCING_VIOLATION');
  assert.equal(mod6Integrity(11, 13).scope, 'necessary-not-sufficient');
});

test('node replacement policy scopes the upgrade to the conductor layer', () => {
  assert.ok(NODE_REPLACEMENT_POLICY.some((p) => p.id === 'runtime-agent-conductor' && p.status === 'TARGET_REPLACE_NODE_PER_AGENT'));
  assert.ok(NODE_REPLACEMENT_POLICY.some((p) => p.id === 'repo-verifier' && p.status === 'NODE_ALLOWED'));
  assert.ok(ROUTE_TYPES.some((r) => r.id === 'provider-router' && r.gate.includes('billing')));
  assert.equal(buildUpgrade().summary.provider_compute_replaced, false);
});

test('claim classifier rejects overclaims before safe labels', () => {
  assert.equal(classifyUpgradeClaim({ claim: '8 byte host gives gratis Claude tokens' }), 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  assert.equal(classifyUpgradeClaim({ claim: 'replace all node on the planet now' }), 'MIGRATION_PLAN_NOT_COMPLETED_CLAIM');
  assert.equal(classifyUpgradeClaim({ claim: 'every 200 nanoseconds end to end' }), 'CADENCE_CLAIM_REQUIRES_BENCHMARK');
  assert.equal(classifyUpgradeClaim({ claim: 'p7 prime cylinder is materialized' }), 'PRIME_EXPONENT_FOLDS_TO_PK_PROPOSAL');
  assert.equal(classifyUpgradeClaim({ claim: '8 byte host process conductor' }), 'HOST_PROCESS_CONDUCTOR_DESCRIPTOR');
});

test('emitted rows are HBP-only and held-safe', () => {
  const rows = emitRows(null, { claim: 'bad|claim\nHOSTUPGRADEGATE|process_launch=1' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.includes('provider_terms_apply=1')));
  assert.ok(rows.some((row) => row.includes('process_launch=0')));
  assert.ok(rows.some((row) => row.includes('p5') || row.includes('exponent=5')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/eight-byte-host-process-upgrade.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process|node:http|node:net|createWriteStream/);
});
