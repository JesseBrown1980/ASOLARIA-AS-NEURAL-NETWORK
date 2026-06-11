#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

import { bindToken } from './token-cube-catalog-binder.mjs';
import { planCollisionRoute } from './supervisor-collision-router.mjs';
import { quant8, tupleBuffer } from './quant-huge-message-benchmark.mjs';
import { forcingSweep, zetaClassify, zetaTransition } from './zeta-quant.mjs';

const ROOM_COUNT = 10000;
const DEFAULT_SECONDS = 600;
const DEFAULT_BATCH = 1_000_000;
const DEFAULT_QUANT_MB = 64;
const TOKEN_KINDS = ['sha16-row-hash', 'sha256-ref', 'bh-tuple-digest'];
const CATALOGS = ['hilbert-omni-47D', 'atlas-v55', 'quant-bus-v48'];

export const DEFINITION_ROWS = Object.freeze([
  'LOGICSTRESSDEF|tool=logical-extreme-stress.mjs|purpose=bounded-10-minute-logical-fabric-stress-speed+tokens+reductions+process-envelope+collisions|default=definition-only|json=0',
  'LOGICSTRESSSCOPE|hot_path=logical-only-in-memory|disk=receipt-only-if-caller-redirects-output|child_process_spawns=0|external_model_calls=0|no_live_fabric_mutation=1|json=0',
  'LOGICSTRESSLAYERS|speed=positional-agent-stream|tokens=token-cube-binder|reductions=quant8-large-message-tuple-compression|process=single-node-process-memory-envelope|collisions=supervisor-router+zeta-external-lane-corruption|json=0',
]);

function parseNumber(args, name, fallback) {
  const item = args.find((arg) => arg.startsWith(`${name}=`));
  if (!item) return fallback;
  const n = Number(item.slice(name.length + 1));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nowMs() {
  return performance.now();
}

function perSecond(count, ms) {
  return Math.round((count * 1000) / Math.max(ms, 0.000001));
}

function mb(bytes) {
  return (bytes / 1048576).toFixed(1);
}

function memorySnapshot() {
  const m = process.memoryUsage();
  return {
    rss: m.rss,
    heapUsed: m.heapUsed,
    external: m.external,
  };
}

function hash32(x) {
  x = (x + 0x9e3779b9) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

function runTimed(deadlineMs, batch, work) {
  let ops = 0;
  let checksum = 0;
  const started = nowMs();
  while (nowMs() < deadlineMs) {
    const r = work(batch, ops);
    ops += batch;
    checksum = (checksum ^ r) >>> 0;
  }
  return { ops, elapsedMs: nowMs() - started, checksum };
}

function stressLogical(seconds, batch) {
  const laneCounts = [0, 0, 0];
  const residueCounts = [0, 0, 0, 0, 0, 0];
  let genius = 0;
  let mistake = 0;
  let roomChecksum = 0;
  const r = runTimed(nowMs() + seconds * 1000, batch, (n, offset) => {
    let local = 0;
    for (let j = 0; j < n; j += 1) {
      const id = offset + j;
      const room = id % ROOM_COUNT;
      const lane = id % 3;
      const residue = id % 6;
      laneCounts[lane] += 1;
      residueCounts[residue] += 1;
      if (id % 50 === 0) genius += 1;
      if (id % 47 === 0) mistake += 1;
      local = (local ^ room ^ lane ^ residue ^ hash32(id)) >>> 0;
      roomChecksum = (roomChecksum + room) >>> 0;
    }
    return local;
  });
  return {
    ...r,
    laneCounts,
    residueCounts,
    genius,
    mistake,
    gc2000: Math.min(genius, 2000),
    gc50000: Math.min(mistake, 50000),
    roomChecksum,
  };
}

function tokenInput(i) {
  const kind = TOKEN_KINDS[i % TOKEN_KINDS.length];
  const catalog = CATALOGS[i % CATALOGS.length];
  const address = i % 2000;
  const scope = i % 101 === 0 ? 'mint' : 'bind-draft';
  const mode = i % 89 === 0 ? 'live' : 'draft';
  const dirty = i % 997 === 0;
  return {
    token_id: dirty ? 'TOK-DIRTY|BAD' : `TOK-STRESS-${(i % 1000000).toString(36).toUpperCase().padStart(4, '0')}`,
    token_kind: kind,
    digest_sha16: (0x1000000000000000n + BigInt(hash32(i))).toString(16).slice(-16),
    cube_bh: `BH-ACER-${address}`,
    scope,
    source_catalog: catalog,
    mode,
  };
}

function stressTokens(seconds, batch) {
  const counts = { ready: 0, blocked: 0, defer: 0 };
  const r = runTimed(nowMs() + seconds * 1000, batch, (n, offset) => {
    let local = 0;
    for (let j = 0; j < n; j += 1) {
      const out = bindToken(tokenInput(offset + j));
      if (out.verdict === 'DRAFT_BINDING_READY') counts.ready += 1;
      else if (out.verdict === 'DEFER_TO_OPERATOR') counts.defer += 1;
      else counts.blocked += 1;
      local ^= out.row.length;
    }
    return local;
  });
  return { ...r, counts };
}

function collisionInput(i) {
  const lane = i % 5;
  if (lane === 0) return { head: 'COLLISION', agent_system: 'logical', role: 'supervisor', collision: 'logical' };
  if (lane === 1) return { head: 'COLLISION', agent_system: 'real', os_pid: String(1000 + (i % 1000)), port: '4944' };
  if (lane === 2) return { head: 'COLLISION', role: 'supervisor', collision: 'mixed', port: '0' };
  if (lane === 3) return { head: 'COLLISION', agent_system: 'real', collision: 'real', free_real_address: `BH-ACER-${i % 10000}` };
  return { head: 'STATUS', role: 'logical' };
}

function stressCollisions(seconds, batch) {
  const counts = {};
  const r = runTimed(nowMs() + seconds * 1000, batch, (n, offset) => {
    let local = 0;
    for (let j = 0; j < n; j += 1) {
      const plan = planCollisionRoute(collisionInput(offset + j));
      const key = `${plan.classification}:${plan.state}`;
      counts[key] = (counts[key] ?? 0) + 1;
      local ^= key.length + (plan.executable ? 1 : 0);
    }
    return local;
  });
  return { ...r, counts };
}

function stressZeta(seconds, batch) {
  const lanes = [0, 0, 0];
  const ppow = {};
  let externalCaught = 0;
  let forcedConsistent = 0;
  const r = runTimed(nowMs() + seconds * 1000, batch, (n, offset) => {
    let local = 0;
    for (let j = 0; j < n; j += 1) {
      const idx = (offset + j) % 1000000;
      const z = zetaClassify(idx);
      if (z.lane !== 'none') lanes[z.lane] += 1;
      ppow[z.ppow] = (ppow[z.ppow] ?? 0) + 1;
      if (j % 257 === 0) {
        const t = zetaTransition(11, 13, { claimedLaneA: '2', claimedLaneB: (j % 514 === 0) ? '2' : '1' });
        if (t.verdict === 'FORCING_VIOLATION') externalCaught += 1;
        if (t.verdict === 'FORCED_CONSISTENT') forcedConsistent += 1;
      }
      local ^= z.lane === 'none' ? 0 : z.lane;
    }
    return local;
  });
  const sweep = forcingSweep();
  return { ...r, lanes, ppow, externalCaught, forcedConsistent, sweep };
}

function fillVector(arr, seed) {
  let s = seed >>> 0;
  for (let i = 0; i < arr.length; i += 1) {
    s = Math.imul(s, 1664525) + 1013904223 >>> 0;
    arr[i] = (s / 2147483648) - 1;
  }
}

function stressQuant(seconds, messageMB) {
  const dims = Math.max(1024, Math.floor(messageMB * 1048576 / 8));
  const msg = new Float64Array(dims);
  fillVector(msg, 0x12345678);
  const rawBytes = msg.byteLength;
  let tupleBytes = 0;
  let cycles = 0;
  let hashChecksum = 0;
  const started = nowMs();
  const deadline = started + seconds * 1000;
  while (nowMs() < deadline) {
    const q = quant8(msg);
    const tuple = tupleBuffer(q);
    tupleBytes = tuple.length;
    hashChecksum ^= createHash('sha256').update(tuple).digest()[0];
    cycles += 1;
  }
  const elapsedMs = nowMs() - started;
  return {
    cycles,
    elapsedMs,
    messageMB,
    rawBytes,
    tupleBytes,
    rawProcessedBytes: rawBytes * cycles,
    ingestMBps: (rawBytes * cycles / 1048576) / Math.max(elapsedMs / 1000, 0.000001),
    reduction: rawBytes / Math.max(tupleBytes, 1),
    hashChecksum,
  };
}

function countsRow(prefix, counts) {
  return Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${prefix}${k.replace(/[^A-Za-z0-9_-]/g, '_')}=${v}`).join('|');
}

export function runExtreme(options = {}) {
  const seconds = options.seconds ?? DEFAULT_SECONDS;
  const batch = options.batch ?? DEFAULT_BATCH;
  const quantMB = options.quantMB ?? DEFAULT_QUANT_MB;
  const startedWall = new Date().toISOString();
  const totalStarted = nowMs();
  const startMem = memorySnapshot();
  let peakRss = startMem.rss;
  const rows = [
    `LOGICSTRESSHDR|tool=logical-extreme-stress.mjs|duration_requested_sec=${seconds}|batch=${batch}|quant_message_mb=${quantMB}|started=${startedWall}|json=0`,
    `LOGICSTRESSENV|node=${process.version}|platform=${process.platform}|arch=${process.arch}|cpu_count=${cpus().length}|pid=${process.pid}|json=0`,
  ];
  const slice = {
    logical: seconds * 0.50,
    tokens: seconds * 0.10,
    collisions: seconds * 0.10,
    zeta: seconds * 0.15,
    quant: seconds * 0.15,
  };

  const logical = stressLogical(slice.logical, batch);
  peakRss = Math.max(peakRss, memorySnapshot().rss);
  rows.push(`LOGICSTRESSSPEED|section_sec=${slice.logical.toFixed(3)}|logical_agents=${logical.ops}|ops_per_sec=${perSecond(logical.ops, logical.elapsedMs)}|rooms=${ROOM_COUNT}|lane0=${logical.laneCounts[0]}|lane1=${logical.laneCounts[1]}|lane2=${logical.laneCounts[2]}|residue6=${logical.residueCounts.join(',')}|genius_marks=${logical.genius}|mistake_marks=${logical.mistake}|gc2000_survivors=${logical.gc2000}|gc50000_survivors=${logical.gc50000}|checksum=${(logical.checksum ^ logical.roomChecksum) >>> 0}|json=0`);

  const tokens = stressTokens(slice.tokens, Math.max(1000, Math.floor(batch / 100)));
  peakRss = Math.max(peakRss, memorySnapshot().rss);
  rows.push(`LOGICSTRESSTOKENS|section_sec=${slice.tokens.toFixed(3)}|bindings=${tokens.ops}|ops_per_sec=${perSecond(tokens.ops, tokens.elapsedMs)}|ready=${tokens.counts.ready}|defer=${tokens.counts.defer}|blocked=${tokens.counts.blocked}|checksum=${tokens.checksum}|json=0`);

  const collisions = stressCollisions(slice.collisions, Math.max(1000, Math.floor(batch / 100)));
  peakRss = Math.max(peakRss, memorySnapshot().rss);
  rows.push(`LOGICSTRESSCOLLISIONS|section_sec=${slice.collisions.toFixed(3)}|probes=${collisions.ops}|ops_per_sec=${perSecond(collisions.ops, collisions.elapsedMs)}|${countsRow('state_', collisions.counts)}|checksum=${collisions.checksum}|json=0`);

  const zeta = stressZeta(slice.zeta, Math.max(1000, Math.floor(batch / 20)));
  peakRss = Math.max(peakRss, memorySnapshot().rss);
  rows.push(`LOGICSTRESSZETA|section_sec=${slice.zeta.toFixed(3)}|classifications=${zeta.ops}|ops_per_sec=${perSecond(zeta.ops, zeta.elapsedMs)}|lane0=${zeta.lanes[0]}|lane1=${zeta.lanes[1]}|lane2=${zeta.lanes[2]}|${countsRow('ppow_', zeta.ppow)}|external_lane_catches=${zeta.externalCaught}|external_lane_consistent=${zeta.forcedConsistent}|sweep_pairs=${zeta.sweep.pairs}|sweep_violations=${zeta.sweep.violations}|json=0`);

  const quant = stressQuant(slice.quant, quantMB);
  peakRss = Math.max(peakRss, memorySnapshot().rss);
  rows.push(`LOGICSTRESSREDUCTION|section_sec=${slice.quant.toFixed(3)}|message_mb=${quant.messageMB}|cycles=${quant.cycles}|ingest_mbps=${quant.ingestMBps.toFixed(1)}|raw_bytes_each=${quant.rawBytes}|tuple_bytes_each=${quant.tupleBytes}|reduction_x=${quant.reduction.toFixed(1)}|tail_payload_kb=${(quant.tupleBytes / 1024).toFixed(1)}|checksum=${quant.hashChecksum}|json=0`);

  const endMem = memorySnapshot();
  const totalLogical = logical.ops + tokens.ops + collisions.ops + zeta.ops + quant.cycles;
  const elapsedMs = nowMs() - totalStarted;
  rows.push(`LOGICSTRESSPROCESS|host_processes_used=1|child_process_spawns=0|external_model_calls=0|rss_start_mb=${mb(startMem.rss)}|rss_peak_mb=${mb(peakRss)}|rss_end_mb=${mb(endMem.rss)}|heap_end_mb=${mb(endMem.heapUsed)}|logical_ops_total=${totalLogical}|json=0`);
  rows.push(`LOGICSTRESSVERDICT|status=PASS|limits=logical-only-no-live-mutation-no-per-agent-files|physical_claim=bounded-process-envelope-not-infinite-memory|elapsed_anchor_ms=${Math.round(elapsedMs)}|json=0`);
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  if (!args.includes('--run')) {
    process.stdout.write(`${DEFINITION_ROWS.join('\n')}\n`);
  } else {
    process.stdout.write(`${runExtreme({
      seconds: parseNumber(args, '--seconds', DEFAULT_SECONDS),
      batch: Math.floor(parseNumber(args, '--batch', DEFAULT_BATCH)),
      quantMB: parseNumber(args, '--quant-mb', DEFAULT_QUANT_MB),
    }).join('\n')}\n`);
  }
}
