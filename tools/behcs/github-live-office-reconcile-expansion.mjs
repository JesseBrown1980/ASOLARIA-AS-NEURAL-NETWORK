#!/usr/bin/env node
// github-live-office-reconcile-expansion.mjs
//
// Descriptor-only expansion of the old github-live-pid-reconcile seed. It consumes
// the live fabric supervisor HBP feed (:4949/hbp/supervisors), derives the
// GitHub-side deterministic PID identity for each office REG row via mintPid(),
// and emits an alias map. ALIAS_REQUIRED can mean name sanitation divergence OR
// legacy/live-office derivation divergence; it is not treated as failure. It does
// not mint, write to the office, cut over a PID, spawn a process, or repair anything.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { mintPid } from './github-pid-register.mjs';

export const EXPANSION_ID = 'github-live-office-reconcile-expansion.v1';
export const FEED_CONTRACT = ':4949/hbp/supervisors';
export const RECONCILE_STATES = Object.freeze({
  MATCH: 'MATCH',
  ALIAS_REQUIRED: 'ALIAS_REQUIRED',
  INVALID_OFFICE_ROW: 'INVALID_OFFICE_ROW',
});

const sha16 = (s) => createHash('sha256').update(String(s ?? ''), 'utf8').digest('hex').slice(0, 16).toUpperCase();
const safe = (s) => { try { return String(s == null ? '' : s).replace(/[|\r\n]/g, '_'); } catch { return '_'; } };
const isObj = (x) => x !== null && typeof x === 'object';

function fieldMap(row) {
  const out = {};
  for (const part of String(row ?? '').split('|').slice(1)) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i)] = part.slice(i + 1);
  }
  return out;
}

export function parseSupervisorFeed(input = '') {
  let text = '';
  try { text = String(input ?? ''); } catch { text = ''; } // total against a hostile toString
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const header = {};
  const footer = {};
  const entries = [];
  for (const line of lines) {
    if (line.startsWith('FEEDHDR|')) Object.assign(header, fieldMap(line));
    if (line.startsWith('FEEDFTR|')) Object.assign(footer, fieldMap(line));
    if (!line.startsWith('REG|')) continue;
    const f = fieldMap(line);
    entries.push({
      name: f.name || '',
      pid: f.pid || '',
      hilbert: Number.parseInt(f.hilbert || '0', 10) || 0,
      layer: f.layer || '',
      class: f.class || '',
      g1024: Number.parseInt(f.g1024 || '-1', 10),
      g5: Number.parseInt(f.g5 || '-1', 10),
      sector: f.sector || '',
      status: f.status || '',
    });
  }
  const reported = Number.parseInt(header.entries || footer.rows || String(entries.length), 10);
  return {
    header,
    footer,
    feed_contract: FEED_CONTRACT,
    reported_entries: Number.isFinite(reported) ? reported : entries.length,
    body_sha16: footer.body_sha16 || sha16(text),
    entries,
  };
}

function roleForLayer(layer) {
  const s = String(layer || '').toLowerCase();
  if (s.includes('prof')) return 'PROF';
  if (s.includes('agent')) return 'AGT';
  return 'SUP';
}

function tierForLayer(layer) {
  const s = String(layer || '').toLowerCase();
  if (s.includes('operator')) return 0;
  if (s.includes('helm')) return 1;
  if (s.includes('prof')) return 2;
  return 4;
}

function cleanHex16(s) {
  return /^[0-9a-fA-F]{16}$/.test(String(s || '')) ? String(s).toLowerCase() : '';
}

export function reconcileEntry(entry = {}, opts = {}) {
  try {
    const e = isObj(entry) ? entry : {};
  const duplicateNameCount = Number(opts.duplicateNameCount || 1);
  const role = roleForLayer(e.layer);
  const tier = tierForLayer(e.layer);
  let github = null;
  let error = '';
  if (!String(e.name || '').trim() || /[|\r\n]/.test(String(e.name || ''))) {
    error = 'office-name-required-clean';
  } else {
    try {
      github = mintPid({ role, name: e.name, tier, prime: 0, nest: 1 });
      if (!github.name) {
        github = null;
        error = 'github-name-empty-after-sanitize';
      }
    } catch (err) {
      error = err?.message || 'mintPid-failed';
    }
  }
  const officePid = cleanHex16(e.pid);
  const officeGlyph = Number(e.g1024);
  const githubSha16 = github?.sha16 || '';
  const githubGlyph = Number(github?.glyph_1024);
  const sha_match = !!officePid && githubSha16.toLowerCase() === officePid;
  const glyph_match = Number.isFinite(officeGlyph) && Number.isFinite(githubGlyph) && officeGlyph === githubGlyph;
  const name_canonical = !!github && github.name === e.name;
  const state = !github || !officePid
    ? RECONCILE_STATES.INVALID_OFFICE_ROW
    : (sha_match && glyph_match ? RECONCILE_STATES.MATCH : RECONCILE_STATES.ALIAS_REQUIRED);
  return {
    name: e.name || '',
    layer: e.layer || '',
    class: e.class || '',
    status: e.status || '',
    hilbert: e.hilbert || 0,
    office_pid: officePid || e.pid || '',
    office_g1024: Number.isFinite(officeGlyph) ? officeGlyph : '',
    github_role: role,
    github_pid: github?.pid || 'none',
    github_name: github?.name || 'none',
    github_sha16: githubSha16 || 'none',
    github_g1024: Number.isFinite(githubGlyph) ? githubGlyph : '',
    sha_match,
    glyph_match,
    name_canonical,
    duplicate_name: duplicateNameCount > 1,
    duplicate_name_count: duplicateNameCount,
    registered_not_canonical: e.status && e.status !== 'CANONICAL',
    state,
    error,
  };
  } catch {
    // total against a throwing-getter / hostile-object entry (exported API; acer cross-vantage catch wf_5c81a46f)
    return {
      name: '', layer: '', class: '', status: '', hilbert: 0, office_pid: '', office_g1024: '',
      github_role: 'SUP', github_pid: 'none', github_name: 'none', github_sha16: 'none', github_g1024: '',
      sha_match: false, glyph_match: false, name_canonical: false, duplicate_name: false,
      duplicate_name_count: 1, registered_not_canonical: false,
      state: RECONCILE_STATES.INVALID_OFFICE_ROW, error: 'reconcile-threw-on-hostile-input',
    };
  }
}

export function reconcileSupervisorFeed(input = '') {
  const feed = parseSupervisorFeed(input);
  const nameCounts = new Map();
  for (const e of feed.entries) nameCounts.set(e.name, (nameCounts.get(e.name) || 0) + 1);
  const aliases = feed.entries.map((entry) => reconcileEntry(entry, { duplicateNameCount: nameCounts.get(entry.name) || 1 }));
  const counts = {
    entries: aliases.length,
    reported_entries: feed.reported_entries,
    match: aliases.filter((a) => a.state === RECONCILE_STATES.MATCH).length,
    alias_required: aliases.filter((a) => a.state === RECONCILE_STATES.ALIAS_REQUIRED).length,
    invalid_office_row: aliases.filter((a) => a.state === RECONCILE_STATES.INVALID_OFFICE_ROW).length,
    noncanonical_name: aliases.filter((a) => !a.name_canonical).length,
    duplicate_name_rows: aliases.filter((a) => a.duplicate_name).length,
    duplicate_names: [...nameCounts.values()].filter((n) => n > 1).length,
    registered_not_canonical: aliases.filter((a) => a.registered_not_canonical).length,
  };
  return {
    tool: EXPANSION_ID,
    feed_contract: FEED_CONTRACT,
    feed_ts: feed.header.ts || '',
    office: feed.header.office || '',
    body_sha16: feed.body_sha16,
    process_launch: 0,
    descriptor_only: true,
    counts,
    aliases,
  };
}

export function emitRows(report, opts = {}) {
  try {
    const r = isObj(report) && Array.isArray(report.aliases) ? report : reconcileSupervisorFeed('');
    const limit = Number.isFinite(opts.limit) ? Math.max(0, Math.floor(opts.limit)) : r.aliases.length;
    const rows = [
      `GLORECHDR|tool=${EXPANSION_ID}|feed_contract=${safe(r.feed_contract)}|feed_ts=${safe(r.feed_ts)}|office=${safe(r.office)}|entries=${safe(r.counts.entries)}|reported_entries=${safe(r.counts.reported_entries)}|body_sha16=${safe(r.body_sha16)}|descriptor_only=1|process_launch=0|json=0`,
    ];
    for (const a of r.aliases.slice(0, limit)) {
      rows.push(`GLORECALIAS|name=${safe(a.name)}|state=${safe(a.state)}|office_pid=${safe(a.office_pid)}|office_g1024=${safe(a.office_g1024)}|github_role=${safe(a.github_role)}|github_name=${safe(a.github_name)}|github_sha16=${safe(a.github_sha16)}|github_g1024=${safe(a.github_g1024)}|github_pid=${safe(a.github_pid)}|sha_match=${a.sha_match ? 1 : 0}|glyph_match=${a.glyph_match ? 1 : 0}|name_canonical=${a.name_canonical ? 1 : 0}|duplicate_name=${a.duplicate_name ? 1 : 0}|duplicate_name_count=${safe(a.duplicate_name_count)}|hilbert=${safe(a.hilbert)}|layer=${safe(a.layer)}|status=${safe(a.status)}|json=0`);
    }
    rows.push(`GLORECSUM|entries=${safe(r.counts.entries)}|emitted=${safe(Math.min(limit, r.aliases.length))}|match=${safe(r.counts.match)}|alias_required=${safe(r.counts.alias_required)}|invalid_office_row=${safe(r.counts.invalid_office_row)}|noncanonical_name=${safe(r.counts.noncanonical_name)}|duplicate_names=${safe(r.counts.duplicate_names)}|duplicate_name_rows=${safe(r.counts.duplicate_name_rows)}|registered_not_canonical=${safe(r.counts.registered_not_canonical)}|json=0`);
    rows.push('GLORECGATE|github_pid_is_proposed=1|alias_map_descriptor_only=1|no_office_write=1|no_mint=1|no_cutover=1|no_spawn=1|process_launch=0|oldlearnnewpidlaw=github-pids-remain-proposed-until-live-office-alias-map-byte-receipted|json=0');
    return rows;
  } catch {
    return [
      `GLORECHDR|tool=${EXPANSION_ID}|feed_contract=${FEED_CONTRACT}|entries=0|reported_entries=0|descriptor_only=1|process_launch=0|json=0`,
      'GLORECERROR|error=emit-threw-on-hostile-input|json=0',
      'GLORECGATE|github_pid_is_proposed=1|alias_map_descriptor_only=1|no_office_write=1|no_mint=1|no_cutover=1|no_spawn=1|process_launch=0|oldlearnnewpidlaw=github-pids-remain-proposed-until-live-office-alias-map-byte-receipted|json=0',
    ];
  }
}

export const SAMPLE_FEED = `FEEDHDR|schema=hbp.fabric.supervisor.feed.v1|ts=2026-06-13T21:27:21.857Z|office=D:/PID-Registration-Office|entries=6|cap_joined=37|authority=OP-JESSE-BUILD-and-upgrade-2026-06-10|json=0
REG|name=OP-JESSE|pid=76c91471d760073b|hilbert=908|layer=operator|class=operator_class_agent|g1024=113|g5=2|sector=?|status=CANONICAL
REG|name=CEO-ASOLARIA-INSTANCES|pid=9198ed80b00dddee|hilbert=892|layer=helm|class=supervisor_of_supervisors_role_seat|g1024=858|g5=0|sector=?|status=CANONICAL
REG|name=CEO-ASOLARIA-INSTANCES|pid=9198ed80b00dddee|hilbert=892|layer=agent|class=supervisor_of_supervisors_role_seat|g1024=858|g5=1|sector=?|status=CANONICAL
REG|name=cube_cubed_sealer|pid=adaa7553334e9d40|hilbert=1006|layer=supervisor|class=hyperbehcs_supervisor_entity|g1024=339|g5=3|sector=?|status=CANONICAL
REG|name=PLANB-FABRIC-SUPERVISOR-V1|pid=250d55bd01957814|hilbert=1622|layer=agent|class=planb_fabric_supervisor_advisory|g1024=269|g5=2|sector=planb|status=REGISTERED
REG|name=ASOLARIA-SLICE-ENGINE-LAW|pid=3cb83d616e3dd777|hilbert=1630|layer=supervisor|class=agent_supervisor|g1024=353|g5=2|sector=supervisor|status=CANONICAL
FEEDFTR|rows=6|body_sha16=SAMPLE`;

export function selfTest() {
  const report = reconcileSupervisorFeed(SAMPLE_FEED);
  const byName = new Map(report.aliases.map((a) => [a.name, a]));
  const rows = emitRows(report, { limit: 4 });
  const checks = [
    ['sample-count', report.counts.entries === 6 && report.counts.reported_entries === 6],
    ['canonical-op-matches', byName.get('OP-JESSE')?.state === RECONCILE_STATES.MATCH],
    ['canonical-looking-legacy-alias-counted', byName.get('CEO-ASOLARIA-INSTANCES')?.state === RECONCILE_STATES.ALIAS_REQUIRED && byName.get('CEO-ASOLARIA-INSTANCES')?.name_canonical === true],
    ['noncanonical-underscore-alias-required', byName.get('cube_cubed_sealer')?.state === RECONCILE_STATES.ALIAS_REQUIRED && byName.get('cube_cubed_sealer')?.name_canonical === false],
    ['duplicate-name-counted', report.counts.duplicate_names === 1 && report.counts.duplicate_name_rows === 2],
    ['registered-not-canonical-counted', report.counts.registered_not_canonical === 1],
    ['gate-held-safe', rows.some((row) => row.startsWith('GLORECGATE|') && row.includes('no_mint=1') && row.includes('no_cutover=1'))],
    ['hbp-only', rows.every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row) && !row.includes('{"'))],
    ['limit-does-not-affect-summary', rows.some((row) => row.startsWith('GLORECSUM|') && row.includes('entries=6') && row.includes('emitted=4'))],
  ].map(([name, ok]) => ({ name, ok: Boolean(ok) }));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : undefined;
  const hbp = process.argv.includes('--stdin') ? readFileSync(0, 'utf8') : SAMPLE_FEED;
  for (const row of emitRows(reconcileSupervisorFeed(hbp), { limit })) console.log(row);
}
