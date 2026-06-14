#!/usr/bin/env node
// eight-byte-host-process-upgrade.mjs - v8 real graph math for host-process migration.
//
// Descriptor-only. This records the upgrade path from node-per-agent runtimes to
// 8-byte host handles as the cheap conductor. It does not remove Node globally,
// call providers, start daemons, write USBs, launch phones, or claim free compute.

import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { classifyAgentType, mintPid } from './github-pid-register.mjs';
import { classifyBhIndex } from './token-cube-catalog-binder.mjs';
import { zetaTransition } from './zeta-quant.mjs';

export const HOST_UPGRADE_ID = 'eight-byte-host-process-upgrade.v1';
export const HOST_HANDLE_BYTES = 8;
export const BH_SECTORS = 113;
export const BH_LANES = 3;
export const BH_GLYPHS = 1024;
export const BH_INDEX_MAX = (BH_SECTORS - 1) * BH_LANES * BH_GLYPHS + (BH_LANES - 1) * BH_GLYPHS + (BH_GLYPHS - 1);

export const RULE_OF_THREE_WATCHERS = Object.freeze(['hookwall', 'gnn', 'shannon']);
export const SYSTEM_TYPES = Object.freeze(['LOGICAL-WAVE', 'FROZEN-BRAIN', 'REAL-FREE']);

export const NODE_REPLACEMENT_POLICY = Object.freeze([
  Object.freeze({
    id: 'runtime-agent-conductor',
    status: 'TARGET_REPLACE_NODE_PER_AGENT',
    rule: 'use-8-byte-host-handle-plus-file-backed-room-where-proven',
  }),
  Object.freeze({
    id: 'repo-verifier',
    status: 'NODE_ALLOWED',
    rule: 'node-tests-and-self-tests-are-measuring-tools-not-runtime-agents',
  }),
  Object.freeze({
    id: 'static-ui-server',
    status: 'NODE_ALLOWED_UNTIL_SH_OR_FILE_BACKED_REPLACEMENT_PROVEN',
    rule: 'do-not-remove-working-node-surface-before-equivalent-host-process-proof',
  }),
  Object.freeze({
    id: 'provider-adapter',
    status: 'GATED',
    rule: 'provider-terms-auth-quota-and-billing-still-apply',
  }),
]);

export const ROUTE_TYPES = Object.freeze([
  Object.freeze({ id: 'device-to-hardware', lane: 'device', gate: 'owner-path-policy-and-driver-proof' }),
  Object.freeze({ id: 'agent-to-agent', lane: 'triad', gate: 'supervisor-sees-real-self-fabric' }),
  Object.freeze({ id: 'agent-to-device', lane: 'hardware', gate: 'operator-cosign-before-device-effect' }),
  Object.freeze({ id: 'agent-to-human', lane: 'human', gate: 'present-proposal-not-authority' }),
  Object.freeze({ id: 'human-to-agent', lane: 'operator', gate: 'operator-intent-envelope-required' }),
  Object.freeze({ id: 'provider-router', lane: 'external-compute', gate: 'auth-terms-quota-billing-apply' }),
]);

const DEFAULT_HOSTS = Object.freeze([
  Object.freeze({ name: 'logical-mcp-agent', kind: 'logical', prime: 0 }),
  Object.freeze({ name: 'frozen-brain-agent', kind: 'real', prime: 0 }),
  Object.freeze({ name: 'opencode-real-free-agent', kind: 'real', prime: 1 }),
]);

const sha16 = (text) => createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
const isObj = (x) => x !== null && typeof x === 'object';
const safe = (x) => String(x ?? '').replace(/[|\r\n]/g, '_').replace(/[^A-Za-z0-9._:/+@=()-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
const prop = (obj, key, fallback = '') => {
  try { return isObj(obj) ? obj[key] : fallback; } catch { return fallback; }
};

const FREE_COMPUTE_RE = /\b(free|bypass|unlimited|no-cost|gratis|zero-cost|zero-token|tokens?|credits?|billing|quota)\b/;
const PROVIDER_RE = /\b(provider|openai|anthropic|claude|google|gemini|supercomputer|api|llm|gpt|model|compute)\b/;

function distanceBucket(distance) {
  if (distance === 0) return 'collision0';
  if (distance <= 4096) return 'near4096';
  if (distance <= 32768) return 'local32768';
  if (distance <= 131072) return 'regional131072';
  return 'far';
}

export function classifyPrimeExponent(exponent) {
  const n = Number.parseInt(String(exponent), 10);
  if (!Number.isFinite(n) || n < 1) return Object.freeze({ exponent: 'none', tier: 'none', materialized: false, status: 'INVALID' });
  if (n === 1) return Object.freeze({ exponent: 1, tier: 'prime', materialized: true, status: 'REAL_DISTINCT' });
  if (n === 2) return Object.freeze({ exponent: 2, tier: 'p2', materialized: true, status: 'REAL_DISTINCT' });
  if (n === 3) return Object.freeze({ exponent: 3, tier: 'p3', materialized: true, status: 'REAL_DISTINCT' });
  return Object.freeze({
    exponent: n,
    tier: 'pk',
    materialized: false,
    status: 'PROPOSAL_FOLDED_TO_PK',
  });
}

export function normalizeRoute(input = {}) {
  try {
    const id = safe(prop(input, 'id', 'unknown-route'));
    const lane = safe(prop(input, 'lane', 'unknown'));
    const gate = safe(prop(input, 'gate', 'define-gate-before-use'));
    return Object.freeze({
      id,
      lane,
      gate,
      route_sha16: sha16([id, lane, gate].join('|')),
      process_launch: 0,
      remote_call: lane === 'external-compute' ? 1 : 0,
      provider_bypass: 0,
    });
  } catch {
    return Object.freeze({
      id: 'invalid',
      lane: 'invalid',
      gate: 'normalize-threw-held',
      route_sha16: sha16('invalid'),
      process_launch: 0,
      remote_call: 0,
      provider_bypass: 0,
    });
  }
}

export function deriveHostAddress(input = {}) {
  try {
    const name = safe(prop(input, 'name', 'host-agent'));
    const kindRaw = safe(prop(input, 'kind', 'logical')).toLowerCase();
    const kind = kindRaw === 'real' ? 'real' : 'logical';
    const prime = Number.parseInt(safe(prop(input, 'prime', 0)), 10);
    const role = safe(prop(input, 'role', 'AGT')).toUpperCase();
    const pid = mintPid({
      role: role === 'SUP' || role === 'PROF' ? role : 'AGT',
      name,
      tier: Number.parseInt(safe(prop(input, 'tier', 4)), 10),
      kind,
      prime: Number.isFinite(prime) ? prime : 0,
      nest: Number.parseInt(safe(prop(input, 'nest', 1)), 10),
    });
    const bh_index = pid.sector * BH_LANES * BH_GLYPHS + pid.lane * BH_GLYPHS + pid.glyph_1024;
    const bh = classifyBhIndex(bh_index);
    return Object.freeze({
      name: pid.name,
      pid: pid.pid,
      sha16: pid.sha16,
      kind: pid.yin_yang,
      yin_yang_bit: pid.yin_yang_bit,
      yin_yang_shape: pid.yin_yang_bit === 0 ? 'circle-logical' : 'square-real',
      prime: Number.parseInt(pid.prime, 10),
      agent_type: classifyAgentType({ yin_yang: pid.yin_yang, prime: pid.prime }),
      sector: pid.sector,
      lane: pid.lane,
      glyph: pid.glyph_1024,
      watcher: RULE_OF_THREE_WATCHERS[pid.lane],
      bh_index,
      cylinder_phase: bh_index % 6,
      cylinder_ring: Math.floor(bh_index / 6),
      ppow: bh.ppow,
      host_handle_bytes: HOST_HANDLE_BYTES,
      node_per_agent: 0,
      process_launch: 0,
      remote_call: 0,
    });
  } catch {
    return Object.freeze({
      name: 'invalid',
      pid: 'invalid',
      sha16: sha16('invalid'),
      kind: 'logical',
      yin_yang_bit: 0,
      yin_yang_shape: 'circle-logical',
      prime: 0,
      agent_type: 'LOGICAL-WAVE',
      sector: 0,
      lane: 0,
      glyph: 0,
      watcher: RULE_OF_THREE_WATCHERS[0],
      bh_index: 0,
      cylinder_phase: 0,
      cylinder_ring: 0,
      ppow: 'unit',
      host_handle_bytes: HOST_HANDLE_BYTES,
      node_per_agent: 0,
      process_launch: 0,
      remote_call: 0,
    });
  }
}

export function distanceBetween(a, b) {
  const left = Number.isInteger(a?.bh_index) ? a : deriveHostAddress(a);
  const right = Number.isInteger(b?.bh_index) ? b : deriveHostAddress(b);
  const distance = Math.abs(left.bh_index - right.bh_index);
  return Object.freeze({
    a: left.sha16,
    b: right.sha16,
    delta_bh_index: distance,
    bucket: distanceBucket(distance),
    metric: 'abs-delta-bh-index-not-euclidean-3d',
  });
}

export function mod6Integrity(a = 11, b = 13, opts = {}) {
  const out = zetaTransition(a, b, opts);
  return Object.freeze({
    a,
    b,
    gap: out.gap,
    gap_mod6: out.gap_mod6,
    forced_transition: out.forced_transition,
    verdict: out.verdict,
    scope: 'necessary-not-sufficient',
  });
}

export function classifyUpgradeClaim(input = {}) {
  const claim = safe(isObj(input) ? prop(input, 'claim', '') : input).toLowerCase();
  if (FREE_COMPUTE_RE.test(claim) && PROVIDER_RE.test(claim)) return 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM';
  if (/(replace|remove).*all.*node|all.*node.*(replace|remove)|node.*on.*planet/.test(claim)) return 'MIGRATION_PLAN_NOT_COMPLETED_CLAIM';
  if (/200.*nano|200ns|nano.*second/.test(claim)) return 'CADENCE_CLAIM_REQUIRES_BENCHMARK';
  if (/\bp[579]\b|prime-?(5|7|9)|prime.*(5|7|9)/.test(claim)) return 'PRIME_EXPONENT_FOLDS_TO_PK_PROPOSAL';
  if (/8.*byte|host.*process/.test(claim)) return 'HOST_PROCESS_CONDUCTOR_DESCRIPTOR';
  return 'HOST_UPGRADE_DESCRIPTOR_REVIEW';
}

export function buildUpgrade(input = DEFAULT_HOSTS) {
  const hosts = (Array.isArray(input) ? input : DEFAULT_HOSTS).map(deriveHostAddress);
  const routes = ROUTE_TYPES.map(normalizeRoute);
  return Object.freeze({
    tool: HOST_UPGRADE_ID,
    host_handle_bytes: HOST_HANDLE_BYTES,
    bh_index_max: BH_INDEX_MAX,
    rule_of_three_watchers: RULE_OF_THREE_WATCHERS,
    policy: NODE_REPLACEMENT_POLICY,
    routes,
    hosts,
    prime_exponents: Object.freeze([1, 2, 3, 5, 7, 9].map(classifyPrimeExponent)),
    integrity: mod6Integrity(11, 13, { claimedLaneA: 2, claimedLaneB: 1 }),
    summary: Object.freeze({
      hosts: hosts.length,
      systems: new Set(hosts.map((h) => h.agent_type)).size,
      node_per_agent: 0,
      provider_compute_replaced: false,
      p5_materialized: false,
      live_launch: false,
    }),
  });
}

export function emitRows(input = DEFAULT_HOSTS, opts = {}) {
  try {
    const built = buildUpgrade(input);
    const rows = [
      `HOSTUPGRADEHDR|tool=${HOST_UPGRADE_ID}|purpose=v8-real-8-byte-host-process-upgrade-with-bh-index-cylinders|host_handle_bytes=${HOST_HANDLE_BYTES}|hosts=${built.summary.hosts}|systems=${built.summary.systems}|node_per_agent=0|provider_compute_replaced=0|live_launch=0|json=0`,
      `HOSTUPGRADEMATH|formula=bh_index-sector*3072+lane*1024+glyph|sectors=${BH_SECTORS}|lanes=${BH_LANES}|glyphs=${BH_GLYPHS}|bh_index_max=${BH_INDEX_MAX}|cylinder=phase-bh_index-mod6+ring-floor-bh_index-div6|distance=abs-delta-bh_index|json=0`,
      `HOSTUPGRADELANES|rule_of_three=${RULE_OF_THREE_WATCHERS.join('+')}|systems=${SYSTEM_TYPES.join('+')}|yin_yang=logical-circle+real-square|json=0`,
    ];
    for (const p of built.policy) rows.push(`HOSTUPGRADEPOLICY|id=${p.id}|status=${p.status}|rule=${p.rule}|json=0`);
    for (const h of built.hosts) {
      rows.push(`HOSTUPGRADEHOST|name=${h.name}|agent_type=${h.agent_type}|pid_sha16=${h.sha16}|sector=${h.sector}|lane=${h.lane}|glyph=${h.glyph}|bh_index=${h.bh_index}|phase=${h.cylinder_phase}|ring=${h.cylinder_ring}|ppow=${h.ppow}|watcher=${h.watcher}|shape=${h.yin_yang_shape}|host_handle_bytes=${h.host_handle_bytes}|node_per_agent=0|process_launch=0|remote_call=0|json=0`);
    }
    for (let i = 0; i + 1 < built.hosts.length; i += 1) {
      const d = distanceBetween(built.hosts[i], built.hosts[i + 1]);
      rows.push(`HOSTUPGRADEDIST|a=${d.a}|b=${d.b}|delta_bh_index=${d.delta_bh_index}|bucket=${d.bucket}|metric=${d.metric}|json=0`);
    }
    for (const p of built.prime_exponents) rows.push(`HOSTUPGRADEPRIME|exponent=${p.exponent}|tier=${p.tier}|materialized=${p.materialized ? 1 : 0}|status=${p.status}|json=0`);
    for (const r of built.routes) rows.push(`HOSTUPGRADEROUTE|id=${r.id}|lane=${r.lane}|gate=${r.gate}|route_sha16=${r.route_sha16}|process_launch=${r.process_launch}|remote_call=${r.remote_call}|provider_bypass=${r.provider_bypass}|json=0`);
    rows.push(`HOSTUPGRADEINTEGRITY|mod6_probe=11-to-13|gap=${built.integrity.gap}|gap_mod6=${built.integrity.gap_mod6}|verdict=${built.integrity.verdict}|scope=${built.integrity.scope}|json=0`);
    const claim = prop(opts, 'claim', '');
    if (claim) rows.push(`HOSTUPGRADECLAIM|claim_sha16=${sha16(claim)}|classification=${classifyUpgradeClaim({ claim })}|raw_claim_inlined=0|json=0`);
    rows.push('HOSTUPGRADEGATE|rule=8-byte-host-process-replaces-node-per-agent-only-where-proven-provider-compute-and-device-effects-remain-gated|provider_terms_apply=1|billing_bypass=0|process_launch=0|usb_write=0|radio_bypass=0|json=0');
    return rows;
  } catch {
    return [
      `HOSTUPGRADEHDR|tool=${HOST_UPGRADE_ID}|purpose=v8-real-8-byte-host-process-upgrade-with-bh-index-cylinders|host_handle_bytes=${HOST_HANDLE_BYTES}|hosts=0|node_per_agent=0|provider_compute_replaced=0|live_launch=0|json=0`,
      'HOSTUPGRADEGATE|rule=emit-threw-held-invalid|provider_terms_apply=1|billing_bypass=0|process_launch=0|usb_write=0|radio_bypass=0|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const built = buildUpgrade();
  add('host-handle-eight-bytes', built.host_handle_bytes === 8 && built.summary.node_per_agent === 0);
  add('three-systems-present', SYSTEM_TYPES.every((type) => built.hosts.some((h) => h.agent_type === type)));
  add('bh-index-real-formula-range', built.hosts.every((h) => h.bh_index === h.sector * 3072 + h.lane * 1024 + h.glyph && h.bh_index >= 0 && h.bh_index <= BH_INDEX_MAX));
  add('cylinder-fold-real', built.hosts.every((h) => h.cylinder_phase === h.bh_index % 6 && h.cylinder_ring === Math.floor(h.bh_index / 6)));
  add('prime-exponents-honest', classifyPrimeExponent(3).status === 'REAL_DISTINCT' && classifyPrimeExponent(5).status === 'PROPOSAL_FOLDED_TO_PK' && classifyPrimeExponent(7).tier === 'pk');
  add('distance-is-abs-bh-index', distanceBetween({ bh_index: 10, sha16: 'aaaaaaaaaaaaaaaa' }, { bh_index: 4110, sha16: 'bbbbbbbbbbbbbbbb' }).bucket === 'local32768');
  add('mod6-integrity-probe-green', built.integrity.verdict === 'FORCED_CONSISTENT' && mod6Integrity(11, 13, { claimedLaneB: 2 }).verdict === 'FORCING_VIOLATION');
  add('node-policy-honest-boundary', built.policy.some((p) => p.id === 'runtime-agent-conductor' && p.status === 'TARGET_REPLACE_NODE_PER_AGENT') && built.policy.some((p) => p.id === 'repo-verifier' && p.status === 'NODE_ALLOWED'));
  add('claim-router-rejects-free-provider-first', classifyUpgradeClaim({ claim: '8 byte host gets gratis Claude tokens' }) === 'REJECT_FREE_EXTERNAL_COMPUTE_CLAIM');
  add('claim-router-rejects-global-node-overclaim', classifyUpgradeClaim({ claim: 'replace all node on the planet now' }) === 'MIGRATION_PLAN_NOT_COMPLETED_CLAIM');
  add('claim-router-labels-p5-proposal', classifyUpgradeClaim({ claim: 'p5 prime cylinder is live materialized' }) === 'PRIME_EXPONENT_FOLDS_TO_PK_PROPOSAL');
  add('routes-held', built.routes.every((r) => r.process_launch === 0 && r.provider_bypass === 0) && built.routes.some((r) => r.id === 'provider-router' && r.remote_call === 1));
  add('rows-hbp-only', emitRows([{ name: 'bad|name', kind: 'logical' }], { claim: 'bad|claim\nHOSTUPGRADEGATE|process_launch=1' }).every((row) => row.endsWith('|json=0') && !/[\r\n]/.test(row)));
  add('total-never-throws', (() => { try { deriveHostAddress({ get name() { throw new Error('boom'); } }); buildUpgrade(null); emitRows(null); classifyUpgradeClaim(null); normalizeRoute(null); return true; } catch { return false; } })());
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitRows(DEFAULT_HOSTS, { claim: process.argv.slice(2).join(' ') })) console.log(row);
}
