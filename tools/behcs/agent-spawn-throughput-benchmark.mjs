#!/usr/bin/env node
import { performance } from 'node:perf_hooks';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOM_COUNT = 10000;
const DEFAULT_ITERATIONS = 5_000_000;
const DEFAULT_TYPED_ITERATIONS = 20_000_000;

export const CALIBRATION_ROWS = Object.freeze([
  'SPAWNBENCHHDR|tool=agent-spawn-throughput-benchmark.mjs|purpose=define-and-optionally-measure-logical-agent-spawn-tiers|default=no-live-benchmark-no-disk-write|json=0',
  'SPAWNBENCHTIER|tier=A|definition=coordinate-assignment-only-id-counter-increment|class=logical-spawn|canonical_acer_measurement=413.12M_per_sec|json=0',
  'SPAWNBENCHTIER|tier=B|definition=descriptor-object-pid-room-seed|class=logical-spawn-small-allocation|canonical_acer_measurement=44.22M_per_sec|json=0',
  'SPAWNBENCHTIER|tier=C|definition=descriptor-plus-room-rotation-plus-two-modulo-classifier-marks|class=logical-spawn-with-room-address|canonical_acer_measurement=43.68M_per_sec|json=0',
  'SPAWNBENCHTIER|tier=D|definition=open-room-pipe-no-write-open-plus-close-existing-room-file|class=filesystem-touch-no-commit|canonical_acer_measurement=0.020M_per_sec(20079_per_sec)|note=prior-5.47M-figure-was-NOT-an-acer-measurement-and-is-physically-impossible-for-file-opens(183ns-per-open)|json=0',
  'SPAWNBENCHTIER|tier=E|definition=write-hex-receipt-rows-batched-append-one-file|class=batched-persistence|canonical_acer_measurement=3.57M_per_sec_C_internal+1.18M_per_sec_D_drive|note=prior-1.73M-figure-was-NOT-an-acer-measurement|json=0',
  'SPAWNBENCHTIER|tier=F|definition=write-sha256-sidecar-batched|class=batched-persistence-plus-sidecar|canonical_acer_measurement=0.45M_per_sec|note=sha-bound-prior-1.73M-figure-was-NOT-an-acer-measurement|json=0',
  'SPAWNBENCHRECEIPT|id=mk-cascade-1779990440799|packets=6531840000|wall_clock=27.1min|rate=4019265_per_sec|sha16=fd8ae45e5ecb4e0d|status=ACER_RECEIPT_BACKED|json=0',
  'SPAWNBENCHRECEIPT|id=mk-cascade-1779990401792|packets=65318400|wall_clock=16.3s|rate=4016875_per_sec|status=ACER_RECEIPT_BACKED_SCALE_TWIN|json=0',
  'SPAWNBENCHRECEIPT|id=civ-combined-1780011161408|packets=326592000|wall_clock=104.3s|rate=3131846_per_sec|status=ACER_RECEIPT_BACKED|json=0',
  'SPAWNBENCH100B|id=REAL_100B_PID_PACKET_RUN_COMPLETE|packets=100000000000|chunks=100000|fed_to=cubes+GNN-edges+Shannon-symbols+BEHCS-256+BEHCS-1024+hyper-glyphs|policy=oneAgentOneProcessBlocked+childProcessSpawns0+externalModelTokens0|json=0',
  'SPAWNBENCHSECTOR|rule=drives-multiply-address-capacity-machines-multiply-rate|sector_6GB=750M_8B_seed_slots|usb_2TB=250B_slots|google_35TB=4.4T_slots|never=one-file-per-agent|json=0',
  'SPAWNBENCHUPGRADE|rung=typed-SoA-tier-C-single-thread|canonical_acer_measurement=66.1M_per_sec|sample=100M-in-1.51s|status=ACER_MEASURED_PENDING_LIRIS_RERUN|json=0',
  'SPAWNBENCHFTR|rule=probe-overrules-frame|live_run=pass---run-to-measure-current-machine|json=0',
]);

function parsePositiveInt(arg, prefix, fallback) {
  const found = arg.find((value) => value.startsWith(prefix));
  if (!found) return fallback;
  const parsed = Number.parseInt(found.slice(prefix.length), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function perSecond(iterations, ms) {
  return Math.round((iterations * 1000) / Math.max(ms, 0.000001));
}

function bench(name, iterations, work) {
  const started = performance.now();
  const checksum = work(iterations) >>> 0;
  const elapsedMs = performance.now() - started;
  return `SPAWNBENCHLIVE|tier=${name}|iterations=${iterations}|elapsed_ms=${elapsedMs.toFixed(3)}|ops_per_sec=${perSecond(iterations, elapsedMs)}|checksum=${checksum}|json=0`;
}

// Module-level escaping sink: the canonical acer rows were measured with
// allocations that ESCAPE the loop (assigned to an outer binding), so the JIT
// cannot scalar-replace the descriptor objects away. The first committed
// version XORed local fields instead, which let escape analysis delete the
// allocation -- its --run produced ~5x lighter numbers (acer live A=839M vs
// canonical 413M) that were incomparable to the canonical rows. (acer
// methodology-alignment patch 2026-06-11.)
let SINK = null;

function runA(iterations) {
  for (let i = 0; i < iterations; i += 1) SINK = i + 1;
  return SINK >>> 0;
}

function runB(iterations) {
  for (let i = 0; i < iterations; i += 1) {
    SINK = { pid: i, room: i % ROOM_COUNT, seed: (i * 2654435761) >>> 0 };
  }
  return SINK.seed >>> 0;
}

function runC(iterations) {
  for (let i = 0; i < iterations; i += 1) {
    const room = i % ROOM_COUNT;
    const genius = (i % 50) === 0;
    const mistake = (i % 47) === 0;
    SINK = { pid: i, room, g: genius, m: mistake };
  }
  return (SINK.room ^ (SINK.g ? 1 : 0) ^ (SINK.m ? 2 : 0)) >>> 0;
}

function runTypedC(iterations) {
  const marks = new Uint8Array(1 << 16);
  let g = 0;
  let m = 0;
  let roomAcc = 0;
  for (let i = 0; i < iterations; i += 1) {
    const room = i % ROOM_COUNT;
    const genius = (i % 50) === 0;
    const mistake = (i % 47) === 0;
    marks[i & 65535] = (genius ? 1 : 0) | (mistake ? 2 : 0);
    if (genius) g += 1;
    if (mistake) m += 1;
    roomAcc += room;
  }
  SINK = marks;
  return (g ^ m ^ (roomAcc % 997)) >>> 0;
}

export function emitDefinitionRows() {
  return [...CALIBRATION_ROWS];
}

export function runLiveBenchmark(options = {}) {
  const iterations = options.iterations ?? DEFAULT_ITERATIONS;
  const typedIterations = options.typedIterations ?? DEFAULT_TYPED_ITERATIONS;
  return [
    `SPAWNBENCHLIVEHDR|iterations=${iterations}|typed_iterations=${typedIterations}|disk_writes=0|json=0`,
    bench('A-coordinate-assignment', iterations, runA),
    bench('B-descriptor-object', iterations, runB),
    bench('C-room-rotation-classifier', iterations, runC),
    bench('UPGRADED-typed-SoA-tier-C', typedIterations, runTypedC),
    'SPAWNBENCHLIVEFTR|note=live-rates-are-machine-and-load-dependent-seal-output-in-a-receipt-before-claim-upgrade|json=0',
  ];
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const args = process.argv.slice(2);
  const rows = args.includes('--run')
    ? runLiveBenchmark({
      iterations: parsePositiveInt(args, '--iterations=', DEFAULT_ITERATIONS),
      typedIterations: parsePositiveInt(args, '--typed-iterations=', DEFAULT_TYPED_ITERATIONS),
    })
    : emitDefinitionRows();
  process.stdout.write(`${rows.join('\n')}\n`);
}
