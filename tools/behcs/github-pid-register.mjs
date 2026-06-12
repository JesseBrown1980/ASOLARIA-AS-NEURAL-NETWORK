import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// GITHUB-PID-REGISTER v1 — a STATELESS, DETERMINISTIC PID minter in the LIVE fabric
// format (learned from the live :4949 AgentTerms lanes, e.g. AGT-SHANNON-PID-HD16C-
// A04-W1024-P01-N00001). github PIDs are sha-derived so acer + liris mint BYTE-IDENTICAL
// PIDs with zero coordination; the live PID Registration Office re-keys on ingest.
// Divisions (forcing stability + dividing collisions): yin/yang = mod-2 (real|logical),
// prime-lane = mod-3 (Law of Three), quad = mod-4 (the operator "4 rule", semantics to
// confirm with the office), glyph_5 = mod-5, glyph_1024 = mod-1024 (BEHCS-1024), sector
// = mod-113 (one of the 113 Asolaria sectors). All coprime-ish moduli reduce collisions.

export const REGISTER_ID = 'github-pid-register.v1';
export const SECTORS = 113;                 // 113 Asolaria sectors
export const WIDTH = 1024;                  // BEHCS-1024 glyph width
export const ROLES = Object.freeze({ AGT: 'C', SUP: 'A', PROF: 'B' }); // role -> hex suffix (live)
export const KINDS = Object.freeze(['real', 'logical']);

const sha256 = (t) => createHash('sha256').update(String(t), 'utf8').digest('hex');
const u32 = (hex8) => parseInt(hex8, 16);

// mint ONE deterministic live-format PID for (role, name) at access-tier + nest.
export function mintPid({ role, name, tier = 4, nest = 1, kind = 'logical', prime = 0 }) {
  if (!(role in ROLES)) throw new Error(`role-must-be-AGT-SUP-PROF:${role}`);
  if (!KINDS.includes(kind)) throw new Error(`kind-must-be-real-or-logical:${kind}`);
  const safe = String(name).toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
  const h = sha256(safe);                           // base/divisions from NAME so the triad shares them (live shape)
  const base3 = h.slice(0, 3).toUpperCase();        // 3 hex
  const hex = base3 + ROLES[role];                  // + role char => H{D15C}-style 4 hex
  const seed = u32(h.slice(0, 8));
  const A = String(Math.max(0, Math.min(15, tier))).padStart(2, '0'); // 16 levels 00..15
  const P = String(prime).padStart(2, '0');
  const N = String(nest).padStart(5, '0');
  const pid = `${role}-${safe}-PID-H${hex}-A${A}-W${WIDTH}-P${P}-N${N}`;
  return {
    pid, role, name: safe,
    hex: `H${hex}`, tier: A, width: String(WIDTH), prime: P, nest: N,
    yin_yang: kind,                                  // real | logical (mod-2 division)
    lane: seed % 3,                                  // Law of Three (prime division)
    quad: seed % 4,                                  // the "4 rule" (mod-4) — confirm w/ office
    glyph_5: seed % 5,
    glyph_1024: seed % WIDTH,
    sector: seed % SECTORS,                          // one of the 113 sectors
    hilbert: u32(h.slice(8, 16)),
    cube_bh: `BH.${seed % SECTORS}.${seed % 3}.${seed % WIDTH}`, // sector.lane.glyph cube address
    sha16: h.slice(0, 16),
  };
}

// register an entity as the AGT/SUP/PROF triad sharing a hex base (the live lane shape).
export function mintTriad({ name, tier = 4, kind = 'logical' }) {
  return {
    AGT: mintPid({ role: 'AGT', name, tier, kind, prime: 1, nest: 1 }),
    SUP: mintPid({ role: 'SUP', name, tier, kind, prime: 0, nest: 1 }),
    PROF: mintPid({ role: 'PROF', name, tier, kind, prime: 0, nest: 1 }),
  };
}

// emit the office-faithful HBP registration rows for one PID.
export function emitRegistrationRows(p, { kind_label = 'github_deterministic_pid', registrar = 'github-pid-register' } = {}) {
  return [
    `PIDREG|name=${p.name}|pid=${p.pid}|role=${p.role}|class=${kind_label}|json=0`,
    `PIDADDR|pid=${p.pid}|hex=${p.hex}|tier=${p.tier}|width=${p.width}|prime=${p.prime}|nest=${p.nest}|hilbert=${p.hilbert}|sector=${p.sector}|json=0`,
    `PIDDIV|pid=${p.pid}|yin_yang=${p.yin_yang}|lane_mod3=${p.lane}|quad_mod4=${p.quad}|glyph_5=${p.glyph_5}|glyph_1024=${p.glyph_1024}|note=divisions-force-stability-and-divide-collisions|json=0`,
    `PIDCUBE|pid=${p.pid}|cube_bh=${p.cube_bh}|sha16=${p.sha16}|registrar=${registrar}|stateless_deterministic=1|live_office_rekeys_on_ingest=1|json=0`,
  ];
}

export function selfTest() {
  const checks = [];
  const add = (n, ok) => checks.push({ name: n, ok });
  const a = mintPid({ role: 'AGT', name: 'shannon', tier: 4, prime: 1 });
  add('live-format-shape', /^AGT-SHANNON-PID-H[0-9A-F]{4}-A\d{2}-W1024-P\d{2}-N\d{5}$/.test(a.pid));
  add('role-suffix-C-for-AGT', a.hex.endsWith('C'));
  add('deterministic', mintPid({ role: 'AGT', name: 'shannon', tier: 4, prime: 1 }).pid === a.pid);
  add('sector-in-113', a.sector >= 0 && a.sector < 113);
  add('lane-in-3', [0, 1, 2].includes(a.lane));
  add('quad-in-4', [0, 1, 2, 3].includes(a.quad));
  add('yin-yang-enum', KINDS.includes(a.yin_yang));
  const t = mintTriad({ name: 'LAW-STUB-AND-RUN' });
  add('triad-shares-base', t.AGT.hex.slice(0, 4) === t.SUP.hex.slice(0, 4) && t.SUP.hex.slice(0, 4) === t.PROF.hex.slice(0, 4));
  add('triad-role-suffixes', t.AGT.hex.endsWith('C') && t.SUP.hex.endsWith('A') && t.PROF.hex.endsWith('B'));
  add('rows-hbp-only', emitRegistrationRows(a).every((r) => r.endsWith('|json=0') && !r.includes('\n')));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  const t = mintTriad({ name: process.argv[2] || 'LAW-STUB-AND-RUN', tier: 0, kind: 'logical' });
  for (const role of ['AGT', 'SUP', 'PROF']) for (const row of emitRegistrationRows(t[role])) console.log(row);
}
