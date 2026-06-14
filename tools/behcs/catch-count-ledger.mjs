#!/usr/bin/env node
// catch-count-ledger.mjs
//
// Held-safe, append-only catch ledger for the bilateral Acer/Liris correction loop.
// This closes the LIRISCATCHCOUNTGATE shape: every counted catch has date, vantage,
// file_or_test, defect_class, fix_commit, owner, and open/closed status. It does not
// read live systems, write the PID office, mint, cut over, launch, or repair anything.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const LEDGER_ID = 'catch-count-ledger.v1';
export const EXPECTED_CATCH_FLOOR = 34;
export const STATUSES = Object.freeze(['CLOSED', 'PARTIAL', 'OPEN']);
export const SEVERITIES = Object.freeze(['HIGH', 'MEDIUM', 'LOW', 'INFO']);

const closed = 'CLOSED';
const partial = 'PARTIAL';
const open = 'OPEN';

function row(r) {
  return Object.freeze(r);
}

export const CATCH_ROWS = Object.freeze([
  row({ id: 'C001', date: '2026-06-11', vantage: 'acer-to-liris', source: 'docs/LIRIS-BHX-EXPANSION-CATCH33-PATCH-2026-06-11.hbp', file_or_test: 'tools/behcs/brown-hilbert-expansion-stress.mjs', defect_class: 'proof-check-insufficient', severity: 'MEDIUM', status: closed, owner: 'liris', fix_commit: 'c0a9fba', summary: 'decimal-shape-proof-used-necessary-not-sufficient-tail-check' }),
  row({ id: 'C002', date: '2026-06-11', vantage: 'liris-to-acer', source: 'docs/LIRIS-BHX-EXPANSION-CATCH34-TEST-COVERAGE-PATCH-2026-06-11.hbp', file_or_test: 'tests/brown-hilbert-expansion-stress.unit.test.mjs', defect_class: 'test-label-mismatch', severity: 'LOW', status: closed, owner: 'liris', fix_commit: '28db7fd', summary: 'last-pos-9-boundary-test-used-wrong-exponent-so-it-tested-length-first' }),
  row({ id: 'C003', date: '2026-06-11', vantage: 'liris-to-acer', source: 'docs/LIRIS-BHX-EXPANSION-CATCH34-TEST-COVERAGE-PATCH-2026-06-11.hbp', file_or_test: 'tests/brown-hilbert-expansion-stress.unit.test.mjs', defect_class: 'test-label-mismatch', severity: 'LOW', status: closed, owner: 'liris', fix_commit: '28db7fd', summary: 'right-last-char-case-also-had-wrong-length-so-label-overclaimed' }),
  row({ id: 'C004', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp', file_or_test: 'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp', defect_class: 'surface-conflation', severity: 'HIGH', status: partial, owner: 'liris', fix_commit: 'PARTIAL-af70b45-related-catalog-gate', summary: 'safe-mirror-5054-was-conflated-with-AgentTerms-parity-shadow' }),
  row({ id: 'C005', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp', file_or_test: 'tools/behcs/route-health-baseline.mjs', defect_class: 'route-health-undercharacterized', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: '56142b7', summary: '4949-or-4947-route-boundary-needed-health-contract-not-dead-port-label' }),
  row({ id: 'C006', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp', file_or_test: 'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp', defect_class: 'tier-map-ungrounded', severity: 'MEDIUM', status: partial, owner: 'bilateral', fix_commit: 'PARTIAL-2e556f8-office-map-improves-not-complete', summary: 'A00-through-A15-ladder-needed-live-office-grounding-before-promotion' }),
  row({ id: 'C007', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-LIRIS-F5MCP16-COMPARE-TO-LOCAL-2026-06-12.hbp', file_or_test: 'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp', defect_class: 'level-ownership-overlap', severity: 'LOW', status: open, owner: 'bilateral', fix_commit: 'none-open', summary: 'omnidispatcher-spindle-flywheel-level-bands-overlap-and-need-owner-or-band-semantics' }),
  row({ id: 'C008', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-VERIFY-CATALOG-2026-06-12.hbp', file_or_test: 'tools/behcs/fabric-agent-preload-catalog.mjs', defect_class: 'missing-route', severity: 'HIGH', status: closed, owner: 'acer', fix_commit: 'af70b45', summary: 'preload-catalog-omitted-4949-super-os-and-mcp-proxy-flap-route' }),
  row({ id: 'C009', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-VERIFY-CATALOG-2026-06-12.hbp', file_or_test: 'tools/behcs/fabric-agent-preload-catalog.mjs', defect_class: 'missing-runtime-gate', severity: 'HIGH', status: closed, owner: 'acer', fix_commit: 'af70b45', summary: 'catalog-live-control-gate-omitted-harness-classifier-block' }),
  row({ id: 'C010', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-VERIFY-CATALOG-2026-06-12.hbp', file_or_test: 'tools/behcs/fabric-agent-preload-catalog.mjs', defect_class: 'tag-honesty', severity: 'MEDIUM', status: partial, owner: 'liris', fix_commit: 'PARTIAL-tag-follow-up', summary: 'emitter-host-node-level-rows-are-architecture-contracts-not-proven-running-code' }),
  row({ id: 'C011', date: '2026-06-12', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-VERIFY-CATALOG-2026-06-12.hbp', file_or_test: 'tools/behcs/fabric-agent-preload-catalog.mjs', defect_class: 'office-grounding-gap', severity: 'LOW', status: partial, owner: 'liris', fix_commit: 'PARTIAL-office-tier-verification-needed', summary: '16-level-visibility-bands-still-need-office-tier-verification' }),
  row({ id: 'C012', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'docs/ACER-EXISTING-STUB-FOLDER-CENSUS-2026-06-13.hbp', defect_class: 'substrate-duplication-risk', severity: 'HIGH', status: partial, owner: 'bilateral', fix_commit: 'PARTIAL-census-receipts-exist-scale-tests-pending', summary: 'plan-risked-building-new-rooms-before-reading-existing-room-substrate' }),
  row({ id: 'C013', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'tools/behcs/github-live-office-reconcile-expansion.mjs', defect_class: 'pid-reconciliation-gap', severity: 'HIGH', status: closed, owner: 'liris+acer', fix_commit: '2e556f8+7952cf6', summary: 'github-PIDs-needed-live-726-office-alias-map-before-agent-canon-use' }),
  row({ id: 'C014', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'tools/behcs/route-health-baseline.mjs', defect_class: 'fabric-hot-path-instability', severity: 'HIGH', status: partial, owner: 'bilateral', fix_commit: '47cbc00+56142b7', summary: 'fabric-MCP-WebMCP-savings-lanes-needed-route-health-baseline-and-fallbacks' }),
  row({ id: 'C015', date: '2026-06-14', vantage: 'liris', source: 'docs/LIRIS-FRONTEND-PARITY-MATRIX-2026-06-14.hbp+docs/LIRIS-MODEL-SELECTOR-MATRIX-2026-06-14.hbp+docs/LIRIS-PROJECT-GUIDE-MATRIX-2026-06-14.hbp+docs/LIRIS-TOOL-SKILL-REGISTRY-MATRIX-2026-06-14.hbp', file_or_test: 'tools/behcs/frontend-parity-matrix.mjs', defect_class: 'frontend-parity-gap', severity: 'MEDIUM', status: partial, owner: 'bilateral', fix_commit: 'frontend-parity+model-selector-M+project-guide-P+tool-skill-T', summary: 'frontend-parity-matrix-now-has-M-T-P-descriptor-artifacts-PARTIAL; live-tool-execution-submit-schema-council-cache-and-dashboard-cold-paths-still-block-green' }),
  row({ id: 'C016', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'docs/LIRIS-ACER-READBACK-REQUESTED', defect_class: 'storage-gate', severity: 'MEDIUM', status: partial, owner: 'operator', fix_commit: 'PARTIAL-ADC-or-transfer-receipts-needed', summary: '35TB-google-and-SOVLINUX-storage-are-gated-cold-path-not-local-hot-path' }),
  row({ id: 'C017', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'docs/ACER-VISUAL-PREDICTION-FROZEN-GEMMA-PROOF-GATE-2026-06-12.hbp', defect_class: 'proof-gap', severity: 'MEDIUM', status: open, owner: 'bilateral', fix_commit: 'none-open', summary: 'pixel-world-HRM-frozen-gemma-loop-needs-double-run-and-frame-proof-receipts' }),
  row({ id: 'C018', date: '2026-06-13', vantage: 'acer-audit', source: 'docs/ACER-200STEP-ALIGNMENT-AUDIT-2026-06-13.hbp', file_or_test: 'tools/behcs/fabric-agent-preload-catalog.mjs', defect_class: 'running-vs-contract-tag', severity: 'MEDIUM', status: partial, owner: 'bilateral', fix_commit: 'PARTIAL-tag-contract-vs-running', summary: 'host-node-rotator-sister-reflection-rows-are-contracts-not-all-running-code' }),
  row({ id: 'C019', date: '2026-06-14', vantage: 'liris', source: 'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp', file_or_test: 'tools/behcs/catch-count-ledger.mjs', defect_class: 'missing-catch-ledger', severity: 'LOW', status: closed, owner: 'liris', fix_commit: 'this-ledger-commit', summary: 'catch-count-ledger-required-before-final-md-release-claims' }),
  row({ id: 'C020', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'hbp-row-injection', severity: 'HIGH', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'numeric-fields-in-emitRows-needed-safe-escaping-before-gate-row' }),
  row({ id: 'C021', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'hbp-row-injection', severity: 'HIGH', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'array-cosigner-field-could-forge-extra-HBP-row-before-safe-map' }),
  row({ id: 'C022', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'totality', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'validate-emit-heal-needed-total-null-undefined-garbage-handling' }),
  row({ id: 'C023', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'numeric-domain', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'NaN-and-Infinity-gnn-score-had-to-be-rejected' }),
  row({ id: 'C024', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'timestamp-domain', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'Date-parse-able-junk-needed-canonical-ISO-UTC-rejection' }),
  row({ id: 'C025', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'coercion', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'step-3abc-and-3dot9-must-not-coerce-to-step-3' }),
  row({ id: 'C026', date: '2026-06-13', vantage: 'acer-workflow', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'tamper-digest', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'envelope-sha-needed-full-canonical-body-not-four-field-digest' }),
  row({ id: 'C027', date: '2026-06-13', vantage: 'acer-re-attack', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'totality', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'BigInt-body-field-needed-no-throw-invalid-result' }),
  row({ id: 'C028', date: '2026-06-13', vantage: 'acer-re-attack', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'cycle-safety', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'circular-council-verdict-needed-cycle-safe-canonical-body' }),
  row({ id: 'C029', date: '2026-06-13', vantage: 'acer-re-attack', source: 'tests/heal-envelope-emitter.unit.test.mjs', file_or_test: 'tools/behcs/heal-envelope-emitter.mjs', defect_class: 'hostile-getter-totality', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'e352bcb', summary: 'throwing-getters-and-throwing-toString-needed-total-wrappers' }),
  row({ id: 'C030', date: '2026-06-13', vantage: 'acer-to-liris', source: 'docs/ACER-BUS-HEALTH-CONTRACT-FIX-2026-06-13.hbp', file_or_test: 'tools/behcs/route-health-baseline.mjs', defect_class: 'wrong-health-contract', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: '56142b7', summary: '4947-bus-health-is-behcs-health-not-root-health-route-boundary' }),
  row({ id: 'C031', date: '2026-06-13', vantage: 'acer-to-liris', source: 'docs/ACER-ROUTE-HEALTH-CROSS-VANTAGE-2026-06-13.hbp', file_or_test: 'tools/behcs/route-health-baseline.mjs', defect_class: 'vantage-relative-localhost', severity: 'LOW', status: closed, owner: 'acer', fix_commit: '3d35a0a', summary: '127-0-0-1-4944-is-liris-localhost-so-acer-probe-must-not-label-liris-down' }),
  row({ id: 'C032', date: '2026-06-13', vantage: 'liris', source: 'docs/LIRIS-GITHUB-LIVE-OFFICE-RECONCILE-EXPANSION-2026-06-13.hbp', file_or_test: 'tools/behcs/github-live-office-reconcile-expansion.mjs', defect_class: 'old-tool-scope-gap', severity: 'HIGH', status: closed, owner: 'liris', fix_commit: '2e556f8', summary: 'old-github-live-pid-reconcile-covered-only-seed-three-not-full-726-office-feed' }),
  row({ id: 'C033', date: '2026-06-13', vantage: 'acer-workflow', source: 'docs/ACER-ATTACK-LIRIS-RECONCILE-EXPANSION-2026-06-13.hbp', file_or_test: 'tools/behcs/github-live-office-reconcile-expansion.mjs', defect_class: 'false-match-risk', severity: 'MEDIUM', status: closed, owner: 'liris', fix_commit: '2e556f8', summary: 'parallel-acer-build-found-sha-alone-false-match-risk-liris-canonical-required-sha-and-glyph' }),
  row({ id: 'C034', date: '2026-06-13', vantage: 'acer-to-liris', source: 'docs/ACER-ATTACK-LIRIS-RECONCILE-EXPANSION-2026-06-13.hbp', file_or_test: 'tests/github-live-office-reconcile-expansion.unit.test.mjs', defect_class: 'exported-api-totality', severity: 'LOW', status: closed, owner: 'acer', fix_commit: '7952cf6', summary: 'reconcileEntry-parseSupervisorFeed-needed-total-hostile-input-regression' }),
  row({ id: 'C035', date: '2026-06-14', vantage: 'acer-native', source: 'docs/ACER-SLICE-ENGINE-COSIGN-MINT-2026-06-14.hbp', file_or_test: 'canon/laws/LAW-SLICE-ENGINE.md', defect_class: 'class1-cosign-gate', severity: 'MEDIUM', status: closed, owner: 'operator-pair', fix_commit: 'cosign-seq3565-c26eaacb', summary: 'LAW-SLICE-ENGINE-class1-cosign-MINTED-seq3565-row_hash-c26eaacbc85121e8-under-OP-JESSE-apex-standing-quintuple-2026-06-14' }),
  row({ id: 'C036', date: '2026-06-13', vantage: 'liris-plan', source: 'docs/LIRIS-SELFHEAL-200STEP-INTEGRATION-2026-06-13.hbp', file_or_test: 'docs/TARGET-ARCHITECTURE-200-STEP-DELTA-2026-06-11.hbp', defect_class: 'live-engine-wiring-gate', severity: 'HIGH', status: open, owner: 'operator', fix_commit: 'none-open-operator-gated', summary: 'live-MTP-HRM-Fischer-Mamba-engine-wiring-fails-held-safe-gate-until-separate-authorization' }),
  row({ id: 'C037', date: '2026-06-12', vantage: 'liris-plan', source: 'docs/LIRIS-CROWN-PLAN-DEEPENING-READBACK-2026-06-12.hbp', file_or_test: 'README.md', defect_class: 'catch-count-ambiguity', severity: 'LOW', status: closed, owner: 'liris', fix_commit: 'this-ledger-commit', summary: 'README-18-vs-session-circa34-resolved-by-enumerable-ledger-floor-and-open-status' }),
  row({ id: 'C038', date: '2026-06-14', vantage: 'acer-review', source: 'docs/ACER-ATTACK-LIRIS-MLC-ENGINE-WIRING-2026-06-14.hbp', file_or_test: 'tools/behcs/mlc-engine-wiring-increment.mjs', defect_class: 'decorative-count-honesty', severity: 'LOW', status: closed, owner: 'acer', fix_commit: 'acer-mlc-wire-review', summary: 'engine_counts-fischer-mamba-aot-trivially-equal-entries-per-line-overlay-now-labeled-not-signal' }),
  row({ id: 'C039', date: '2026-06-14', vantage: 'acer-review', source: 'docs/ACER-ATTACK-LIRIS-MLC-ENGINE-WIRING-2026-06-14.hbp', file_or_test: 'tools/behcs/mlc-engine-wiring-increment.mjs', defect_class: 'cap-zero-fallthrough', severity: 'LOW', status: closed, owner: 'acer', fix_commit: 'acer-mlc-wire-review', summary: 'cap=0-fell-through-||12-to-default-now-Number.isFinite-honored-so-cap0-emits-0-rows' }),
  row({ id: 'C040', date: '2026-06-14', vantage: 'acer-review', source: 'docs/ACER-ATTACK-LIRIS-FRONTEND-PARITY-MATRIX-2026-06-14.hbp', file_or_test: 'tools/behcs/frontend-parity-matrix.mjs', defect_class: 'overclaimed-green-honesty', severity: 'MEDIUM', status: closed, owner: 'acer', fix_commit: 'acer-frontend-parity-review', summary: 'council_vote-cell-C-was-GREEN-but-verdict-read-lane-repeatedly-all_bases_unavailable-this-session-corrected-to-PARTIAL-availability-not-green' }),
]);

function safe(value) {
  try {
    return String(value == null ? '' : value).replace(/[|\r\n]/g, '_');
  } catch {
    return '_';
  }
}

function isObj(value) {
  return value !== null && typeof value === 'object';
}

function readProp(obj, key, fallback = '') {
  try {
    return isObj(obj) ? obj[key] : fallback;
  } catch {
    return fallback;
  }
}

function enumValue(value, allowed, fallback) {
  const s = safe(value).toUpperCase();
  return allowed.includes(s) ? s : fallback;
}

function normalizeCatch(input) {
  const id = safe(readProp(input, 'id', ''));
  return {
    id: /^C\d{3}$/.test(id) ? id : 'C000',
    date: safe(readProp(input, 'date', 'unknown-date')),
    vantage: safe(readProp(input, 'vantage', 'unknown-vantage')),
    source: safe(readProp(input, 'source', 'unknown-source')),
    file_or_test: safe(readProp(input, 'file_or_test', 'unknown-file')),
    defect_class: safe(readProp(input, 'defect_class', 'unknown-defect')),
    severity: enumValue(readProp(input, 'severity', 'INFO'), SEVERITIES, 'INFO'),
    status: enumValue(readProp(input, 'status', open), STATUSES, open),
    owner: safe(readProp(input, 'owner', 'unknown-owner')),
    fix_commit: safe(readProp(input, 'fix_commit', 'none-open')),
    summary: safe(readProp(input, 'summary', '')),
  };
}

function countBy(rows, field) {
  const out = {};
  for (const row of rows) {
    const key = safe(readProp(row, field, 'unknown')) || 'unknown';
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function mapFields(obj) {
  return Object.entries(isObj(obj) ? obj : {})
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${safe(k)}=${safe(v)}`)
    .join('|') || 'none=0';
}

export function summarizeCatches(input = CATCH_ROWS) {
  const rows = (Array.isArray(input) ? input : CATCH_ROWS).map(normalizeCatch);
  const total = rows.length;
  const closedCount = rows.filter((r) => r.status === closed).length;
  const partialCount = rows.filter((r) => r.status === partial).length;
  const openCount = rows.filter((r) => r.status === open).length;
  const missingFixCommit = rows.filter((r) => !r.fix_commit || r.fix_commit === 'none').length;
  const duplicateIds = total - new Set(rows.map((r) => r.id)).size;
  return {
    tool: LEDGER_ID,
    expected_floor: EXPECTED_CATCH_FLOOR,
    total,
    closed: closedCount,
    partial: partialCount,
    open: openCount,
    missing_fix_commit: missingFixCommit,
    duplicate_ids: duplicateIds,
    meets_expected_floor: total >= EXPECTED_CATCH_FLOOR,
    md_final_ready: total >= EXPECTED_CATCH_FLOOR && openCount === 0 && partialCount === 0 && missingFixCommit === 0 && duplicateIds === 0,
    by_vantage: countBy(rows, 'vantage'),
    by_defect_class: countBy(rows, 'defect_class'),
    by_owner: countBy(rows, 'owner'),
    rows,
  };
}

export function emitRows(input = CATCH_ROWS, opts = {}) {
  try {
    const summary = summarizeCatches(input);
    const limitRaw = readProp(opts, 'limit', summary.rows.length);
    const limit = Number.isInteger(limitRaw) && limitRaw >= 0 ? Math.min(limitRaw, summary.rows.length) : summary.rows.length;
    const rows = [
      `CATCHLEDGERHDR|tool=${LEDGER_ID}|expected_floor=${summary.expected_floor}|total=${summary.total}|closed=${summary.closed}|partial=${summary.partial}|open=${summary.open}|meets_floor=${summary.meets_expected_floor ? 1 : 0}|md_final_ready=${summary.md_final_ready ? 1 : 0}|append_only=1|read_only=1|process_launch=0|no_mint=1|no_cutover=1|json=0`,
      `CATCHLEDGERSUM|by_vantage=${mapFields(summary.by_vantage)}|json=0`,
      `CATCHLEDGERDEFECTS|${mapFields(summary.by_defect_class)}|json=0`,
      `CATCHLEDGEROWNERS|${mapFields(summary.by_owner)}|json=0`,
    ];
    for (const c of summary.rows.slice(0, limit)) {
      rows.push(`CATCHLEDGERROW|id=${safe(c.id)}|date=${safe(c.date)}|vantage=${safe(c.vantage)}|status=${safe(c.status)}|severity=${safe(c.severity)}|defect_class=${safe(c.defect_class)}|file_or_test=${safe(c.file_or_test)}|owner=${safe(c.owner)}|fix_commit=${safe(c.fix_commit)}|source=${safe(c.source)}|summary=${safe(c.summary)}|json=0`);
    }
    rows.push(`CATCHLEDGERGATE|md_final_ready=${summary.md_final_ready ? 1 : 0}|reason=${summary.md_final_ready ? 'all-catches-closed' : 'open-or-partial-catches-remain-or-ledger-not-clean'}|release_claims=${summary.md_final_ready ? 'ALLOW' : 'HOLD'}|nothing_minted=1|nothing_launched=1|json=0`);
    rows.push(`CATCHLEDGERFTR|state=SEALED-CATCH-COUNT-LEDGER|floor=${summary.expected_floor}|total=${summary.total}|ledger_is_descriptor_only=1|json=0`);
    return rows;
  } catch {
    return [
      `CATCHLEDGERHDR|tool=${LEDGER_ID}|expected_floor=${EXPECTED_CATCH_FLOOR}|total=0|closed=0|partial=0|open=1|meets_floor=0|md_final_ready=0|append_only=1|read_only=1|process_launch=0|no_mint=1|no_cutover=1|json=0`,
      'CATCHLEDGERGATE|md_final_ready=0|reason=emit-threw-held-invalid|release_claims=HOLD|nothing_minted=1|nothing_launched=1|json=0',
    ];
  }
}

export function selfTest() {
  const checks = [];
  const add = (name, ok) => checks.push({ name, ok: Boolean(ok) });
  const summary = summarizeCatches();
  const rows = emitRows();
  add('floor-met-not-silent-18', summary.total >= EXPECTED_CATCH_FLOOR && summary.meets_expected_floor === true);
  add('md-final-held-while-open-or-partial', summary.md_final_ready === false && summary.open > 0 && summary.partial > 0);
  add('required-fields-present', summary.rows.every((r) => r.id && r.date && r.vantage && r.file_or_test && r.defect_class && r.fix_commit && r.owner && STATUSES.includes(r.status)));
  add('recent-commits-covered', summary.rows.some((r) => r.fix_commit.includes('e352bcb')) && summary.rows.some((r) => r.fix_commit.includes('56142b7')) && summary.rows.some((r) => r.fix_commit.includes('7952cf6')));
  add('no-duplicate-ids', summary.duplicate_ids === 0);
  add('rows-hbp-only', rows.every((r) => r.endsWith('|json=0') && !/[{\r\n]/.test(r)));
  add('gate-row-holds-release', rows.some((r) => r.startsWith('CATCHLEDGERGATE|') && r.includes('release_claims=HOLD')));
  let threw = false;
  try {
    summarizeCatches(null);
    summarizeCatches([Object.defineProperty({}, 'id', { get() { throw new Error('boom'); } })]);
    emitRows([Object.defineProperty({}, 'summary', { get() { throw new Error('boom'); } })]);
    emitRows(null);
  } catch {
    threw = true;
  }
  add('total-never-throws', threw === false);
  return { ok: checks.every((c) => c.ok), checks };
}

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMain) {
  if (process.argv.includes('--self-test')) {
    const result = selfTest();
    for (const c of result.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(result.ok ? 0 : 1);
  }
  const limitArg = process.argv.find((arg) => arg.startsWith('--limit='));
  const limit = limitArg ? Number(limitArg.slice('--limit='.length)) : CATCH_ROWS.length;
  for (const line of emitRows(CATCH_ROWS, { limit })) console.log(line);
}
