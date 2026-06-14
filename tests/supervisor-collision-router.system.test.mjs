import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

function sha256(rel) {
  return createHash('sha256').update(readFileSync(join(repo, rel))).digest('hex').toUpperCase();
}

function sidecarHash(rel) {
  return readFileSync(join(repo, `${rel}.sha256`), 'utf8').trim().split(/\s+/)[0].toUpperCase();
}

const sealedFiles = [
  'README.md',
  'canon/laws/LAW-SLICE-ENGINE.md',
  'docs/ASOLARIA-AS-NEURAL-NETWORK.hbp',
  'docs/BILATERAL-VANTAGE-ISOLATION-SEED-2026-06-12.hbp',
  'docs/ACER-BILATERAL-VANTAGE-ISOLATION-READBACK-2026-06-12.hbp',
  'docs/ACER-CROWN-REFLECTION-2026-06-12.hbp',
  'docs/LIRIS-CROWN-PLAN-DEEPENING-READBACK-2026-06-12.hbp',
  'docs/LIRIS-CLAIMSGATE-ANSWER-PRODUCER-READBACK-2026-06-12.hbp',
  'docs/LIRIS-FISCHER-SCORER-SPEC-READBACK-2026-06-12.hbp',
  'docs/LIRIS-EXTERNAL-SIGNAL-SWEEP-2026-06-12.hbp',
  'docs/LIRIS-SOTA-ABSORPTION-READBACK-2026-06-12.hbp',
  'docs/LIRIS-KIMI-DESKTOP-INSPECTION-2026-06-12.hbp',
  'docs/LIRIS-KIMI-DAIMON-SCANNER-READBACK-2026-06-12.hbp',
  'docs/LIRIS-LOCAL-ENGINE-SURFACE-CATCH-2026-06-12.hbp',
  'docs/LIRIS-ODYSSEUS-CHATOS-FRONTEND-ABSORPTION-2026-06-12.hbp',
  'docs/LIRIS-FISCHER-SCORER-SPEC-V3-READBACK-2026-06-12.hbp',
  'docs/ACER-KIMI-DAIMON-CATCH-AND-SOTA-READBACK-2026-06-12.hbp',
  'docs/ACER-SOTA-ABSORPTION-READBACK-2026-06-12.hbp',
  'docs/ACER-LOCAL-ENGINE-CENSUS-2026-06-12.hbp',
  'docs/ACER-FRONTEND-PARITY-ABSORPTION-READBACK-2026-06-12.hbp',
  'docs/ACER-AGENTTERMS-OMNIDISPATCHER-CENSUS-CORRECTION-2026-06-12.hbp',
  'docs/ACER-SUPEROS-FABRIC-FOLD-200STEP-2026-06-12.hbp',
  'docs/ACER-HUMAN-FRONT-AGENT-BACK-PREDICTION-LANE-2026-06-12.hbp',
  'docs/ACER-VISUAL-PREDICTION-FROZEN-GEMMA-PROOF-GATE-2026-06-12.hbp',
  'docs/ACER-LAW-STUB-AND-RUN-PID-REGISTRATION-2026-06-12.hbp',
  'docs/ACER-GITHUB-PID-DIVISION-16LEVEL-UPGRADE-2026-06-12.hbp',
  'docs/ACER-PID-CONVERGENCE-READBACK-2026-06-12.hbp',
  'docs/ACER-PID-KIND-IDENTITY-PATCH-2026-06-12.hbp',
  'docs/ACER-PID-ADVERSARIAL-COLLISION-AND-DIVERGENCE-2026-06-12.hbp',
  'docs/ACER-FABLE5-MCP-16LEVEL-200STEP-SYNTHESIS-2026-06-12.hbp',
  'docs/CODEX-LIRIS-LAWGROUNDED-ENVELOPE-RECEIPT-2026-06-12.hbp',
  'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp',
  'docs/ACER-ASOLARIA-NN-SPINE-CONSISTENCY-REGULATOR-2026-06-12.hbp',
  'docs/ACER-PIXEL-ROOM-REMOTE-CONTROL-LANE-2026-06-12.hbp',
  'docs/ACER-ATTACK-SPINE-PIXELROOM-READBACK-2026-06-12.hbp',
  'docs/ACER-ATTACK-PIXELROOM-CONTRACT-2026-06-12.hbp',
  'docs/ACER-PIXELROOM-PID-RECONCILE-PATCH-2026-06-12.hbp',
  'docs/ACER-ROUND-CLOSE-CONVERGENCE-ATTACK-VERIFY-2026-06-12.hbp',
  'docs/ACER-FABRIC-PRELOAD-CATALOG-CASCADE-RECEIPT-2026-06-12.hbp',
  'docs/ACER-ATTACK-VERIFY-CATALOG-2026-06-12.hbp',
  'docs/ACER-EXISTING-STUB-FOLDER-CENSUS-2026-06-13.hbp',
  'docs/ACER-ROOM-COUNT-RECONCILE-2026-06-13.hbp',
  'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp',
  'docs/ACER-200STEP-PLAN-REFINEMENT-2026-06-13.hbp',
  'docs/ACER-BUILDS-FEEDER-AND-GNN-LOOP-2026-06-13.hbp',
  'docs/LIRIS-ACER-BUILDS-ACCEPTANCE-2026-06-13.hbp',
  'docs/ACER-DAEMONS-HARDENED-FABRIC-NATIVE-2026-06-13.hbp',
  'docs/LIRIS-ACER-DAEMONS-HARDENED-READBACK-2026-06-13.hbp',
  'docs/ACER-DAEMON-HBP-HEARTBEAT-2026-06-13.hbp',
  'docs/LIRIS-ACER-DAEMON-HBP-HEARTBEAT-READBACK-2026-06-13.hbp',
  'docs/ACER-FABRIC-QUERY-LIVE-LOOP-READBACK-2026-06-13.hbp',
  'docs/ACER-COUNCIL-QUERY-HBP-INGESTION-2026-06-13.hbp',
  'docs/LIRIS-LIVE-LOOP-TICK-READBACK-2026-06-13.hbp',
  'docs/LIRIS-ACER-COUNCIL-QUERY-HBP-CATCH-READBACK-2026-06-13.hbp',
  'docs/ACER-VERDICT-MATERIALIZATION-FIX-2026-06-13.hbp',
  'docs/ACER-VERDICT-HBP-PARITY-2026-06-13.hbp',
  'docs/LIRIS-ACER-VERDICT-HBP-PARITY-READBACK-2026-06-13.hbp',
  'docs/ACER-DISPATCH-HELD-HBP-MIRROR-2026-06-13.hbp',
  'docs/LIRIS-ACER-DISPATCH-HELD-HBP-MIRROR-READBACK-2026-06-13.hbp',
  'docs/FABRIC-WITNESS-TRIAD-LAW-2026-06-13.hbp',
  'docs/LIRIS-LOCAL-HOW-10WAY-FABRIC-TEST-2026-06-13.hbp',
  'docs/ACER-FIDELITY-WHAT-HAPPENED-2026-06-13.hbp',
  'docs/QUANTFIDELITYSPEC4-2026-06-13.hbp',
  'docs/QUANT4-FIDELITY-PILOT-BASELINE-2026-06-13.hbp',
  'docs/LIRIS-QUANTFIDELITYSPEC4-BUILD-2026-06-13.hbp',
  'docs/LIRIS-FABRIC-VAULT-USB-ACCESS-MAP-2026-06-13.hbp',
  'docs/ACER-SPEC4-VAULT-READBACK-2026-06-13.hbp',
  'docs/ACER-DEEP-REASONING-ONTOLOGY-2026-06-13.hbp',
  'docs/ACER-PRE-EXISTENCE-GRAPH-EXPORTER-2026-06-13.hbp',
  'docs/ACER-TRIAD-NEST-REFERENCE-2026-06-13.hbp',
  'docs/LIRIS-MLC-LINE-WATCHER-2026-06-13.hbp',
  'docs/LIRIS-SLICE-ENGINE-LAW-2026-06-13.hbp',
  'docs/LIRIS-SELFHEAL-200STEP-INTEGRATION-2026-06-13.hbp',
  'docs/ACER-SLICE-ENGINE-LIVE-CRANK-RECEIPT-2026-06-13.hbp',
  'docs/LIRIS-ROUTE-HEALTH-BASELINE-2026-06-13.hbp',
  'docs/ACER-ROUTE-HEALTH-CROSS-VANTAGE-2026-06-13.hbp',
  'docs/ACER-BUS-HEALTH-CONTRACT-FIX-2026-06-13.hbp',
  'docs/LIRIS-GITHUB-LIVE-OFFICE-RECONCILE-EXPANSION-2026-06-13.hbp',
  'docs/ACER-ATTACK-LIRIS-RECONCILE-EXPANSION-2026-06-13.hbp',
  'docs/LIRIS-CATCH-COUNT-LEDGER-2026-06-14.hbp',
  'docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp',
  'docs/LIRIS-MLC-ENGINE-WIRING-INCREMENT-2026-06-14.hbp',
  'docs/acer-ecosystem-fullbody-receipt-20260612.hbp',
  'docs/CLAIMSLEDGER-2026-06-12.hbp',
  'docs/CLAIMSGATE-PARITY-BASELINE-2026-06-12.hbp',
  'docs/ANSWER-PRODUCER-PARITY-BASELINE-2026-06-12.hbp',
  'docs/FISCHER-SCORER-SPEC-2026-06-12.hbp',
  'docs/FISCHER-SCORER-SPEC-V3-2026-06-12.hbp',
  'docs/ACER-FISCHER-V3-RECONCILE-2026-06-12.hbp',
  'docs/TARGET-ARCHITECTURE-VISION-2026-06-10.hbp',
  'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp',
  'docs/ACER-200-STEP-DELTA-READBACK-2026-06-11.hbp',
  'docs/ACER-CONVERGENCE-COMPONENT-2-2026-06-11.hbp',
  'docs/LIRIS-D22-VERB-ADAPTER-2026-06-11.hbp',
  'docs/ACER-READBACK-D22-2026-06-11.hbp',
  'docs/D22-PARITY-BASELINE-2026-06-11.hbp',
  'docs/DASHBOARD-RESOLVER-PARITY-BASELINE-2026-06-11.hbp',
  'docs/LIRIS-DASHBOARD-RESOLVER-READBACK-2026-06-11.hbp',
  'docs/ACER-READBACK-DASHBOARD-RESOLVER-2026-06-11.hbp',
  'docs/WATCHER-SUPERVISOR-SUGGESTION-PARITY-BASELINE-2026-06-11.hbp',
  'docs/ACER-WATCHER-SUPERVISOR-SEED-2026-06-11.hbp',
  'docs/TOKEN-CUBE-CATALOG-PARITY-BASELINE-2026-06-11.hbp',
  'docs/ACER-TOKEN-CUBE-CATALOG-SEED-2026-06-11.hbp',
  'docs/LIRIS-TOKEN-CUBE-CATALOG-READBACK-2026-06-11.hbp',
  'docs/ACER-TOKEN-CUBE-READBACK-PLUS-LANE-2026-06-11.hbp',
  'docs/LIRIS-TOKEN-CUBE-LANE-READBACK-2026-06-11.hbp',
  'docs/ACER-TOKEN-CUBE-LANE-CONFIRM-2026-06-11.hbp',
  'docs/FROZEN-SLICE-FIRST-BINDING-2026-06-11.hbp',
  'docs/LIRIS-FROZEN-SLICE-BINDING-CONFIRM-2026-06-11.hbp',
  'docs/NNEST-WATCHER-GATE-PARITY-BASELINE-2026-06-11.hbp',
  'docs/ACER-NNEST-GATE-SEED-2026-06-11.hbp',
  'docs/LIRIS-NNEST-GATE-READBACK-2026-06-11.hbp',
  'docs/ACER-NNEST-GATE-HARDEN-2026-06-11.hbp',
  'docs/LIRIS-NNEST-GATE-HARDEN-READBACK-2026-06-11.hbp',
  'docs/ACER-NNEST-GATE-INPUT-TOTALITY-2026-06-11.hbp',
  'docs/LIRIS-NNEST-GATE-CLOSURE-2026-06-11.hbp',
  'docs/AGENT-SPAWN-THROUGHPUT-CALIBRATION-2026-06-11.hbp',
  'docs/ACER-SPAWN-THROUGHPUT-READBACK-2026-06-11.hbp',
  'docs/LIRIS-SPAWN-THROUGHPUT-READBACK-2026-06-11.hbp',
  'docs/ACER-GEMMA-SUBSTRATE-INVENTORY-2026-06-11.hbp',
  'docs/LIRIS-GEMMA-SUBSTRATE-READBACK-2026-06-11.hbp',
  'docs/ACER-GEMMA-INVENTORY-CONFIRM-2026-06-11.hbp',
  'docs/FROZEN-SLICE-MANIFEST-REBIND-2026-06-11.hbp',
  'docs/FROZEN-SLICE-REBIND-PREIMAGE-2026-06-11.hbp',
  'docs/ACER-QUANT-HUGE-MESSAGE-BENCH-2026-06-11.hbp',
  'docs/QUANTFIDELITYSPEC8-2026-06-11.hbp',
  'docs/LIRIS-QUANTFIDELITYSPEC8-READBACK-2026-06-11.hbp',
  'docs/QUANT-FIDELITY-PILOT-BASELINE-2026-06-11.hbp',
  'docs/ACER-QUANT-FIDELITY-PILOT-2026-06-11.hbp',
  'docs/LIRIS-QUANT-FIDELITY-PILOT-READBACK-2026-06-11.hbp',
  'docs/QUANT8DEFS-2026-06-11.hbp',
  'docs/MEDIANSKETCHSPEC8-2026-06-11.hbp',
  'docs/LIRIS-QUANT8-CENSUS-MEDIANSKETCH-READBACK-2026-06-11.hbp',
  'docs/ACER-CENSUS-MEDIANSKETCH-CONFIRM-2026-06-11.hbp',
  'docs/QUANT8DEFS-CODE-GROUNDED-2026-06-11.hbp',
  'docs/QUANT8DEFS-ZETA-VONMANGOLDT-ADDENDUM-2026-06-11.hbp',
  'docs/ZETAQUANTSPEC-2026-06-11.hbp',
  'docs/LIRIS-ZETA-MEDIANSKETCH-SPEC-VERDICT-2026-06-11.hbp',
  'docs/ZETA-QUANT-PARITY-BASELINE-2026-06-11.hbp',
  'docs/ACER-ZETA-IMPLEMENTATION-2026-06-11.hbp',
  'docs/LIRIS-ZETA-IMPLEMENTATION-READBACK-2026-06-11.hbp',
  'docs/LOGICAL-EXTREME-STRESS-2026-06-11.hbp',
  'docs/ACER-LOGICAL-EXTREME-STRESS-2026-06-11.hbp',
  'docs/ACER-LOGICAL-EXTREME-STRESS-READBACK-2026-06-11.hbp',
  'docs/ACER-LOGICAL-EXTREME-STRESS-CUBE-FEED-2026-06-11.hbp',
  'docs/LOGICAL-EXTREME-STRESS-CUBE-FEED-2026-06-11.hbp',
  'docs/BROWN-HILBERT-EXPANSION-STRESS-2026-06-11.hbp',
  'docs/LIRIS-BHX-EXPANSION-CATCH33-PATCH-2026-06-11.hbp',
  'docs/ACER-BHX-EXPANSION-CATCH33-VERIFIED-2026-06-11.hbp',
  'docs/LIRIS-BHX-EXPANSION-CATCH34-TEST-COVERAGE-PATCH-2026-06-11.hbp',
  'docs/ANSWER-PRODUCER-SPEC-2026-06-11.hbp',
  'docs/LIRIS-ANSWER-PRODUCER-SPEC-READBACK-2026-06-11.hbp',
  'docs/ACER-ANSWER-PRODUCER-SPEC-PATCH-2026-06-11.hbp',
  'docs/LIRIS-ANSWER-PRODUCER-SPEC-V2-READBACK-2026-06-12.hbp',
  'docs/ACER-ANSWER-PRODUCER-SPEC-V3-PATCH-2026-06-12.hbp',
  'docs/LIRIS-ANSWER-PRODUCER-SPEC-V3-READBACK-2026-06-12.hbp',
  'docs/ACER-ANSWER-PRODUCER-SPEC-V4-PATCH-2026-06-12.hbp',
  'docs/ACER-ANSWER-PRODUCER-SPEC-V5-PATCH-2026-06-12.hbp',
  'docs/LIRIS-ANSWER-PRODUCER-SPEC-V5-READBACK-2026-06-12.hbp',
  'docs/LIRIS-FROZEN-SLICE-PREIMAGE-READBACK-2026-06-11.hbp',
  'docs/LIRIS-QUANT-HUGE-MESSAGE-BENCH-READBACK-2026-06-11.hbp',
  'docs/LIRIS-FROZEN-SLICE-REBIND-READBACK-2026-06-11.hbp',
  'docs/LIRIS-ACER-NODE24-READBACK-2026-06-11.hbp',
  'docs/LIRIS-WATCHER-SUPERVISOR-READBACK-2026-06-11.hbp',
  'docs/ACER-READBACK-WATCHER-SUPERVISOR-2026-06-11.hbp',
  'docs/LIRIS-STEP166-PARITY-CONFIRMED-2026-06-11.hbp',
  'specs/SUPERVISOR-COLLISION-ROUTER-SPEC.hbp',
  'tools/behcs/supervisor-collision-router.mjs',
  'tools/behcs/supervisor-collision-router.hbp',
  'tools/behcs/supervisor-collision-router.hbi',
  'tools/behcs/omnidirectional-translator-router.mjs',
  'tools/behcs/omnidirectional-translator-router.hbp',
  'tools/behcs/omnidirectional-translator-router.hbi',
  'tools/behcs/d22-verb-adapter.mjs',
  'tools/behcs/d22-verb-adapter.hbp',
  'tools/behcs/d22-verb-adapter.hbi',
  'tools/behcs/d22-parity-probe.mjs',
  'tools/behcs/dashboard-resolver.mjs',
  'tools/behcs/dashboard-resolver.hbp',
  'tools/behcs/dashboard-resolver.hbi',
  'tools/behcs/watcher-supervisor-suggestion-emitter.mjs',
  'tools/behcs/watcher-supervisor-suggestion-emitter.hbp',
  'tools/behcs/watcher-supervisor-suggestion-emitter.hbi',
  'tools/behcs/token-cube-catalog-binder.mjs',
  'tools/behcs/token-cube-catalog-binder.hbp',
  'tools/behcs/token-cube-catalog-binder.hbi',
  'tools/behcs/nnest-watcher-gate.mjs',
  'tools/behcs/nnest-watcher-gate.hbp',
  'tools/behcs/nnest-watcher-gate.hbi',
  'tools/behcs/zeta-quant.mjs',
  'tools/behcs/zeta-quant.hbp',
  'tools/behcs/agent-spawn-throughput-benchmark.mjs',
  'tools/behcs/quant-huge-message-benchmark.mjs',
  'tools/behcs/quant-fidelity-sweep.mjs',
  'tools/behcs/quant4-fidelity-spec.mjs',
  'tools/behcs/pre-existence-graph-exporter.mjs',
  'tools/behcs/triad-nest-reference.mjs',
  'tools/behcs/mlc-line-watcher.mjs',
  'tools/behcs/mlc-engine-wiring-increment.mjs',
  'tools/behcs/omni-engine-loop.mjs',
  'tools/behcs/heal-envelope-emitter.mjs',
  'tools/behcs/route-health-baseline.mjs',
  'tools/behcs/logical-extreme-stress.mjs',
  'tools/behcs/logical-stress-cube-feed.mjs',
  'tools/behcs/brown-hilbert-expansion-stress.mjs',
  'tools/behcs/claims-gate.mjs',
  'tools/behcs/claims-gate.hbp',
  'tools/behcs/answer-producer.mjs',
  'tools/behcs/answer-producer.hbp',
  'tools/behcs/kimi-desktop-surface-scan.mjs',
  'tools/behcs/kimi-desktop-surface-scan.hbp',
  'tools/behcs/github-pid-register.mjs',
  'tools/behcs/github-live-pid-reconcile.mjs',
  'tools/behcs/github-live-pid-reconcile.hbp',
  'tools/behcs/github-live-office-reconcile-expansion.mjs',
  'tools/behcs/catch-count-ledger.mjs',
  'tools/behcs/fabric-agent-preload-catalog.mjs',
  'tools/behcs/fabric-agent-preload-catalog.hbp',
  'tools/behcs/pixel-room-handle.mjs',
  'tools/behcs/pixel-room-handle.hbp',
  'tools/omni-processor/omnitranslator-v0.js',
  'tests/agent-spawn-throughput-benchmark.unit.test.mjs',
  'tests/quant-huge-message-benchmark.unit.test.mjs',
  'tests/quant-fidelity-sweep.unit.test.mjs',
  'tests/quant4-fidelity-spec.unit.test.mjs',
  'tests/pre-existence-graph-exporter.unit.test.mjs',
  'tests/triad-nest-reference.unit.test.mjs',
  'tests/mlc-line-watcher.unit.test.mjs',
  'tests/mlc-engine-wiring-increment.unit.test.mjs',
  'tests/omni-engine-loop.unit.test.mjs',
  'tests/heal-envelope-emitter.unit.test.mjs',
  'tests/route-health-baseline.unit.test.mjs',
  'tests/logical-extreme-stress.unit.test.mjs',
  'tests/logical-stress-cube-feed.unit.test.mjs',
  'tests/brown-hilbert-expansion-stress.unit.test.mjs',
  'tests/claims-gate.unit.test.mjs',
  'tests/answer-producer.unit.test.mjs',
  'tests/kimi-desktop-surface-scan.unit.test.mjs',
  'tests/github-pid-register.unit.test.mjs',
  'tests/github-live-pid-reconcile.unit.test.mjs',
  'tests/github-live-office-reconcile-expansion.unit.test.mjs',
  'tests/catch-count-ledger.unit.test.mjs',
  'tests/fabric-agent-preload-catalog.unit.test.mjs',
  'tests/pixel-room-handle.unit.test.mjs',
  'tests/d22-verb-adapter.unit.test.mjs',
  'tests/d22-parity-probe.unit.test.mjs',
  'tests/dashboard-resolver.unit.test.mjs',
  'tests/watcher-supervisor-suggestion-emitter.unit.test.mjs',
  'tests/token-cube-catalog-binder.unit.test.mjs',
  'tests/nnest-watcher-gate.unit.test.mjs',
  'tests/zeta-quant.unit.test.mjs',
  'tests/supervisor-collision-router.unit.test.mjs',
  'tests/supervisor-collision-router.integration.test.mjs',
  'tests/supervisor-collision-router.suite.test.mjs',
  'tests/supervisor-collision-router.system.test.mjs',
  'tests/supervisor-collision-router.fabric.test.mjs',
  'tests/omnidirectional-translator-router.unit.test.mjs',
];

test('all convergence artifacts have matching sha256 sidecars', () => {
  for (const rel of sealedFiles) {
    assert.equal(existsSync(join(repo, `${rel}.sha256`)), true, `${rel}.sha256 missing`);
    assert.equal(sidecarHash(rel), sha256(rel), `${rel} sidecar mismatch`);
  }
});

test('descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/supervisor-collision-router.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`mjs_sha256=${sha256('tools/behcs/supervisor-collision-router.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/supervisor-collision-router.unit.test.mjs')}`));
  assert.match(hbp, new RegExp(`translator_router_sha256=${sha256('tools/behcs/omnidirectional-translator-router.mjs')}`));
});

test('translator descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/omnidirectional-translator-router.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`core_sha256=${sha256('tools/omni-processor/omnitranslator-v0.js')}`));
  assert.match(hbp, new RegExp(`router_sha256=${sha256('tools/behcs/omnidirectional-translator-router.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/omnidirectional-translator-router.unit.test.mjs')}`));
});

test('D22 adapter descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/d22-verb-adapter.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`adapter_sha256=${sha256('tools/behcs/d22-verb-adapter.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/d22-verb-adapter.unit.test.mjs')}`));
});

test('dashboard resolver descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/dashboard-resolver.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`resolver_sha256=${sha256('tools/behcs/dashboard-resolver.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/dashboard-resolver.unit.test.mjs')}`));
});

test('suggestion emitter descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/watcher-supervisor-suggestion-emitter.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`emitter_sha256=${sha256('tools/behcs/watcher-supervisor-suggestion-emitter.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/watcher-supervisor-suggestion-emitter.unit.test.mjs')}`));
});

test('token-cube binder descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/token-cube-catalog-binder.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`binder_sha256=${sha256('tools/behcs/token-cube-catalog-binder.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/token-cube-catalog-binder.unit.test.mjs')}`));
});

test('nnest watcher-gate descriptor records the current source and unit-test hashes', () => {
  const hbp = readFileSync(join(repo, 'tools/behcs/nnest-watcher-gate.hbp'), 'utf8');
  assert.match(hbp, new RegExp(`gate_sha256=${sha256('tools/behcs/nnest-watcher-gate.mjs')}`));
  assert.match(hbp, new RegExp(`test_sha256=${sha256('tests/nnest-watcher-gate.unit.test.mjs')}`));
});

test('sidecar filenames point at their target basenames', () => {
  for (const rel of sealedFiles) {
    const text = readFileSync(join(repo, `${rel}.sha256`), 'utf8').trim();
    assert.ok(text.endsWith(`  ${basename(rel)}`), `${rel}.sha256 basename mismatch`);
  }
});
