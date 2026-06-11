#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { cpus } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

const DEFAULT_SECONDS = 600;
const DEFAULT_EXPONENTS = Object.freeze([200, 1000, 10000, 100000, 1000000]);
const STRIDE = 0x9e3779b97f4a7c15n;
const SALT = 0x243f6a8885a308d3n;

export const DEFINITION_ROWS = Object.freeze([
  'BHXSTRESSDEF|tool=brown-hilbert-expansion-stress.mjs|purpose=stress-addressability-beyond-1e200-with-BigInt-coordinate-invariants|default=definition-only|json=0',
  'BHXSTRESSSCOPE|tests=coordinate-arithmetic+law-of-three+mod6-residue+decimal-digest-sampling|does_not_test=enumerating-1eN-agents+exact-prime-power-factorization-at-huge-N+live-cube-mutation|json=0',
  'BHXSTRESSLAW|expansion=more-digits-add-resolution-not-resident-agents|forced_stability=n-mod-3+n-mod-6-derived-from-integer-coordinate|json=0',
]);

function nowMs() {
  return performance.now();
}

function perSecond(count, ms) {
  return Math.round((count * 1000) / Math.max(ms, 0.000001));
}

function parseNumber(args, name, fallback) {
  const item = args.find((arg) => arg.startsWith(`${name}=`));
  if (!item) return fallback;
  const n = Number(item.slice(name.length + 1));
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseExponents(args) {
  const item = args.find((arg) => arg.startsWith('--exponents='));
  if (!item) return DEFAULT_EXPONENTS;
  const exps = item.slice('--exponents='.length)
    .split(',')
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n >= 200);
  return exps.length ? exps : DEFAULT_EXPONENTS;
}

function sha16(text) {
  return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

function mb(bytes) {
  return (bytes / 1048576).toFixed(1);
}

function snapshot() {
  const m = process.memoryUsage();
  return { rss: m.rss, heap: m.heapUsed, external: m.external };
}

function verifyDecimalPower(base, exponent) {
  const s = base.toString();
  return {
    digits: s.length,
    prefix: s.slice(0, 8),
    suffix: s.slice(-8),
    sha16: sha16(s),
    ok: s.length === exponent + 1 && s[0] === '1' && s.lastIndexOf('1') === 0,
  };
}

function runExponent(exponent, seconds) {
  const sectionStarted = nowMs();
  const deadline = sectionStarted + seconds * 1000;
  const buildStarted = nowMs();
  const base = 10n ** BigInt(exponent);
  const buildMs = nowMs() - buildStarted;
  const decimal = verifyDecimalPower(base, exponent);
  let ops = 0;
  let digestOps = 0;
  let lane0 = 0;
  let lane1 = 0;
  let lane2 = 0;
  const residue6 = [0, 0, 0, 0, 0, 0];
  let checksum = 0n;
  let digestXor = 0;

  while (nowMs() < deadline) {
    const addr = base + (BigInt(ops) * STRIDE) + SALT;
    const lane = Number(addr % 3n);
    const residue = Number(addr % 6n);
    if (lane === 0) lane0 += 1;
    else if (lane === 1) lane1 += 1;
    else lane2 += 1;
    residue6[residue] += 1;
    checksum ^= (addr % 0xffffffffn) ^ BigInt(lane << 8) ^ BigInt(residue);
    if ((ops & 1023) === 0) {
      digestXor ^= createHash('sha256').update(addr.toString()).digest()[0];
      digestOps += 1;
    }
    ops += 1;
  }
  const elapsedMs = nowMs() - sectionStarted;
  return {
    exponent,
    buildMs,
    digits: decimal.digits,
    decimalSha16: decimal.sha16,
    decimalOk: decimal.ok,
    ops,
    digestOps,
    elapsedMs,
    opsPerSec: perSecond(ops, elapsedMs),
    digestPerSec: perSecond(digestOps, elapsedMs),
    lane0,
    lane1,
    lane2,
    residue6,
    checksum: Number(checksum & 0xffffffffn),
    digestXor,
  };
}

export function runExpansionStress(options = {}) {
  const seconds = options.seconds ?? DEFAULT_SECONDS;
  const exponents = options.exponents ?? DEFAULT_EXPONENTS;
  const sectionSeconds = seconds / exponents.length;
  const start = nowMs();
  const startMem = snapshot();
  let peakRss = startMem.rss;
  const rows = [
    `BHXSTRESSHDR|tool=brown-hilbert-expansion-stress.mjs|duration_requested_sec=${seconds}|exponents=${exponents.join(',')}|section_sec=${sectionSeconds.toFixed(3)}|json=0`,
    `BHXSTRESSENV|node=${process.version}|platform=${process.platform}|arch=${process.arch}|cpu_count=${cpus().length}|pid=${process.pid}|json=0`,
  ];
  let totalOps = 0;
  let maxExponent = 0;
  let allOk = true;
  for (const exponent of exponents) {
    const r = runExponent(exponent, sectionSeconds);
    peakRss = Math.max(peakRss, snapshot().rss);
    totalOps += r.ops;
    if (r.decimalOk && r.ops > 0) maxExponent = Math.max(maxExponent, exponent);
    allOk &&= r.decimalOk && r.lane0 + r.lane1 + r.lane2 === r.ops && r.residue6.reduce((a, b) => a + b, 0) === r.ops;
    rows.push(`BHXSTRESSROW|exponent=${r.exponent}|address_space=1e${r.exponent}|digits=${r.digits}|build_ms=${r.buildMs.toFixed(3)}|decimal_sha16=${r.decimalSha16}|decimal_shape_ok=${r.decimalOk ? 1 : 0}|coord_ops=${r.ops}|coord_ops_per_sec=${r.opsPerSec}|digest_samples=${r.digestOps}|digest_samples_per_sec=${r.digestPerSec}|lane0=${r.lane0}|lane1=${r.lane1}|lane2=${r.lane2}|residue6=${r.residue6.join(',')}|checksum=${r.checksum}|digest_xor=${r.digestXor}|json=0`);
  }
  const endMem = snapshot();
  rows.push(`BHXSTRESSPROCESS|host_processes_used=1|child_process_spawns=0|external_model_calls=0|rss_start_mb=${mb(startMem.rss)}|rss_peak_mb=${mb(peakRss)}|rss_end_mb=${mb(endMem.rss)}|heap_end_mb=${mb(endMem.heap)}|total_coord_ops=${totalOps}|json=0`);
  rows.push(`BHXSTRESSVERDICT|status=${allOk ? 'PASS' : 'FAIL'}|max_exponent_verified=${maxExponent}|beyond_1e200=${maxExponent > 200 ? 1 : 0}|claim=address-coordinate-invariants-tested-NOT-enumeration|elapsed_ms=${Math.round(nowMs() - start)}|json=0`);
  return rows;
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  if (!args.includes('--run')) {
    process.stdout.write(`${DEFINITION_ROWS.join('\n')}\n`);
  } else {
    process.stdout.write(`${runExpansionStress({
      seconds: parseNumber(args, '--seconds', DEFAULT_SECONDS),
      exponents: parseExponents(args),
    }).join('\n')}\n`);
  }
}
