import { createHash } from 'node:crypto';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SCANNER_ID = 'kimi-desktop-surface-scan.v1';

const repo = resolve(fileURLToPath(new URL('../..', import.meta.url)));

const DEFAULT_MARKERS = Object.freeze({
  agentClientProtocol: /node_modules\/@agentclientprotocol\/sdk\/package\.json$/,
  agentApi: /node_modules\/@kimi\/proto\/kimi\/gateway\/agentapi\/v1\/service-AgentAPIService_connectquery\.ts$/,
  mcpGateway: /node_modules\/@kimi\/proto\/kimi\/gateway\/mcp\/v1\/mcp-MCPService_connectquery\.ts$/,
  skillGateway: /node_modules\/@kimi\/proto\/kimi\/gateway\/skill\/v1\/service-SkillService_connectquery\.ts$/,
  sandboxV3: /node_modules\/@kimi\/proto\/agent\/sandbox\/v3\/instance-SandboxService_connectquery\.ts$/,
  webAgent: /node_modules\/@kimi\/proto\/webagent\/v1\/agent-AgentService_connectquery\.ts$/,
  kimiBridge: /node_modules\/@kimi\/proto\/openplatform\/kimibridge\/v1\/kimibridge-KimiBridgeService_connectquery\.ts$/,
  preloadKimiAgent: /out\/preload\/preload-kimi-agent\.mjs$/,
  bridgeProtocol: /out\/preload\/bridge-protocol-[^/]+\.mjs$/,
  agentsView: /out\/renderer\/assets\/AgentsView-[^/]+\.js$/,
  skillsView: /out\/renderer\/assets\/SkillsView-[^/]+\.js$/,
});

const IPC_MARKERS = Object.freeze([
  'GET_WORKSPACE_ROOT',
  'GET_CRON_WORKSPACE_DIR',
  'CREATE_FOLDER',
  'LIST_DIR',
  'OPEN_AS_TEXT',
  'OPEN_SKILLS_DIR',
  'LIST_OFFICIAL_SKILLS',
  'INSTALL_SKILL',
  'CONTEXT_CACHE_GET',
  'WORKSPACE_OVERRIDES_GET',
]);

export function sha16(text) {
  return createHash('sha256').update(String(text), 'utf8').digest('hex').slice(0, 16);
}

export function parseAsarHeader(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 20) {
    throw new Error('asar-buffer-too-small');
  }
  const headerJsonBytes = buffer.readUInt32LE(12);
  const start = 16;
  const end = start + headerJsonBytes;
  if (headerJsonBytes <= 0 || end > buffer.length) {
    throw new Error('asar-header-out-of-bounds');
  }
  const json = buffer.subarray(start, end).toString('utf8');
  return JSON.parse(json);
}

export function walkAsarPaths(node, prefix = '') {
  const rows = [];
  if (!node || typeof node !== 'object' || !node.files) return rows;
  for (const [name, child] of Object.entries(node.files)) {
    const path = prefix ? `${prefix}/${name}` : name;
    rows.push(path);
    rows.push(...walkAsarPaths(child, path));
  }
  return rows;
}

export function classifyKimiSurface(paths) {
  const normalized = paths.map((p) => String(p).replace(/\\/g, '/'));
  const found = {};
  for (const [name, pattern] of Object.entries(DEFAULT_MARKERS)) {
    found[name] = normalized.some((p) => pattern.test(p));
  }
  const kimiProtoCount = normalized.filter((p) => p.startsWith('node_modules/@kimi/proto/')).length;
  const protoServiceCount = normalized.filter((p) => /_connectquery\.ts$/.test(p)).length;
  const rendererAgentAssets = normalized.filter((p) => /out\/renderer\/assets\/.*(Agent|Skill|mcp|MCP)/.test(p)).length;
  return {
    found,
    counts: {
      totalPaths: normalized.length,
      kimiProtoCount,
      protoServiceCount,
      rendererAgentAssets,
    },
    digest: sha16(normalized.sort().join('\n')),
  };
}

export function extractBridgeChannels(text) {
  const channelText = String(text || '');
  return IPC_MARKERS.filter((marker) => channelText.includes(marker));
}

// acer catch (ACER-KIMI-DAIMON-CATCH): the local code-execution substrate lives
// OUTSIDE app.asar in resources/resources/ -- daimon-bundle.tar.gz (bundles
// CPython+uv+git), gateway.asar, runtime/node.exe. An app.asar-only walk misses it.
// Pure classifier over a presence/size probe so it is testable with no Kimi install.
export function classifyExecSubstrate(probe) {
  const p = probe || {};
  const pick = (k) => ({
    present: Boolean(p[k] && p[k].present),
    size: (p[k] && Number.isFinite(p[k].size) && p[k].size > 0) ? p[k].size : 0,
  });
  return { daimonBundle: pick('daimonBundle'), gatewayAsar: pick('gatewayAsar'), nodeRuntime: pick('nodeRuntime') };
}

// read-only metadata probe: existence + size only, NEVER extract the tar or read contents.
export function probeExecSubstrate(resourcesResourcesDir) {
  const base = resourcesResourcesDir || '';
  const targets = {
    daimonBundle: join(base, 'daimon-bundle.tar.gz'),
    gatewayAsar: join(base, 'gateway.asar'),
    nodeRuntime: join(base, 'runtime', 'node.exe'),
  };
  const probe = {};
  for (const [k, f] of Object.entries(targets)) {
    const present = Boolean(base) && existsSync(f);
    probe[k] = { present, size: present ? statSync(f).size : 0 };
  }
  return classifyExecSubstrate(probe);
}

export function emitSurfaceRows(scan) {
  const s = scan || {};
  const c = s.classification || classifyKimiSurface([]);
  const found = c.found || {};
  const counts = c.counts || {};
  const present = Object.entries(found).filter(([, v]) => v).map(([k]) => k).sort();
  const ex = s.execSubstrate || classifyExecSubstrate({});
  return [
    `KIMISURFACEHDR|scanner=${SCANNER_ID}|app_asar_present=${s.appAsarPresent ? 1 : 0}|webbridge_present=${s.webbridgePresent ? 1 : 0}|privacy=token-store-and-private-chat-not-read|json=0`,
    `KIMISURFACEPATHS|total_paths=${counts.totalPaths || 0}|kimi_proto_paths=${counts.kimiProtoCount || 0}|proto_service_paths=${counts.protoServiceCount || 0}|renderer_agent_assets=${counts.rendererAgentAssets || 0}|path_digest16=${c.digest || sha16('')}|json=0`,
    `KIMISURFACEMARKERS|present=${present.join('+') || 'none'}|missing=${Object.keys(found).filter((k) => !found[k]).sort().join('+') || 'none'}|json=0`,
    `KIMISURFACEBRIDGE|local_listener_observed=${s.localListenerObserved || 'not-observed-by-this-scanner'}|webbridge_size=${s.webbridgeSize || 0}|webbridge_version=${s.webbridgeVersion || 'unknown'}|json=0`,
    `KIMISURFACEEXEC|daimon_bundle_present=${ex.daimonBundle.present ? 1 : 0}|gateway_asar_present=${ex.gatewayAsar.present ? 1 : 0}|node_runtime_present=${ex.nodeRuntime.present ? 1 : 0}|daimon_bundle_bytes=${ex.daimonBundle.size}|note=local-exec-substrate-OUTSIDE-app.asar-bundles-python-uv-git-metadata-only-NOT-extracted|json=0`,
    `KIMISURFACEABSORB|patterns=ACP-client-protocol+MCP-registry+SkillService+SandboxService+WebAgent+local-webbridge+workspace-overrides+cron-workspace+daimon-bundle-local-exec-substrate|guard=read-only-inspection-no-token-read-no-private-chat-read-no-kimi-action|json=0`,
  ];
}

export function scanKimiInstall(options = {}) {
  const localAppData = process.env.LOCALAPPDATA || '';
  const userHome = process.env.USERPROFILE || '';
  const appAsar = options.appAsar || join(localAppData, 'Programs', 'kimi-desktop', 'resources', 'app.asar');
  const webbridgeExe = options.webbridgeExe || join(userHome, '.kimi-webbridge', 'bin', 'kimi-webbridge.exe');
  const webbridgeVersionFile = options.webbridgeVersionFile || join(userHome, '.kimi-webbridge', 'bin', 'kimi-webbridge.version');
  const resourcesResourcesDir = options.resourcesResourcesDir || join(localAppData, 'Programs', 'kimi-desktop', 'resources', 'resources');

  let paths = [];
  let appAsarPresent = false;
  if (existsSync(appAsar)) {
    appAsarPresent = true;
    paths = walkAsarPaths(parseAsarHeader(readFileSync(appAsar)));
  }

  const webbridgePresent = existsSync(webbridgeExe);
  const webbridgeSize = webbridgePresent ? statSync(webbridgeExe).size : 0;
  const webbridgeVersion = existsSync(webbridgeVersionFile)
    ? readFileSync(webbridgeVersionFile, 'utf8').trim().replace(/[|\r\n]/g, '-')
    : 'unknown';

  return {
    appAsar,
    appAsarPresent,
    webbridgeExe,
    webbridgePresent,
    webbridgeSize,
    webbridgeVersion,
    classification: classifyKimiSurface(paths),
    execSubstrate: probeExecSubstrate(resourcesResourcesDir),
  };
}

export function selfTest() {
  const fakeHeader = {
    files: {
      node_modules: { files: {
        '@agentclientprotocol': { files: { sdk: { files: { 'package.json': { size: 1, offset: '0' } } } } },
        '@kimi': { files: { proto: { files: {
          kimi: { files: { gateway: { files: {
            mcp: { files: { v1: { files: { 'mcp-MCPService_connectquery.ts': { size: 1, offset: '1' } } } } },
            skill: { files: { v1: { files: { 'service-SkillService_connectquery.ts': { size: 1, offset: '2' } } } } },
            agentapi: { files: { v1: { files: { 'service-AgentAPIService_connectquery.ts': { size: 1, offset: '3' } } } } },
          } } } },
          agent: { files: { sandbox: { files: { v3: { files: { 'instance-SandboxService_connectquery.ts': { size: 1, offset: '4' } } } } } } },
        } } } },
      } },
      out: { files: { preload: { files: {
        'preload-kimi-agent.mjs': { size: 1, offset: '5' },
        'bridge-protocol-ABC.mjs': { size: 1, offset: '6' },
      } } } },
    },
  };
  const paths = walkAsarPaths(fakeHeader);
  const c = classifyKimiSurface(paths);
  const checks = [
    ['detects-acp', c.found.agentClientProtocol],
    ['detects-mcp', c.found.mcpGateway],
    ['detects-skill', c.found.skillGateway],
    ['detects-agentapi', c.found.agentApi],
    ['detects-sandbox', c.found.sandboxV3],
    ['detects-preload', c.found.preloadKimiAgent],
    ['detects-bridge-protocol', c.found.bridgeProtocol],
    ['hbp-rows-only', emitSurfaceRows({ classification: c }).every((row) => row.endsWith('|json=0') && !row.includes('\n'))],
    ['channels-extract', extractBridgeChannels('GET_WORKSPACE_ROOT INSTALL_SKILL OPEN_AS_TEXT').length === 3],
    ['detects-exec-substrate', classifyExecSubstrate({ daimonBundle: { present: true, size: 527 } }).daimonBundle.present
      && classifyExecSubstrate({ daimonBundle: { present: true, size: 527 } }).gatewayAsar.present === false],
    ['exec-row-emitted', emitSurfaceRows({ classification: c, execSubstrate: classifyExecSubstrate({ daimonBundle: { present: true, size: 5 } }) })
      .some((row) => row.startsWith('KIMISURFACEEXEC|') && row.includes('daimon_bundle_present=1'))],
  ].map(([name, ok]) => ({ name, ok: Boolean(ok) }));
  return { ok: checks.every((c) => c.ok), checks };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const mode = process.argv[2] || 'scan';
  if (mode === 'self-test') {
    const result = selfTest();
    for (const c of result.checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
    process.exit(result.ok ? 0 : 1);
  }
  const scan = scanKimiInstall();
  for (const row of emitSurfaceRows(scan)) console.log(row);
}
