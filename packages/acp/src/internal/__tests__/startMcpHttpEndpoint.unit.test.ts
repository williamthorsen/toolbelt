import { request as httpRequest } from 'node:http';

import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { describe, expect, it } from 'vitest';

import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import { startMcpHttpEndpoint } from '../startMcpHttpEndpoint.ts';

describe(startMcpHttpEndpoint, () => {
  it('serves the tools to a client that sends the bearer token', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());
    const client = new Client({ name: 'test-client', version: '1.0.0' });
    await client.connect(
      new StreamableHTTPClientTransport(new URL(endpoint.url), {
        requestInit: { headers: { Authorization: `Bearer ${endpoint.token}` } },
      }),
    );

    const { tools } = await client.listTools();
    const result = await client.callTool({ name: GREETING_TOOL_NAME, arguments: {} });
    await client.close();

    expect(tools.map(({ name }) => name)).toStrictEqual([GREETING_TOOL_NAME]);
    expect(result.content).toStrictEqual([{ type: 'text', text: GREETING_TEXT }]);
  });

  it('listens on the loopback address only', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    expect(new URL(endpoint.url).hostname).toBe('127.0.0.1');
  });

  it('refuses a request without the token', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const response = await fetch(endpoint.url, { method: 'POST', body: '{}' });

    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
  });

  it('refuses a request with a wrong token', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${endpoint.token.slice(1)}x` },
      body: '{}',
    });

    expect(response.status).toBe(401);
  });

  it('refuses a request whose host is not the endpoint, even with the token', async () => {
    await using endpoint = await startMcpHttpEndpoint(createGreetingToolServer());

    const status = await postWithHost(endpoint.url, 'attacker.example', endpoint.token);

    expect(status).toBe(421);
  });

  it('stops listening once disposed', async () => {
    const endpoint = await startMcpHttpEndpoint(createGreetingToolServer());
    await endpoint[Symbol.asyncDispose]();

    await expect(fetch(endpoint.url, { method: 'POST', body: '{}' })).rejects.toThrow('fetch failed');
  });
});

// region | Helpers
/** Posts an empty body to `url` with an explicit `Host` header, which `fetch` does not let a caller set. */
async function postWithHost(url: string, host: string, token: string): Promise<number | undefined> {
  const { promise, resolve, reject } = Promise.withResolvers<number | undefined>();
  const outgoing = httpRequest(url, { method: 'POST', headers: { Host: host, Authorization: `Bearer ${token}` } });
  outgoing.once('response', (response) => {
    response.resume();
    resolve(response.statusCode);
  });
  outgoing.once('error', reject);
  outgoing.end('{}');
  return promise;
}
// endregion | Helpers
