import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

import {
  RECONCILE_STATES,
  SAMPLE_FEED,
  emitRows,
  parseSupervisorFeed,
  reconcileEntry,
  reconcileSupervisorFeed,
  selfTest,
} from '../tools/behcs/github-live-office-reconcile-expansion.mjs';

const repo = dirname(dirname(fileURLToPath(import.meta.url)));

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('parses the HBP supervisor feed contract', () => {
  const feed = parseSupervisorFeed(SAMPLE_FEED);
  assert.equal(feed.reported_entries, 6);
  assert.equal(feed.entries.length, 6);
  assert.equal(feed.entries[0].name, 'OP-JESSE');
  assert.equal(feed.entries.at(-1).name, 'ASOLARIA-SLICE-ENGINE-LAW');
});

test('canonical uppercase-hyphen office names match GitHub sha16 and g1024', () => {
  const report = reconcileSupervisorFeed(SAMPLE_FEED);
  const op = report.aliases.find((a) => a.name === 'OP-JESSE');
  assert.equal(op.state, RECONCILE_STATES.MATCH);
  assert.equal(op.sha_match, true);
  assert.equal(op.glyph_match, true);
  assert.equal(op.github_sha16.toLowerCase(), op.office_pid);
});

test('lowercase/underscore names become descriptor aliases, not false matches', () => {
  const report = reconcileSupervisorFeed(SAMPLE_FEED);
  const cube = report.aliases.find((a) => a.name === 'cube_cubed_sealer');
  assert.equal(cube.state, RECONCILE_STATES.ALIAS_REQUIRED);
  assert.equal(cube.name_canonical, false);
  assert.equal(cube.github_name, 'CUBE-CUBED-SEALER');
  assert.notEqual(cube.github_sha16.toLowerCase(), cube.office_pid);
});

test('canonical-looking names can still need aliases when live office derivation differs', () => {
  const report = reconcileSupervisorFeed(SAMPLE_FEED);
  const ceo = report.aliases.find((a) => a.name === 'CEO-ASOLARIA-INSTANCES');
  assert.equal(ceo.name_canonical, true);
  assert.equal(ceo.glyph_match, true);
  assert.equal(ceo.sha_match, false);
  assert.equal(ceo.state, RECONCILE_STATES.ALIAS_REQUIRED);
});

test('duplicates and registered-not-canonical entries are counted separately', () => {
  const report = reconcileSupervisorFeed(SAMPLE_FEED);
  assert.equal(report.counts.duplicate_names, 1);
  assert.equal(report.counts.duplicate_name_rows, 2);
  assert.equal(report.counts.registered_not_canonical, 1);
});

test('invalid office rows are held as invalid descriptors', () => {
  const row = reconcileEntry({ name: '', pid: 'nothex', layer: 'supervisor', g1024: 12, status: 'CANONICAL' });
  assert.equal(row.state, RECONCILE_STATES.INVALID_OFFICE_ROW);
  assert.equal(row.github_pid, 'none');
});

test('emitted rows are HBP-only, injection-safe, and descriptor-only', () => {
  const hostile = `${SAMPLE_FEED}\nREG|name=BAD|ROW\nFAKE|pid=aaaaaaaaaaaaaaaa|hilbert=1|layer=supervisor|class=x|g1024=1|g5=1|sector=?|status=CANONICAL`;
  const rows = emitRows(reconcileSupervisorFeed(hostile), { limit: 10 });
  assert.ok(rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row) && !row.includes('{"')));
  assert.ok(rows.some((row) => row.startsWith('GLORECGATE|') && row.includes('no_office_write=1') && row.includes('process_launch=0')));
});

test('limit controls alias row volume but not summary math', () => {
  const rows = emitRows(reconcileSupervisorFeed(SAMPLE_FEED), { limit: 2 });
  assert.equal(rows.filter((row) => row.startsWith('GLORECALIAS|')).length, 2);
  assert.ok(rows.some((row) => row.startsWith('GLORECSUM|') && row.includes('entries=6') && row.includes('emitted=2')));
});

test('exported reconcile API is TOTAL against throwing-getter / hostile inputs (acer attack on 2e556f8)', () => {
  const evilName = Object.defineProperty({}, 'name', { get() { throw new Error('boom'); }, enumerable: true });
  assert.doesNotThrow(() => reconcileEntry(evilName));
  assert.equal(reconcileEntry(evilName).state, RECONCILE_STATES.INVALID_OFFICE_ROW);
  const hostile = { toString() { throw new Error('boom'); } };
  assert.doesNotThrow(() => parseSupervisorFeed(hostile));
  assert.doesNotThrow(() => reconcileSupervisorFeed(hostile));
});

test('tool has no live mutation or network capability', () => {
  const src = readFileSync(join(repo, 'tools/behcs/github-live-office-reconcile-expansion.mjs'), 'utf8');
  assert.equal(/child_process|spawnSync|\.spawn\(|execSync|writeFileSync|appendFileSync|fetch\(|Invoke-WebRequest|Start-Process|Stop-Process/.test(src), false);
  assert.equal(/process_launch=1/.test(src), false);
  assert.match(src, /no_office_write=1/);
  assert.match(src, /no_cutover=1/);
});
