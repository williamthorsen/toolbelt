import { describe, expect, it } from 'vitest';

import { createFakeAgent, findParams, type ReceivedMessage } from '../../test-utils/createFakeAgent.ts';
import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import { OPTIONS, TEXT_UPDATE } from '../../test-utils/runAcpPromptFixtures.ts';
import type { RunEvent, RunPromptOptions } from '../../types/run.ts';
import { BRIDGE_TOKEN_VARIABLE, BRIDGE_URL_VARIABLE } from '../mcpStdioBridge.ts';
import { runAcpPrompt } from '../runAcpPrompt.ts';

const TOOL_OPTIONS: RunPromptOptions = { ...OPTIONS, tools: { name: 'app', createServer: createGreetingToolServer() } };

const GREETING_UPDATE: RunEvent = {
  type: 'update',
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: GREETING_TEXT } },
};

describe(runAcpPrompt, () => {
  describe('tools', () => {
    it('serves the tools over the ACP connection when the agent advertises MCP over ACP', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { acp: true, http: true },
        callTool: { name: GREETING_TOOL_NAME },
      });

      const events = await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      expect(events).toContainEqual(GREETING_UPDATE);
      expect(findDeclaredServer(received)).toMatchObject({ type: 'acp', name: 'app' });
    });

    it('serves the tools from a loopback HTTP endpoint when the agent advertises HTTP', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { http: true },
        callTool: { name: GREETING_TOOL_NAME },
      });

      const events = await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      expect(events).toContainEqual(GREETING_UPDATE);
      const server = findDeclaredServer(received);
      expect(server).toMatchObject({ type: 'http', name: 'app', headers: [{ name: 'Authorization' }] });
      expect(new URL(readDeclaredUrl(server)).hostname).toBe('127.0.0.1');
    });

    it('declares the stdio bridge, run with this Node, when the agent advertises neither', async () => {
      const { agent, received } = createFakeAgent({ mcpCapabilities: { sse: true } });

      await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      const server = findDeclaredServer(received);
      expect(server).toMatchObject({
        name: 'app',
        command: process.execPath,
        args: [expect.stringMatching(/mcpStdioBridge\.ts$/)],
      });
      expect(readEnvNames(server)).toStrictEqual([BRIDGE_URL_VARIABLE, BRIDGE_TOKEN_VARIABLE]);
    });

    it('stops the HTTP endpoint when the run ends', async () => {
      const { agent, received } = createFakeAgent({ mcpCapabilities: { http: true } });

      await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      await expect(fetch(readDeclaredUrl(findDeclaredServer(received)), { method: 'POST' })).rejects.toThrow(
        'fetch failed',
      );
    });

    it('stops the HTTP endpoint when the consumer stops iterating', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { http: true },
        updates: [TEXT_UPDATE],
        holdUntilCancel: true,
      });

      for await (const event of runAcpPrompt(agent, TOOL_OPTIONS)) {
        if (event.type === 'update') break;
      }

      await expect(fetch(readDeclaredUrl(findDeclaredServer(received)), { method: 'POST' })).rejects.toThrow(
        'fetch failed',
      );
    });
  });
});

// region | Helpers
/** Returns the one MCP server that the session declared. */
function findDeclaredServer(received: readonly ReceivedMessage[]): unknown {
  const params = findParams(received, 'session/new');
  if (typeof params !== 'object' || params === null || !('mcpServers' in params) || !Array.isArray(params.mcpServers)) {
    throw new Error('The session declared no MCP servers.');
  }
  expect(params.mcpServers).toHaveLength(1);
  return params.mcpServers[0];
}

/** Returns a declared HTTP server's URL. */
function readDeclaredUrl(server: unknown): string {
  if (typeof server !== 'object' || server === null || !('url' in server) || typeof server.url !== 'string') {
    throw new Error('The declared server has no URL.');
  }
  return server.url;
}

/** Returns the names of a declared stdio server's environment variables. */
function readEnvNames(server: unknown): unknown[] {
  if (typeof server !== 'object' || server === null || !('env' in server) || !Array.isArray(server.env)) {
    throw new Error('The declared server has no environment.');
  }
  return server.env.map((variable: unknown) =>
    typeof variable === 'object' && variable !== null && 'name' in variable ? variable.name : undefined,
  );
}
// endregion | Helpers
