import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import { runMcpStdioBridge } from '../mcpStdioBridge.ts';
import { startMcpHttpEndpoint } from '../startMcpHttpEndpoint.ts';

const LEGACY_INITIALIZE = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'test-client', version: '1.0.0' } },
};

describe(runMcpStdioBridge, () => {
  it('forwards a 2025-era session to the endpoint and writes each answer as a line', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const answers = await runBridge(endpoint, [
      LEGACY_INITIALIZE,
      { jsonrpc: '2.0', method: 'notifications/initialized' },
      { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: GREETING_TOOL_NAME, arguments: {} } },
    ]);

    expect(answers.map((answer) => readField(answer, 'id'))).toStrictEqual([1, 2]);
    expect(readField(readField(answers[1], 'result'), 'content')).toStrictEqual([
      { type: 'text', text: GREETING_TEXT },
    ]);
  });

  it('answers a line that is not JSON with a parse error and goes on', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const answers = await runBridge(endpoint, ['not json', LEGACY_INITIALIZE]);

    expect(answers[0]).toStrictEqual({ jsonrpc: '2.0', id: null, error: { code: -32_700, message: 'Parse error' } });
    expect(readField(answers[1], 'id')).toBe(1);
  });

  it('answers a request that the endpoint refuses without a JSON-RPC body with an internal error', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const answers = await runBridge({ url: endpoint.url, token: 'wrong' }, [LEGACY_INITIALIZE]);

    expect(answers).toStrictEqual([
      { jsonrpc: '2.0', id: 1, error: { code: -32_603, message: 'The MCP endpoint answered HTTP 401.' } },
    ]);
  });

  it('rejects when the endpoint cannot be reached', async () => {
    const endpoint = await startMcpHttpEndpoint(createGreetingToolServer());
    await endpoint[Symbol.asyncDispose]();

    await expect(runBridge(endpoint, [LEGACY_INITIALIZE])).rejects.toThrow('fetch failed');
  });
});

// region | Helpers
/** Runs the bridge over in-memory streams with `messages` as its input, and returns the messages that it wrote. */
async function runBridge(
  endpoint: { readonly url: string; readonly token: string },
  messages: readonly unknown[],
): Promise<unknown[]> {
  const input = new PassThrough();
  const output = new PassThrough();
  const written: string[] = [];
  output.on('data', (chunk: Buffer) => {
    written.push(chunk.toString('utf8'));
  });

  const running = runMcpStdioBridge({ input, output, url: endpoint.url, token: endpoint.token });
  for (const message of messages) input.write(`${typeof message === 'string' ? message : JSON.stringify(message)}\n`);
  input.end();
  await running;

  return written
    .join('')
    .split('\n')
    .filter((line) => line !== '')
    .map((line): unknown => JSON.parse(line));
}

/** Reads one field of a message that the test expects to be an object. */
function readField(value: unknown, field: string): unknown {
  if (typeof value !== 'object' || value === null) throw new Error(`Expected an object with "${field}".`);
  return Object.entries(value).find(([key]) => key === field)?.[1];
}
// endregion | Helpers
