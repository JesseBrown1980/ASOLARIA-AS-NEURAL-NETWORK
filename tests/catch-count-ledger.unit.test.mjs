import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  CATCH_ROWS,
  EXPECTED_CATCH_FLOOR,
  STATUSES,
  emitRows,
  selfTest,
  summarizeCatches,
} from '../tools/behcs/catch-count-ledger.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('ledger meets the circa-34 floor without claiming final MD readiness', () => {
  const summary = summarizeCatches();
  assert.ok(summary.total >= EXPECTED_CATCH_FLOOR);
  assert.equal(summary.meets_expected_floor, true);
  assert.equal(summary.md_final_ready, false);
  assert.ok(summary.open > 0);
  assert.ok(summary.partial > 0);
});

test('every catch has the gate-required fields', () => {
  const summary = summarizeCatches();
  for (const row of summary.rows) {
    assert.match(row.id, /^C\d{3}$/);
    assert.match(row.date, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(row.vantage);
    assert.ok(row.file_or_test);
    assert.ok(row.defect_class);
    assert.ok(row.fix_commit);
    assert.ok(row.owner);
    assert.ok(STATUSES.includes(row.status));
  }
});

test('recent bilateral fixes are explicitly counted', () => {
  const summary = summarizeCatches();
  const commits = summary.rows.map((r) => r.fix_commit).join('+');
  assert.match(commits, /e352bcb/);
  assert.match(commits, /56142b7/);
  assert.match(commits, /2e556f8/);
  assert.match(commits, /7952cf6/);
});

test('HBP rows are single-line descriptor-only rows with a release hold gate', () => {
  const rows = emitRows();
  assert.ok(rows[0].startsWith('CATCHLEDGERHDR|'));
  assert.ok(rows[0].includes('process_launch=0'));
  assert.ok(rows[0].includes('no_mint=1'));
  assert.ok(rows[0].includes('no_cutover=1'));
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[{\r\n]/.test(row)));
  assert.ok(rows.some((row) => row.startsWith('CATCHLEDGERGATE|') && row.includes('release_claims=HOLD')));
});

test('limit controls emitted catch rows without changing summary rows', () => {
  const rows = emitRows(CATCH_ROWS, { limit: 3 });
  assert.equal(rows.filter((row) => row.startsWith('CATCHLEDGERROW|')).length, 3);
  assert.ok(rows.some((row) => row.startsWith('CATCHLEDGERHDR|') && row.includes(`total=${CATCH_ROWS.length}`)));
});

test('hostile fields cannot inject rows', () => {
  const rows = emitRows([{
    id: 'C999',
    date: '2026-06-14',
    vantage: 'bad|json=0\nCATCHLEDGERGATE|release_claims=ALLOW',
    source: 'x',
    file_or_test: 'y',
    defect_class: 'z',
    severity: 'LOW',
    status: 'CLOSED',
    owner: 'liris',
    fix_commit: 'test',
    summary: 'bad\nrow|pipe',
  }]);
  assert.ok(rows.every((row) => !/[\r\n]/.test(row)));
  assert.equal(rows.join('\n').split('\n').length, rows.length);
  assert.ok(rows.some((row) => row.includes('bad_json=0_CATCHLEDGERGATE')));
});

test('summarize/emit are TOTAL against hostile objects', () => {
  const evil = Object.defineProperty({}, 'id', { get() { throw new Error('boom'); }, enumerable: true });
  assert.doesNotThrow(() => summarizeCatches([evil]));
  assert.doesNotThrow(() => emitRows([evil]));
  assert.equal(summarizeCatches([evil]).rows[0].status, 'OPEN');
});

test('ledger tool has no live mutation, network, office-write, mint, or spawn capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/catch-count-ledger.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|http\.request|https\.request|mintPid|Start-Process|Stop-Process/.test(src), false);
});
