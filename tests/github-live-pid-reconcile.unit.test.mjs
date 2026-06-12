import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LIVE_SNAPSHOT, RECONCILE_STATUS, SNAPSHOT_SOURCE,
  emitReconcileRow, emitSnapshotRows, reconcile, selfTest,
} from '../tools/behcs/github-live-pid-reconcile.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('known live office snapshot entries reconcile as divergent, not equal', () => {
  const shannon = reconcile({ name: 'shannon' });
  assert.equal(shannon.github_hex, 'HE2EC');
  assert.equal(shannon.live_hex, 'HD16C');
  assert.equal(shannon.status, RECONCILE_STATUS.DIVERGENT);
  const hermes = reconcile({ name: 'hermes' });
  assert.equal(hermes.github_hex, 'HDFEC');
  assert.equal(hermes.live_hex, 'HD17C');
  assert.equal(hermes.status, RECONCILE_STATUS.DIVERGENT);
});

test('deepseek uses the corrected github hex H4DAC, not the stale HB5EC typo', () => {
  const deepseek = reconcile({ name: 'deepseek' });
  assert.equal(deepseek.github_hex, 'H4DAC');
  assert.notEqual(deepseek.github_hex, 'HB5EC');
  assert.equal(deepseek.live_hex, 'HD15C');
  assert.equal(deepseek.status, RECONCILE_STATUS.DIVERGENT);
});

test('unknown names remain pending instead of fabricating a live office assignment', () => {
  const r = reconcile({ name: 'future-agent' });
  assert.equal(r.status, RECONCILE_STATUS.PENDING);
  assert.equal(r.live_pid, 'none');
  assert.equal(r.snapshot_source, SNAPSHOT_SOURCE);
});

test('snapshot rows are HBP-only and include source metadata', () => {
  assert.equal(Object.keys(LIVE_SNAPSHOT).length, 3);
  const rows = emitSnapshotRows();
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  assert.ok(rows.some((row) => row.includes('snapshot_source=') && row.includes('count41')));
  assert.ok(emitReconcileRow(reconcile({ name: 'shannon' })).includes('status=DIVERGENT'));
});
