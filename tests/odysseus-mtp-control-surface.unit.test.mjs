import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  BANDS, ODYSSEUS_SOURCE, SURFACE_ID,
  buildSurface, emitRows, selfTest,
} from '../tools/behcs/odysseus-mtp-control-surface.mjs';

test('odysseus MTP control surface self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('surface binds Odysseus source, M/T/P cells, and v8 map band', () => {
  const surface = buildSurface();
  assert.equal(surface.tool, SURFACE_ID);
  assert.equal(surface.source, ODYSSEUS_SOURCE);
  assert.deepEqual(BANDS, ['M-model-selector', 'T-tool-skill', 'P-project-guide', 'MAP3D-v8-real-graph']);
  assert.equal(surface.summary.bands, 4);
  assert.equal(surface.summary.mtp_descriptor_backed, 3);
  assert.ok(surface.bands.some((b) => b.id === 'MAP3D' && b.source === 'tools/behcs/eight-byte-host-process-upgrade.mjs'));
});

test('M/T/P are descriptor-backed but not cutover-green', () => {
  const surface = buildSurface();
  for (const id of ['M', 'T', 'P']) {
    const band = surface.bands.find((b) => b.id === id);
    assert.equal(band.status, 'PARTIAL_DESCRIPTOR_BACKED');
    assert.equal(band.cutover, 0);
  }
  assert.equal(surface.summary.cutover_ready, false);
  assert.equal(surface.summary.live_execution_ready, false);
});

test('routes use existing selector registry and guide artifacts', () => {
  const surface = buildSurface({
    model_need: 'pixel frame world model',
    tool_need: 'live engine daemon launch',
    project_topic: 'cosign submit schema',
  });
  assert.equal(surface.routes.model.selected, 'frozen-gemma-proof-gated');
  assert.equal(surface.routes.tool.selected, 'live-engine-daemon-contract');
  assert.equal(surface.routes.project.selected, 'cosign-submit');
});

test('phone rendering is not claimed by the repo descriptor', () => {
  const surface = buildSurface();
  assert.equal(surface.summary.phone_render_proven_here, false);
  assert.ok(surface.bands.find((b) => b.id === 'MAP3D').next.includes('phone-render-proof'));
});

test('emitted rows are HBP-only and hold all live actions', () => {
  const rows = emitRows({ model_need: 'fischer score', tool_need: 'cosign submit schema', project_topic: 'frontier catch queue' });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.startsWith('ODYSSEUSMTPHDR|') && row.includes('process_launch=0') && row.includes('cutover=0')));
  assert.ok(rows.some((row) => row.startsWith('ODYSSEUSMTPROUTE|cell=M') && row.includes('selected=fischer-draft-standin')));
  assert.ok(rows.some((row) => row.startsWith('ODYSSEUSMTPGATE|') && row.includes('operator_cosign_required_for_live_actions=1')));
});

test('tool remains descriptor-only and has no live call surface', () => {
  const source = readFileSync(new URL('../tools/behcs/odysseus-mtp-control-surface.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /from ['"]node:fs['"]|child_process|\bexecFile\b|\bexecSync\b|\bspawn\(|\bfetch\(|Invoke-WebRequest|Start-Process|node:http|node:net|createWriteStream/);
});
