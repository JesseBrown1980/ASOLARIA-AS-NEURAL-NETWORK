import assert from 'node:assert/strict';
import test from 'node:test';

import {
  classifyKimiSurface,
  emitSurfaceRows,
  extractBridgeChannels,
  selfTest,
  walkAsarPaths,
} from '../tools/behcs/kimi-desktop-surface-scan.mjs';

test('self-test passes', () => {
  assert.equal(selfTest().ok, true);
});

test('classifies Kimi agent surfaces from a synthetic file table', () => {
  const paths = [
    'node_modules/@agentclientprotocol/sdk/package.json',
    'node_modules/@kimi/proto/kimi/gateway/mcp/v1/mcp-MCPService_connectquery.ts',
    'node_modules/@kimi/proto/kimi/gateway/skill/v1/service-SkillService_connectquery.ts',
    'node_modules/@kimi/proto/agent/sandbox/v3/instance-SandboxService_connectquery.ts',
    'node_modules/@kimi/proto/webagent/v1/agent-AgentService_connectquery.ts',
    'out/preload/preload-kimi-agent.mjs',
    'out/preload/bridge-protocol-XYZ.mjs',
    'out/renderer/assets/AgentsView-abc.js',
    'out/renderer/assets/SkillsView-def.js',
  ];
  const c = classifyKimiSurface(paths);
  assert.equal(c.found.agentClientProtocol, true);
  assert.equal(c.found.mcpGateway, true);
  assert.equal(c.found.skillGateway, true);
  assert.equal(c.found.sandboxV3, true);
  assert.equal(c.found.webAgent, true);
  assert.equal(c.found.preloadKimiAgent, true);
  assert.equal(c.found.bridgeProtocol, true);
  assert.equal(c.found.agentsView, true);
  assert.equal(c.found.skillsView, true);
});

test('emits HBP rows without reading private stores or invoking Kimi actions', () => {
  const c = classifyKimiSurface(['node_modules/@agentclientprotocol/sdk/package.json']);
  const rows = emitSurfaceRows({ classification: c, appAsarPresent: true, webbridgePresent: true, webbridgeSize: 7 });
  assert.equal(rows.length, 5);
  assert.ok(rows.every((row) => row.endsWith('|json=0')));
  assert.ok(rows.join('\n').includes('no-token-read-no-private-chat-read-no-kimi-action'));
});

test('walkAsarPaths returns nested slash paths', () => {
  const paths = walkAsarPaths({ files: { a: { files: { b: { files: { 'c.js': { size: 1 } } } } } } });
  assert.deepEqual(paths, ['a', 'a/b', 'a/b/c.js']);
});

test('extractBridgeChannels recognizes explicit IPC capability names', () => {
  assert.deepEqual(extractBridgeChannels('GET_WORKSPACE_ROOT OPEN_AS_TEXT INSTALL_SKILL unknown'), [
    'GET_WORKSPACE_ROOT',
    'OPEN_AS_TEXT',
    'INSTALL_SKILL',
  ]);
});
