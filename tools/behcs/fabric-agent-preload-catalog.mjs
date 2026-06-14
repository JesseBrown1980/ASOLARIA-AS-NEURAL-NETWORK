import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const CATALOG_ID = 'fabric-agent-preload-catalog.v1';

export const LAWS = Object.freeze([
  'three-systems-LOGICAL-WAVE-FROZEN-BRAIN-REAL-FREE',
  'law-of-three-mod3-lanes',
  'yin-yang-mod2-real-logical',
  'prime-parity-and-prime-mod3-are-load-bearing',
  'quants-are-address-and-evidence-classes-not-raw-material',
  'all-agent-artifact-system-addresses-get-PID-or-handle',
  '8-byte-host-process-replaces-node-per-agent-only-where-proven',
  'slice-engine-law-fabric-is-frozen-position-space-until-spawner-pid-emits',
  'live-control-and-mint-and-launch-defer-to-operator',
]);

export const ROUTES = Object.freeze([
  Object.freeze({
    id: 'bus-health',
    endpoint: 'http://127.0.0.1:4947/behcs/health',
    method: 'GET',
    payload: 'none',
    verdict: 'READ_READY',
    use: 'preflight-local-bus',
  }),
  Object.freeze({
    id: 'send-hbp',
    endpoint: 'http://127.0.0.1:4947/behcs/send-hbp',
    method: 'POST',
    payload: 'single-HBP-pipe-row-ending-json0',
    verdict: 'HBP_ROW_READY',
    use: 'hot-path-single-row',
  }),
  Object.freeze({
    id: 'send-json',
    endpoint: 'http://127.0.0.1:4947/behcs/send',
    method: 'POST',
    payload: 'JSON-envelope-may-carry-exact-operator-packet-lines',
    verdict: 'ENVELOPE_READY',
    use: 'packet-burst-and-legacy-envelope',
  }),
  Object.freeze({
    id: 'supervisors-hbp',
    endpoint: 'mcp-asolaria-fabric-supervisors-hbp',
    method: 'GET',
    payload: 'HBP-feed',
    verdict: 'READ_READY',
    use: 'roster-and-tier-preload',
  }),
  Object.freeze({
    id: 'bus-health-mcp',
    endpoint: 'mcp-asolaria-fabric-bus-health',
    method: 'GET',
    payload: 'HBP-tuple-feed',
    verdict: 'READ_READY',
    use: 'cross-vantage-bus-status-NOTE-proxies-through-4949-may-fetch-fail',
  }),
  // acer-local attack-verify of the liris catalog: the :4949 super-os / MCP proxy base is in a
  // watchdog respawn-flap. The two MCP routes above proxy through it and fetch-fail when it flaps.
  Object.freeze({
    id: 'super-os-4949',
    endpoint: 'http://127.0.0.1:4949',
    method: 'GET',
    payload: 'none',
    verdict: 'RESPAWN_FLAP_DO_NOT_TRUST',
    use: 'acer-local-super-os-and-mcp-proxy-base-in-watchdog-respawn-flap-the-mcp-routes-proxy-through-this-and-may-fetch-fail',
  }),
]);

export const TOOLS = Object.freeze([
  Object.freeze({
    id: 'pixel-room-handle',
    path: 'tools/behcs/pixel-room-handle.mjs',
    provides: '8-byte-room-handle+identity16+PIXFOLDERHOST',
    gate: 'process_launch-0-live_control-gated',
  }),
  Object.freeze({
    id: 'github-pid-register',
    path: 'tools/behcs/github-pid-register.mjs',
    provides: 'open-runtime-PID-register+0x1F-tuple-identity',
    gate: 'github-PID-proposed-until-live-reconciled',
  }),
  Object.freeze({
    id: 'github-live-pid-reconcile',
    path: 'tools/behcs/github-live-pid-reconcile.mjs',
    provides: 'github-vs-live-office-snapshot-status',
    gate: 'unknown-PENDING-OFFICE-SNAPSHOT',
  }),
  Object.freeze({
    id: 'github-live-office-reconcile-expansion',
    path: 'tools/behcs/github-live-office-reconcile-expansion.mjs',
    provides: 'github-vs-live-726-office-alias-map',
    gate: 'descriptor-only-no-mint-no-cutover',
  }),
  Object.freeze({
    id: 'catch-count-ledger',
    path: 'tools/behcs/catch-count-ledger.mjs',
    provides: 'enumerable-bilateral-catch-ledger-open-closed-owner-status',
    gate: 'md-final-release-claims-held-until-open-partial-catches-close',
  }),
  Object.freeze({
    id: 'mlc-engine-wiring-increment',
    path: 'tools/behcs/mlc-engine-wiring-increment.mjs',
    provides: 'C036-increment-1-MTP-HRM-GNN-Fischer-Mamba-AoT-descriptor-wiring-matrix',
    gate: 'descriptor-only-process_launch-0-live-engine-launch-defer-to-fabric-verdict',
  }),
  Object.freeze({
    id: 'frontend-parity-matrix',
    path: 'tools/behcs/frontend-parity-matrix.mjs',
    provides: 'root-front-end-M-T-P-C-Q-R-E-A-D-G-parity-matrix-before-cutover',
    gate: 'no-cutover-until-every-cell-green-and-operator-cosign',
  }),
  Object.freeze({
    id: 'model-selector-matrix',
    path: 'tools/behcs/model-selector-matrix.mjs',
    provides: 'front-end-M-cell-visible-model-role-selector-no-live-invocation',
    gate: 'descriptor-only-process_launch-0-live-model-invocation-0',
  }),
  Object.freeze({
    id: 'project-guide-matrix',
    path: 'tools/behcs/project-guide-matrix.mjs',
    provides: 'front-end-P-cell-project-guide-to-sealed-artifacts-no-workflow-execution',
    gate: 'descriptor-only-process_launch-0-no-cutover',
  }),
  Object.freeze({
    id: 'tool-skill-registry-matrix',
    path: 'tools/behcs/tool-skill-registry-matrix.mjs',
    provides: 'front-end-T-cell-tool-skill-registry-no-live-tool-execution',
    gate: 'descriptor-only-process_launch-0-live-tool-execution-0',
  }),
  Object.freeze({
    id: 'program-cube-ingestion-map',
    path: 'tools/behcs/program-cube-ingestion-map.mjs',
    provides: 'local-program-surface-to-cube-descriptor-map-before-any-update',
    gate: 'descriptor-only-process_launch-0-live_patch-0-blind_mutation-0',
  }),
  Object.freeze({
    id: 'agent-cost-layer-boundary',
    path: 'tools/behcs/agent-cost-layer-boundary.mjs',
    provides: '8-byte-host-handle-vs-message-payload-and-remote-compute-cost-boundary',
    gate: 'descriptor-only-process_launch-0-remote_call-0-free_compute_claim-0',
  }),
  Object.freeze({
    id: 'triad-host-router-gulp-pipeline',
    path: 'tools/behcs/triad-host-router-gulp-pipeline.mjs',
    provides: '8-byte-host-router-rule-of-three-gulp-gc-cube-feedback-descriptor',
    gate: 'descriptor-only-node_per_agent-0-process_launch-0-remote_call-0-provider_bypass-0',
  }),
  Object.freeze({
    id: 'pid-emitter-cost-envelope',
    path: 'tools/behcs/pid-emitter-cost-envelope.mjs',
    provides: 'city-phone-line-router-cost-envelope-for-8-byte-host-handles-and-cubes',
    gate: 'descriptor-only-physics_break-0-billing_bypass-0-provider_terms_apply-1',
  }),
  Object.freeze({
    id: 'cellphone-host-bridge-boundary',
    path: 'tools/behcs/cellphone-host-bridge-boundary.mjs',
    provides: 'cellphones-as-file-backed-8-byte-host-bridges-with-self-call-and-radio-gates',
    gate: 'descriptor-only-provider_bypass-0-radio_bypass-0-process_launch-0',
  }),
  Object.freeze({
    id: 'frozen-slice-city-signal-lifecycle',
    path: 'tools/behcs/frozen-slice-city-signal-lifecycle.mjs',
    provides: 'frozen-slice-city-room-emitter-cube-signal-lifecycle-with-200ns-benchmark-gate',
    gate: 'descriptor-only-measured_200ns-0-provider_bypass-0-cube_write-0-process_launch-0',
  }),
  Object.freeze({
    id: 'eight-byte-host-process-upgrade',
    path: 'tools/behcs/eight-byte-host-process-upgrade.mjs',
    provides: 'v8-real-bh-index-cylinder-prime-tier-host-process-upgrade-boundary',
    gate: 'descriptor-only-node_per_agent-0-provider_compute_replaced-0-process_launch-0-p5_materialized-0',
  }),
  Object.freeze({
    id: 'odysseus-mtp-control-surface',
    path: 'tools/behcs/odysseus-mtp-control-surface.mjs',
    provides: 'odysseus-pattern-MTP-descriptor-backed-control-surface-plus-v8-map3d-band',
    gate: 'descriptor-only-live_execution-0-cutover-0-phone_render_proven_here-0',
  }),
  Object.freeze({
    id: 'odysseus-scientific-3d-field',
    path: 'tools/behcs/odysseus-scientific-3d-field.mjs',
    provides: 'scientific-3d-PID-coordinate-field-with-real-BH-coordinates-and-cross-check-replay',
    gate: 'descriptor-only-process_launch-0-live_pid_telemetry-0-device_effect-0',
  }),
  Object.freeze({
    id: 'token-cube-catalog-binder',
    path: 'tools/behcs/token-cube-catalog-binder.mjs',
    provides: 'sha16-token-to-BH-address-draft-binding',
    gate: 'mint-write-live-DEFER_TO_OPERATOR',
  }),
]);

export const EMITTERS = Object.freeze([
  Object.freeze({
    id: 'pid-emitter',
    process: 'PID-specific-emitter-envelope',
    route: 'send-json',
    before: 'preload-catalog+law-ack+connection-label',
    after: 'hookwall+gnn+ack-log',
  }),
  Object.freeze({
    id: 'hookwall',
    process: 'risk-and-governance-gate',
    route: 'send-json',
    before: 'operator-gates+role-forbidden-list',
    after: 'allow-or-defer-row',
  }),
  Object.freeze({
    id: 'gnn-edge',
    process: 'real-time-edge-ingest',
    route: 'send-json',
    before: 'sha16-handles-not-full-context',
    after: 'eventId+prediction-row',
  }),
]);

export const LEVEL_INDEX = Object.freeze(Array.from({ length: 16 }, (_, level) => Object.freeze({
  level,
  tier: `A${String(level).padStart(2, '0')}`,
  lane: `L${level % 3}`,
  visibility: level < 4 ? 'public-agent' : level < 8 ? 'agent-supervisor' : level < 12 ? 'supervisor-operator' : 'operator-hidden',
  translate_down: level < 15 ? `A${String(level + 1).padStart(2, '0')}` : 'physical-cap',
  translate_up: level > 0 ? `A${String(level - 1).padStart(2, '0')}` : 'root',
})));

export const HOST_NODES = Object.freeze([
  Object.freeze({
    id: 'folder-microkernel',
    label: 'PID-specific-folder-host',
    watches: 'agent-dashboard-folder',
    supervisor: 'rotator-file-manager',
    process_launch: 0,
  }),
  Object.freeze({
    id: 'sister-reflection',
    label: 'sister-folder-self-reflection-agent',
    watches: 'parallel-dashboard-folder',
    supervisor: 'omniflywheel-review',
    process_launch: 0,
  }),
  Object.freeze({
    id: 'rotator-file-manager',
    label: 'host-node-file-rotation-supervisor',
    watches: 'preload-index+row-chain+ack-log',
    supervisor: 'omnispindle-dispatch',
    process_launch: 0,
  }),
]);

export const ROLES = Object.freeze([
  Object.freeze({
    id: 'scout',
    must_do: 'read-laws+probe-health+load-roster+emit-no-launch-plan',
    forbidden: 'live-control+mint+launch+fabrication',
  }),
  Object.freeze({
    id: 'spindle',
    must_do: 'work-one-section+emit-HBP-rows+attach-room-handle',
    forbidden: 'raw-pixels+DOM-authority+unbounded-context',
  }),
  Object.freeze({
    id: 'flywheel',
    must_do: 'attack-spindle-output+compare-to-acer-local-truth+name-catches',
    forbidden: 'rubber-stamp+delete-mistakes',
  }),
  Object.freeze({
    id: 'dispatcher',
    must_do: 'route-by-catalog+respect-operator-gates+log-acks',
    forbidden: 'wrong-route-packet-to-send-hbp+daemon-restart-without-gate',
  }),
]);

export const WORKFLOW = Object.freeze([
  'memory',
  'index',
  'plan',
  'memory',
  'index',
  'respond',
  'execute',
  'memory',
  'index',
]);

function token(field, value) {
  const s = String(value ?? '');
  if (!s || /[|\r\n]/.test(s)) throw new Error(`${field}-invalid`);
  return s.replace(/[^A-Za-z0-9._:/-]+/g, '-').replace(/^-|-$/g, '') || 'empty';
}

export function routeById(id) {
  const route = ROUTES.find((r) => r.id === id);
  if (!route) throw new Error(`unknown-route:${id}`);
  return route;
}

export function toolById(id) {
  const tool = TOOLS.find((t) => t.id === id);
  if (!tool) throw new Error(`unknown-tool:${id}`);
  return tool;
}

export function classifyPayloadForRoute({ route_id, payload_kind } = {}) {
  const route = routeById(route_id);
  const kind = token('payload_kind', payload_kind || 'none');
  if (route.id === 'send-hbp') {
    return kind === 'single-hbp-row-json0' ? 'ACCEPT_SINGLE_HBP_ROW' : 'REJECT_WRONG_ROUTE';
  }
  if (route.id === 'send-json') {
    return kind === 'operator-packet-lines' || kind === 'json-envelope' ? 'ACCEPT_JSON_ENVELOPE' : 'REJECT_WRONG_ROUTE';
  }
  return route.method === 'GET' ? 'READ_ONLY' : route.verdict;
}

export function emitPreloadRows() {
  const rows = [
    `FABPRELOADHDR|tool=${CATALOG_ID}|purpose=preload-agents-with-laws-routes-tools-gates-and-workflow-before-fabric-use|laws=${LAWS.length}|routes=${ROUTES.length}|tools=${TOOLS.length}|emitters=${EMITTERS.length}|levels=${LEVEL_INDEX.length}|roles=${ROLES.length}|json=0`,
    `FABPRELOADLAW|laws=${LAWS.join('+')}|json=0`,
    `FABPRELOADWORKFLOW|cadence=${WORKFLOW.join('-')}|operator_rule=respond-before-live-control-and-log-after-execute|json=0`,
    'FABPRELOADSLICEENGINE|law=SLICE-ENGINE-LAW|scope=all-supervisor-operator-level-agents+SUP-HELM-AGT-L3-H8EF7+ASOLARIA-root-profile|rule=fabric-is-frozen-positional-slice-field-engine-drive-is-the-only-mover|materialization=spawner-PID-emits-then-PID_SIGNAL-to-AGENT_ROOM-to-GULP-to-ERASE|pid_registration=repo-side-HBP-receipt-until-live-office-ingest|cube_mint=operator-gated-runtime-action-not-implied-by-doc|engine_crank=operator-gated-RUN_HERMES_SPINDLE-or-equivalent|json=0',
  ];
  for (const r of ROUTES) {
    rows.push(`FABPRELOADROUTE|id=${r.id}|method=${r.method}|endpoint=${token('endpoint', r.endpoint)}|payload=${r.payload}|verdict=${r.verdict}|use=${r.use}|json=0`);
  }
  for (const t of TOOLS) {
    rows.push(`FABPRELOADTOOL|id=${t.id}|path=${token('path', t.path)}|provides=${t.provides}|gate=${t.gate}|tag=PROVEN+tool-level|json=0`);
  }
  for (const e of EMITTERS) {
    rows.push(`FABPRELOADEMITTER|id=${e.id}|process=${e.process}|route=${e.route}|before=${e.before}|after=${e.after}|connection_label=PID-specific|json=0`);
  }
  for (const l of LEVEL_INDEX) {
    rows.push(`FABPRELOADLEVEL|tier=${l.tier}|level=${l.level}|lane=${l.lane}|visibility=${l.visibility}|translate_down=${l.translate_down}|translate_up=${l.translate_up}|index_role=appropriate-16-level-placement|json=0`);
  }
  for (const h of HOST_NODES) {
    rows.push(`FABPRELOADHOSTNODE|id=${h.id}|label=${h.label}|watches=${h.watches}|supervisor=${h.supervisor}|process_launch=${h.process_launch}|folder_scoped=1|json=0`);
  }
  for (const role of ROLES) {
    rows.push(`FABPRELOADROLE|id=${role.id}|must_do=${role.must_do}|forbidden=${role.forbidden}|json=0`);
  }
  rows.push('FABPRELOADGATE|live_control=DEFER_TO_OPERATOR|process_launch=0|mint=OPERATOR_COSIGN|raw_pixels=0|dom_authority=0|unknown_office_pid=PENDING-OFFICE-SNAPSHOT|physical_control=HARNESS-CLASSIFIER-BLOCKED-orthogonal-runtime-gate-NOT-liftable-by-operator-authorization-supervised-keyboard-route-required|json=0');
  rows.push('FABPRELOADFTR|state=SEALED-PRELOAD-CATALOG|next=agents-load-this-before-fabric-work|nothing_minted=1|nothing_launched=1|json=0');
  return rows;
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  add('routes-include-two-send-lanes', routeById('send-hbp').payload.includes('single-HBP') && routeById('send-json').payload.includes('operator-packet'));
  add('packet-lines-use-json-envelope', classifyPayloadForRoute({ route_id: 'send-json', payload_kind: 'operator-packet-lines' }) === 'ACCEPT_JSON_ENVELOPE');
  add('packet-lines-rejected-on-hbp-lane', classifyPayloadForRoute({ route_id: 'send-hbp', payload_kind: 'operator-packet-lines' }) === 'REJECT_WRONG_ROUTE');
  add('tools-include-room-and-pid', !!toolById('pixel-room-handle') && !!toolById('github-live-pid-reconcile')
    && !!toolById('github-live-office-reconcile-expansion') && !!toolById('catch-count-ledger')
    && !!toolById('mlc-engine-wiring-increment') && !!toolById('frontend-parity-matrix')
    && !!toolById('model-selector-matrix') && !!toolById('project-guide-matrix')
    && !!toolById('tool-skill-registry-matrix') && !!toolById('program-cube-ingestion-map')
    && !!toolById('agent-cost-layer-boundary') && !!toolById('triad-host-router-gulp-pipeline')
    && !!toolById('pid-emitter-cost-envelope') && !!toolById('cellphone-host-bridge-boundary')
    && !!toolById('frozen-slice-city-signal-lifecycle') && !!toolById('eight-byte-host-process-upgrade')
    && !!toolById('odysseus-mtp-control-surface') && !!toolById('odysseus-scientific-3d-field'));
  add('slice-engine-law-preloaded', LAWS.some((law) => law.startsWith('slice-engine-law-'))
    && emitPreloadRows().some((row) => row.startsWith('FABPRELOADSLICEENGINE|')));
  add('emitters-pipe-hookwall-gnn', EMITTERS.some((e) => e.id === 'hookwall') && EMITTERS.some((e) => e.id === 'gnn-edge'));
  add('levels-cover-16', LEVEL_INDEX.length === 16 && LEVEL_INDEX[0].tier === 'A00' && LEVEL_INDEX[15].translate_down === 'physical-cap');
  add('acer-local-4949-flap-route', routeById('super-os-4949').verdict === 'RESPAWN_FLAP_DO_NOT_TRUST');
  add('harness-gate-row-present', emitPreloadRows().some((row) => row.includes('physical_control=HARNESS-CLASSIFIER-BLOCKED')));
  add('host-nodes-are-row-only', HOST_NODES.every((h) => h.process_launch === 0 && h.label));
  add('roles-grounded', ROLES.every((r) => r.must_do && r.forbidden));
  add('rows-hbp-only', emitPreloadRows().every((row) => row.endsWith('|json=0') && !row.includes('\n')));
  add('workflow-cadence', WORKFLOW.join('-').includes('memory-index-plan'));
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv[2] === '--self-test') {
    const r = selfTest();
    for (const c of r.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(r.ok ? 0 : 1);
  }
  for (const row of emitPreloadRows()) console.log(row);
}
