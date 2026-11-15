import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { Client } from '@modelcontextprotocol/client';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio';
import { describe, expect, it } from 'vitest';

import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import { BRIDGE_TOKEN_VARIABLE, BRIDGE_URL_VARIABLE, bridgeModuleUrl } from '../mcpStdioBridge.ts';
import { startMcpHttpEndpoint } from '../startMcpHttpEndpoint.ts';

const BRIDGE_PATH = fileURLToPath(bridgeModuleUrl);

describe('the MCP stdio bridge process', () => {
  it("serves the endpoint's tools to an MCP client over stdio", async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(
      new StdioClientTransport({
        command: process.execPath,
        args: [BRIDGE_PATH],
        env: {
          ...getDefaultEnvironment(),
          [BRIDGE_URL_VARIABLE]: endpoint.url,
          [BRIDGE_TOKEN_VARIABLE]: endpoint.token,
        },
      }),
    );

    const { tools } = await client.listTools();
    const result = await client.callTool({ name: GREETING_TOOL_NAME, arguments: {} });
    await client.close();

    expect(tools.map(({ name }) => name)).toStrictEqual([GREETING_TOOL_NAME]);
    expect(result.content).toStrictEqual([{ type: 'text', text: GREETING_TEXT }]);
  });

  it('exits once its stdin closes', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const exit = await runBridgeProcess({
      [BRIDGE_URL_VARIABLE]: endpoint.url,
      [BRIDGE_TOKEN_VARIABLE]: endpoint.token,
    });

    expect(exit).toStrictEqual({ code: 0, stderr: '' });
  });

  it('exits 2 and names the variable when one is missing', async () => {
    const exit = await runBridgeProcess({ [BRIDGE_URL_VARIABLE]: 'http://127.0.0.1:1/mcp' });

    expect(exit.code).toBe(2);
    expect(exit.stderr).toContain(BRIDGE_TOKEN_VARIABLE);
  });
});

// region | Helpers
/** Starts the bridge with `variables` added to the environment, closes its stdin, and reports how it exited. */
async function runBridgeProcess(
  variables: Readonly<Record<string, string>>,
): Promise<{ readonly code: number | null; readonly stderr: string }> {
  const bridgeVariables = new Set([BRIDGE_URL_VARIABLE, BRIDGE_TOKEN_VARIABLE]);
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !bridgeVariables.has(name)));
  const child = spawn(process.execPath, [BRIDGE_PATH], { env: { ...env, ...variables }, stdio: 'pipe' });
  let stderr = '';
  child.stderr.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });
  const { promise, resolve } = Promise.withResolvers<number | null>();
  child.once('close', resolve);
  child.stdin.end();
  return { code: await promise, stderr };
}
// endregion | Helpers
