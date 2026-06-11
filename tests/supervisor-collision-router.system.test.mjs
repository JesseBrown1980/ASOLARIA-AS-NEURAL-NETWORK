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
  'docs/ASOLARIA-AS-NEURAL-NETWORK.hbp',
  'docs/TARGET-ARCHITECTURE-VISION-2026-06-10.hbp',
  'docs/ACER-CONVERGENCE-COMPONENT-2-2026-06-11.hbp',
  'docs/LIRIS-D22-VERB-ADAPTER-2026-06-11.hbp',
  'docs/ACER-READBACK-D22-2026-06-11.hbp',
  'docs/D22-PARITY-BASELINE-2026-06-11.hbp',
  'docs/DASHBOARD-RESOLVER-PARITY-BASELINE-2026-06-11.hbp',
  'docs/LIRIS-DASHBOARD-RESOLVER-READBACK-2026-06-11.hbp',
  'docs/ACER-READBACK-DASHBOARD-RESOLVER-2026-06-11.hbp',
  'docs/WATCHER-SUPERVISOR-SUGGESTION-PARITY-BASELINE-2026-06-11.hbp',
  'docs/ACER-WATCHER-SUPERVISOR-SEED-2026-06-11.hbp',
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
  'tools/omni-processor/omnitranslator-v0.js',
  'tests/d22-verb-adapter.unit.test.mjs',
  'tests/d22-parity-probe.unit.test.mjs',
  'tests/dashboard-resolver.unit.test.mjs',
  'tests/watcher-supervisor-suggestion-emitter.unit.test.mjs',
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

test('sidecar filenames point at their target basenames', () => {
  for (const rel of sealedFiles) {
    const text = readFileSync(join(repo, `${rel}.sha256`), 'utf8').trim();
    assert.ok(text.endsWith(`  ${basename(rel)}`), `${rel}.sha256 basename mismatch`);
  }
});
