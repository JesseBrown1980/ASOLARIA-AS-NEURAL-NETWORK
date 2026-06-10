#!/usr/bin/env node
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROUTER_ID = 'supervisor-collision-router.v1';

export const ROUTER_SURFACES = Object.freeze({
  logical: {
    id: 'logical-overlay-router',
    target: 'worker-council-dispatch-plan',
    route: '/api/constructions/atlas/system/council/dispatch-plan',
    action: 'preserve-logical-overlap',
  },
  real: {
    id: 'real-runtime-address-router',
    target: 'omniflywheel-port-port',
    route: '/api/omniflywheel',
    action: 'require-free-real-address',
  },
  translate: {
    id: 'fabric-surface-translator',
    target: 'omnidirectional-translator-router',
    route: 'tools/behcs/omnidirectional-translator-router.mjs',
    action: 'translate-surface-before-dispatch',
  },
});

const REAL_TOKENS = Object.freeze([
  'real_agent',
  'real-agent',
  'realagent',
  'runtime',
  'physical',
  'process',
  'process_backed',
  'daemon',
  'free_agent',
  'free-agent',
  'shelless',
  'worker',
  'pid_runtime',
  'runtime_pid',
  'port.port',
  'omniflywheel',
  'revolver',
]);

const LOGICAL_TOKENS = Object.freeze([
  'logical_agent',
  'logical-agent',
  'logical',
  'sector-agent',
  'sector_agent',
  'reasoning',
  'judgment',
  'scout',
  'review',
  'supervisor',
  'prof',
  'professor',
  'council',
  'test_report',
  'test-report',
  'bh_overlay',
  'overlay',
  'cube',
  'atlas',
  'projection',
  'resonance',
  'recurrence',
  'route_overlay',
  'logical_18',
]);

const SURFACE_TOKENS = Object.freeze([
  'hbp',
  'hbi',
  'mcp',
  'webmcp',
  'cube',
  'whiteroom',
  'shannon',
  'frozen_slice',
  'geospatial_agent',
  'hrm_agent',
]);

function cleanValue(value) {
  return String(value ?? '')
    .replace(/[|\r\n]/g, '_')
    .trim();
}

function lowerValue(value) {
  return cleanValue(value).toLowerCase();
}

function truthy(value) {
  return ['1', 'true', 'yes', 'y', 'ok'].includes(lowerValue(value));
}

const SENTINELS = new Set(['', '0', 'none', 'null', 'false', 'undefined', 'na', 'n/a', '-']);

function presentValue(value) {
  return !SENTINELS.has(lowerValue(value));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function boundaryRe(tokens) {
  return new RegExp(`(?:^|[^a-z0-9])(?:${tokens.map(escapeRegExp).join('|')})(?:[^a-z0-9]|$)`);
}

function hasAnyToken(text, tokenRe) {
  return tokenRe.test(text);
}

const REAL_RE = boundaryRe(REAL_TOKENS);
const LOGICAL_RE = boundaryRe(LOGICAL_TOKENS);
const SURFACE_RE = boundaryRe(SURFACE_TOKENS);

export function parseHbpRow(row) {
  const parts = String(row || '').trim().split('|').filter(Boolean);
  const head = parts.shift() || 'EMPTY';
  const fields = {};
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) {
      fields[cleanValue(part)] = '1';
      continue;
    }
    const key = cleanValue(part.slice(0, idx));
    if (key) fields[key] = cleanValue(part.slice(idx + 1));
  }
  return { head: cleanValue(head), fields };
}

export function normalizeCollisionInput(input) {
  if (typeof input === 'string') return parseHbpRow(input);
  if (input && typeof input === 'object') {
    const { head = 'OBJECT', ...fields } = input;
    return { head: cleanValue(head), fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [cleanValue(k), cleanValue(v)])) };
  }
  return { head: 'EMPTY', fields: {} };
}

function explicitSystem(fields) {
  const explicit = [
    fields.agent_system,
    fields.system,
    fields.collision_system,
    fields.collision_class,
    fields.agent_classification,
    fields.two_systems,
  ].map(lowerValue).join(' ');
  if (explicit.includes('logical')) return 'logical';
  if (explicit.includes('real') || explicit.includes('runtime') || explicit.includes('physical')) return 'real';
  return '';
}

function hasRuntimeBinding(fields) {
  return Boolean(
    presentValue(fields.os_pid) ||
    presentValue(fields.process_id) ||
    presentValue(fields.runtime_pid) ||
    presentValue(fields.port) ||
    presentValue(fields.flywheel_slot) ||
    presentValue(fields.port_port)
  );
}

function evidenceText(head, fields) {
  // Token inference is intentionally limited to classification-like fields.
  // Freeform identity/route/reason text can contain words like "omniflywheel"
  // in logical supervisor names; those must not imply a real runtime collision.
  return [
    head,
    fields.kind,
    fields.type,
    fields.layer,
    fields.class,
    fields.role,
    fields.scope,
    fields.agent_kind,
    fields.agent_type,
    fields.collision,
  ].map(lowerValue).join(' ');
}

export function classifyCollision(input) {
  const { head, fields } = normalizeCollisionInput(input);
  if (head !== 'COLLISION' && head !== 'OBJECT') {
    return {
      ok: false,
      head,
      fields,
      classification: 'UNCLASSIFIED',
      state: 'HELD_NON_COLLISION_HEAD',
      confidence: 'none',
      reason: `non-collision-head:${head}`,
    };
  }

  if (hasRuntimeBinding(fields)) {
    return {
      ok: true,
      head,
      fields,
      classification: 'REAL_AGENT',
      state: 'REAL_AGENT_NO_COLLISION_REQUIRED',
      confidence: 'explicit',
      reason: 'runtime-bound-os-pid-port-or-flywheel',
    };
  }

  const explicit = explicitSystem(fields);
  if (explicit === 'logical') {
    return {
      ok: true,
      head,
      fields,
      classification: 'LOGICAL_AGENT',
      state: 'LOGICAL_AGENT_COLLISION_ALLOWED',
      confidence: 'explicit',
      reason: 'explicit-logical-system-field',
    };
  }
  if (explicit === 'real') {
    return {
      ok: true,
      head,
      fields,
      classification: 'REAL_AGENT',
      state: 'REAL_AGENT_NO_COLLISION_REQUIRED',
      confidence: 'explicit',
      reason: 'explicit-real-system-field',
    };
  }

  const text = evidenceText(head, fields);
  const hasReal = hasAnyToken(text, REAL_RE);
  const hasLogical = hasAnyToken(text, LOGICAL_RE);

  if (hasReal && hasLogical) {
    return {
      ok: false,
      head,
      fields,
      classification: 'MIXED_OR_AMBIGUOUS',
      state: 'SPLIT_REAL_AND_LOGICAL_BEFORE_ROUTING',
      confidence: 'mixed',
      reason: 'real-and-logical-markers-both-present',
    };
  }
  if (hasLogical) {
    return {
      ok: true,
      head,
      fields,
      classification: 'LOGICAL_AGENT',
      state: 'LOGICAL_AGENT_COLLISION_ALLOWED',
      confidence: 'inferred',
      reason: 'logical-marker-present',
    };
  }
  if (hasReal) {
    return {
      ok: true,
      head,
      fields,
      classification: 'REAL_AGENT',
      state: 'REAL_AGENT_NO_COLLISION_REQUIRED',
      confidence: 'inferred',
      reason: 'real-runtime-marker-present',
    };
  }
  return {
    ok: false,
    head,
    fields,
    classification: 'UNCLASSIFIED',
    state: 'HELD_FOR_FILE_LEVEL_REVIEW',
    confidence: 'none',
    reason: 'no-real-or-logical-marker',
  };
}

function hasSurfaceBridge(fields) {
  const text = [fields.from, fields.to, fields.surface, fields.target_surface, fields.required, fields.action].map(lowerValue).join(' ');
  return hasAnyToken(text, SURFACE_RE);
}

function freeRealAddress(fields) {
  return fields.free_real_address || fields.free_hilbert || fields.next_free_hilbert || fields.target_free_range || fields.free_range || '';
}

export function planCollisionRoute(input) {
  const c = classifyCollision(input);
  const gates = ['no-mint', 'no-launch', 'no-usb-write', 'no-engine-edit'];
  const translate = hasSurfaceBridge(c.fields);
  const base = {
    ok: c.ok,
    router: ROUTER_ID,
    classification: c.classification,
    classification_state: c.state,
    confidence: c.confidence,
    reason: c.reason,
    source_head: c.head,
    mutates: false,
    executable: false,
    translator_route: translate ? ROUTER_SURFACES.translate.route : 'none',
    gates,
  };

  if (c.classification === 'LOGICAL_AGENT') {
    return {
      ...base,
      ok: true,
      action: 'PRESERVE_LOGICAL_COLLISION',
      state: 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR',
      target_router: ROUTER_SURFACES.logical.id,
      target_route: ROUTER_SURFACES.logical.route,
      required: 'keep-scope-qualified-overlap-and-route-through-council-worker-plan',
    };
  }

  if (c.classification === 'REAL_AGENT') {
    const free = freeRealAddress(c.fields);
    if (free || truthy(c.fields.real_address_free)) {
      return {
        ...base,
        ok: true,
        action: 'PLAN_UNIQUE_REAL_ADDRESS',
        state: 'REAL_COLLISION_REROUTE_READY_DRAFT',
        target_router: ROUTER_SURFACES.real.id,
        target_route: ROUTER_SURFACES.real.route,
        required: free ? `use-free-real-address:${cleanValue(free)}` : 'use-attested-free-real-address',
        gates: [...gates, 'operator-pair-cosign-before-real-mint-or-launch'],
      };
    }
    return {
      ...base,
      ok: false,
      action: 'BLOCK_REAL_COLLISION',
      state: 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS',
      target_router: ROUTER_SURFACES.real.id,
      target_route: ROUTER_SURFACES.real.route,
      required: 'attest-free-real-address-before-runtime-mint-or-launch',
      gates: [...gates, 'operator-pair-cosign-before-real-mint-or-launch'],
    };
  }

  if (c.classification === 'MIXED_OR_AMBIGUOUS') {
    return {
      ...base,
      action: 'SPLIT_COLLISION_ROW',
      state: 'MIXED_COLLISION_HELD_SPLIT_REQUIRED',
      target_router: 'none',
      target_route: 'none',
      required: 'emit-separate-logical-and-real-HBP-rows-before-routing',
    };
  }

  return {
    ...base,
    action: 'HOLD_FOR_REVIEW',
    state: 'UNCLASSIFIED_COLLISION_HELD',
    target_router: 'file-level-review',
    target_route: 'none',
    required: 'add-agent_system-real-or-logical-or-review-source-diff',
  };
}

export function hbpRow(head, fields = {}) {
  const parts = [head];
  for (const [key, value] of Object.entries(fields)) {
    if (Array.isArray(value)) {
      parts.push(`${cleanValue(key)}=${value.map(cleanValue).join('+')}`);
    } else {
      parts.push(`${cleanValue(key)}=${cleanValue(value)}`);
    }
  }
  if (!Object.hasOwn(fields, 'json')) parts.push('json=0');
  return parts.join('|');
}

export function planToHbpRows(plan) {
  return [
    hbpRow('SUPCOLLIDEHDR', {
      ok: plan.ok ? 1 : 0,
      router: plan.router,
      classification: plan.classification,
      state: plan.state,
      mutates: plan.mutates ? 1 : 0,
      executable: plan.executable ? 1 : 0,
    }),
    hbpRow('SUPCOLLIDEROUTE', {
      action: plan.action,
      target_router: plan.target_router,
      target_route: plan.target_route,
      translator_route: plan.translator_route,
      required: plan.required,
    }),
    hbpRow('SUPCOLLIDEGATES', {
      gates: plan.gates,
      classification_state: plan.classification_state,
      reason: plan.reason,
    }),
  ];
}

export function statusRows() {
  return [
    hbpRow('SUPCOLLIDEROUTER', {
      ok: 1,
      router: ROUTER_ID,
      rule: 'collision-is-only-error-after-classification',
      logical: ROUTER_SURFACES.logical.id,
      real: ROUTER_SURFACES.real.id,
      translator: ROUTER_SURFACES.translate.id,
      state: 'READY_DRAFT_NO_EXECUTION',
    }),
    hbpRow('SUPCOLLIDEDOCTRINE', {
      real: 'collisions-block-runtime-mint-or-launch-until-free-address',
      logical: 'collisions-preserved-when-scope-qualified',
      mixed: 'split-before-routing',
      state: 'TWO_SYSTEMS_APPLIED',
    }),
  ];
}

export function selfTest() {
  const checks = [];
  const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

  const logical = planCollisionRoute('COLLISION|agent_system=logical|role=sector-agent|collision_with=operator_GAC|json=0');
  add('logical-preserved', logical.ok && logical.state === 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR');

  const nonCollisionHead = planCollisionRoute('STATUS|agent_system=logical|role=sector-agent|json=0');
  add('non-collision-head-held',
    !nonCollisionHead.ok &&
    nonCollisionHead.classification === 'UNCLASSIFIED' &&
    nonCollisionHead.classification_state === 'HELD_NON_COLLISION_HEAD');

  const realBlocked = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|occupied=1|json=0');
  add('real-blocked-without-free-address', !realBlocked.ok && realBlocked.state === 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');

  const runtimeBound = planCollisionRoute('COLLISION|agent_system=logical|role=supervisor|port=4957|json=0');
  add('runtime-bound-overrides-logical-label',
    !runtimeBound.ok &&
    runtimeBound.classification === 'REAL_AGENT' &&
    runtimeBound.reason === 'runtime-bound-os-pid-port-or-flywheel');

  const sentinelRuntime = planCollisionRoute('COLLISION|agent_system=logical|role=supervisor|port=none|json=0');
  add('sentinel-runtime-value-ignored',
    sentinelRuntime.ok &&
    sentinelRuntime.classification === 'LOGICAL_AGENT' &&
    sentinelRuntime.state === 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR');

  const realReady = planCollisionRoute('COLLISION|agent_system=real|kind=free_agent|free_hilbert=1604-1621|json=0');
  add('real-reroute-ready-with-free-address', realReady.ok && realReady.state === 'REAL_COLLISION_REROUTE_READY_DRAFT');

  const substring = planCollisionRoute('COLLISION|role=fireworker|json=0');
  add('boundary-token-match-no-substring',
    !substring.ok &&
    substring.classification === 'UNCLASSIFIED' &&
    substring.target_router === 'file-level-review');

  const freeformName = planCollisionRoute('COLLISION|agent=sup-dan_omniflywheel_router|json=0');
  add('freeform-identity-token-ignored',
    !freeformName.ok &&
    freeformName.classification === 'UNCLASSIFIED' &&
    freeformName.target_router === 'file-level-review');

  const dedicatedRole = planCollisionRoute('COLLISION|role=omniflywheel|json=0');
  add('dedicated-role-token-still-infers-real',
    !dedicatedRole.ok &&
    dedicatedRole.classification === 'REAL_AGENT' &&
    dedicatedRole.state === 'REAL_COLLISION_BLOCKED_NEEDS_FREE_ADDRESS');

  const canonicalLogicalRoles = ['supervisor', 'prof', 'professor', 'council'].map((role) =>
    planCollisionRoute(`COLLISION|role=${role}|json=0`));
  add('canonical-logical-vocab-delta',
    canonicalLogicalRoles.every((plan) =>
      plan.ok &&
      plan.classification === 'LOGICAL_AGENT' &&
      plan.state === 'LOGICAL_COLLISION_PRESERVED_ROUTE_TO_SUPERVISOR'));

  const removedWriteToken = planCollisionRoute('COLLISION|role=write|json=0');
  add('write-token-no-longer-logical',
    !removedWriteToken.ok &&
    removedWriteToken.classification === 'UNCLASSIFIED' &&
    removedWriteToken.target_router === 'file-level-review');

  const mixed = planCollisionRoute('COLLISION|kind=free_agent|role=logical_18|json=0');
  add('mixed-held-for-split', !mixed.ok && mixed.state === 'MIXED_COLLISION_HELD_SPLIT_REQUIRED');

  const rows = planToHbpRows(logical);
  add('hbp-rows-no-json-object', rows.every((row) => row.includes('json=0') && !row.includes('{"')));

  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isMain) {
  const cmd = process.argv[2] || '--status';
  if (cmd === '--status') {
    console.log(statusRows().join('\n'));
  } else if (cmd === '--self-test') {
    const result = selfTest();
    for (const c of result.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}${c.detail ? ' ' + c.detail : ''}`);
    process.exit(result.ok ? 0 : 1);
  } else if (cmd === '--classify') {
    const row = process.argv.slice(3).join(' ');
    console.log(planToHbpRows(planCollisionRoute(row)).join('\n'));
  } else {
    console.error('usage: supervisor-collision-router.mjs --status | --self-test | --classify <HBP-row>');
    process.exit(1);
  }
}
