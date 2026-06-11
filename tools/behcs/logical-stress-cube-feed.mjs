#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { bindToken, classifyBhIndex } from './token-cube-catalog-binder.mjs';

const DEFAULT_SOURCE = 'docs/LOGICAL-EXTREME-STRESS-2026-06-11.hbp';
const NODE_SPECS = Object.freeze([
  Object.freeze({ id: 'speed', head: 'LOGICSTRESSSPEED', metric: 'logical_agents', catalog: 'atlas-v55' }),
  Object.freeze({ id: 'tokens', head: 'LOGICSTRESSTOKENS', metric: 'bindings', catalog: 'hilbert-omni-47D' }),
  Object.freeze({ id: 'collisions', head: 'LOGICSTRESSCOLLISIONS', metric: 'probes', catalog: 'atlas-v55' }),
  Object.freeze({ id: 'zeta', head: 'LOGICSTRESSZETA', metric: 'classifications', catalog: 'quant-bus-v48' }),
  Object.freeze({ id: 'reduction', head: 'LOGICSTRESSREDUCTION', metric: 'cycles', catalog: 'quant-bus-v48' }),
  Object.freeze({ id: 'process', head: 'LOGICSTRESSPROCESS', metric: 'logical_ops_total', catalog: 'd22-translation' }),
]);

export const DEFINITION_ROWS = Object.freeze([
  'LOGICSTRESSCUBEDEF|tool=logical-stress-cube-feed.mjs|purpose=process-sealed-logical-stress-receipt-into-draft-cube+gnn-feed-rows|default=definition-only|json=0',
  'LOGICSTRESSCUBESCOPE|source=sealed-HBP-receipt|output=draft-feed-rows-only|no_live_cube_mutation=1|no_fabric_call=1|no_mint=1|json=0',
  'LOGICSTRESSCUBELAYERS|nodes=speed+tokens+collisions+zeta+reduction+process|bindings=token-cube-binder-DRAFT_BINDING_READY|edges=receipt->section+section->section-summary|json=0',
]);

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function sha16(text) {
  return sha256(text).slice(0, 16);
}

function parseHbp(text) {
  const rows = text.trim().split(/\r?\n/).filter(Boolean);
  return rows.map((raw) => {
    const [head, ...parts] = raw.split('|');
    const fields = {};
    for (const part of parts) {
      const at = part.indexOf('=');
      if (at > 0) fields[part.slice(0, at)] = part.slice(at + 1);
    }
    return { head, fields, raw };
  });
}

function byHead(parsed, head) {
  const row = parsed.find((r) => r.head === head);
  if (!row) throw new Error(`missing source row ${head}`);
  return row;
}

function uint32From(text) {
  return createHash('sha256').update(text).digest().readUInt32BE(0);
}

function cubeIndex(seed) {
  // Keep draft bindings outside the 930..1229 disputed band while still using
  // deterministic receipt-derived placement. Range is 1..929.
  return 1 + (uint32From(seed) % 929);
}

function cubeAddress(seed) {
  return `BH-ACER-${cubeIndex(seed)}`;
}

function numberField(row, key) {
  const n = Number(row.fields[key]);
  if (!Number.isFinite(n)) throw new Error(`bad numeric field ${row.head}.${key}`);
  return n;
}

function nodeRows(sourceSha16, spec, row) {
  const cube_bh = cubeAddress(`${sourceSha16}:${spec.id}`);
  const index = Number(cube_bh.split('-').at(-1));
  const bh = classifyBhIndex(index);
  const digest = sha16(row.raw);
  const token = bindToken({
    token_id: `TOK-LSTRESS-${spec.id.toUpperCase()}`,
    token_kind: 'sha16-row-hash',
    digest_sha16: digest,
    cube_bh,
    scope: 'attest',
    source_catalog: spec.catalog,
    mode: 'draft',
  });
  if (token.verdict !== 'DRAFT_BINDING_READY') throw new Error(`binding failed for ${spec.id}: ${token.gate}`);
  const metricValue = numberField(row, spec.metric);
  const ops = row.fields.ops_per_sec ?? row.fields.ingest_mbps ?? row.fields.rss_peak_mb ?? 'none';
  return {
    id: spec.id,
    cube_bh,
    bh,
    digest,
    metricValue,
    node: `LOGICSTRESSCUBENODE|id=${spec.id}|source_row=${row.head}|cube_bh=${cube_bh}|bh_lane=${bh.lane}|bh_ppow=${bh.ppow}|metric=${spec.metric}|value=${metricValue}|rate=${ops}|digest_sha16=${digest}|json=0`,
    bind: token.row,
  };
}

function edgeRows(nodes, sourceSha16) {
  const rows = [];
  for (const node of nodes) {
    rows.push(`LOGICSTRESSGNNEDGE|from=stress-receipt-${sourceSha16}|to=${node.id}|kind=receipt-evidence|weight=${node.metricValue}|cube_bh=${node.cube_bh}|json=0`);
  }
  const pairs = [
    ['speed', 'tokens', 'hot-stream-feeds-token-binder'],
    ['speed', 'collisions', 'hot-stream-feeds-collision-router'],
    ['speed', 'zeta', 'address-stream-feeds-zeta-classifier'],
    ['reduction', 'process', 'quant-tail-fits-process-envelope'],
    ['zeta', 'collisions', 'external-lane-catches-corruption'],
  ];
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  for (const [from, to, kind] of pairs) {
    const a = byId[from];
    const b = byId[to];
    rows.push(`LOGICSTRESSGNNEDGE|from=${from}|to=${to}|kind=${kind}|from_cube=${a.cube_bh}|to_cube=${b.cube_bh}|weight=${Math.min(a.metricValue, b.metricValue)}|json=0`);
  }
  return rows;
}

export function emitCubeFeed(sourcePath = DEFAULT_SOURCE) {
  const sourceBytes = readFileSync(sourcePath);
  const sourceText = sourceBytes.toString('utf8');
  const sourceHash = sha256(sourceBytes);
  const sourceSha16 = sourceHash.slice(0, 16);
  const parsed = parseHbp(sourceText);
  const verdict = byHead(parsed, 'LOGICSTRESSVERDICT');
  if (verdict.fields.status !== 'PASS') throw new Error('source stress receipt is not PASS');

  const nodes = NODE_SPECS.map((spec) => nodeRows(sourceSha16, spec, byHead(parsed, spec.head)));
  const rows = [
    `LOGICSTRESSCUBEHDR|source=${basename(sourcePath)}|source_sha256=${sourceHash.toUpperCase()}|source_sha16=${sourceSha16}|nodes=${nodes.length}|edges=${nodes.length + 5}|mode=DRAFT_CUBE_FEED_NO_LIVE_MUTATION|json=0`,
    'LOGICSTRESSCUBESAFETY|no_live_cube_mutation=1|no_fabric_call=1|no_mint=1|bindings_are_draft_references=1|json=0',
  ];
  for (const node of nodes) {
    rows.push(node.node);
    rows.push(node.bind);
  }
  rows.push(...edgeRows(nodes, sourceSha16));
  rows.push(`LOGICSTRESSCUBEFTR|status=PASS|source_rows=${parsed.length}|feed_rows=${rows.length + 1}|json=0`);
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  if (!args.includes('--feed')) {
    process.stdout.write(`${DEFINITION_ROWS.join('\n')}\n`);
  } else {
    const source = args.find((arg) => !arg.startsWith('--')) ?? DEFAULT_SOURCE;
    process.stdout.write(`${emitCubeFeed(source).join('\n')}\n`);
  }
}
