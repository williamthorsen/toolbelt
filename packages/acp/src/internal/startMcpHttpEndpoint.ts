import { randomBytes, timingSafeEqual } from 'node:crypto';
import { createServer as createHttpServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import { createMcpHandler, type McpHttpHandler, type McpServerFactory } from '@modelcontextprotocol/server';

/** A loopback HTTP endpoint that serves an MCP server to the holder of its token, closed on disposal. */
export interface McpHttpEndpoint extends AsyncDisposable {
  readonly url: string;
  readonly token: string;
}

const LOOPBACK_ADDRESS = '127.0.0.1';

/**
 * Serves `createServer` through `createMcpHandler` on `127.0.0.1` at an ephemeral port. A request is answered
 * only when its `Host` names that address and port and its `Authorization` header carries the endpoint's bearer
 * token; the `Host` check refuses a DNS-rebinding page, which can reach a loopback port but cannot set the header.
 *
 * @internal
 */
export async function startMcpHttpEndpoint(createServer: McpServerFactory): Promise<McpHttpEndpoint> {
  const token = randomBytes(32).toString('base64url');
  const expectedAuthorization = Buffer.from(`Bearer ${token}`);
  const handler = createMcpHandler(createServer);
  const server = createHttpServer((request, response) => {
    void serveRequest(request, response, { expectedAuthorization, expectedHost, handler });
  });

  const { promise: listening, resolve, reject } = Promise.withResolvers<undefined>();
  server.once('error', reject);
  server.listen(0, LOOPBACK_ADDRESS, () => {
    resolve(undefined);
  });
  try {
    await listening;
  } catch (error) {
    await handler.close();
    throw error;
  }
  server.off('error', reject);

  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('The MCP endpoint has no TCP address.');
  const expectedHost = `${LOOPBACK_ADDRESS}:${address.port}`;

  return {
    url: `http://${expectedHost}/mcp`,
    token,
    async [Symbol.asyncDispose]() {
      const { promise: closed, resolve: resolveClosed } = Promise.withResolvers<undefined>();
      server.close(() => {
        resolveClosed(undefined);
      });
      server.closeAllConnections();
      await closed;
      await handler.close();
    },
  };
}

// region | Helpers
/** What `serveRequest` checks a request against, and the handler that answers it. */
interface ServeContext {
  readonly expectedAuthorization: Buffer;
  readonly expectedHost: string;
  readonly handler: McpHttpHandler;
}

/** Reports whether the request's `Authorization` header equals the expected one, in constant time. */
function hasExpectedAuthorization(request: IncomingMessage, expected: Buffer): boolean {
  const authorization = Buffer.from(request.headers.authorization ?? '');
  return authorization.length === expected.length && timingSafeEqual(authorization, expected);
}

/** Converts a Node request into a fetch `Request` whose signal aborts when the client's socket closes. */
function readFetchRequest(request: IncomingMessage, response: ServerResponse, host: string): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (value === undefined) continue;
    const items = Array.isArray(value) ? value : [value];
    for (const item of items) headers.append(name, item);
  }

  const aborted = new AbortController();
  response.once('close', () => {
    if (!response.writableFinished) aborted.abort();
  });

  const method = request.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(`http://${host}${request.url ?? '/'}`, {
    method,
    headers,
    signal: aborted.signal,
    ...(hasBody && { body: Readable.toWeb(request), duplex: 'half' }),
  });
}

/** Checks the request's host and token, then answers it through the MCP handler, streaming the response. */
async function serveRequest(request: IncomingMessage, response: ServerResponse, context: ServeContext): Promise<void> {
  if (request.headers.host !== context.expectedHost) {
    response.writeHead(421).end();
    return;
  }
  if (!hasExpectedAuthorization(request, context.expectedAuthorization)) {
    response.writeHead(401, { 'WWW-Authenticate': 'Bearer' }).end();
    return;
  }

  try {
    const answer = await context.handler.fetch(readFetchRequest(request, response, context.expectedHost));
    response.writeHead(answer.status, Array.from(answer.headers).flat());
    if (answer.body === null) {
      response.end();
      return;
    }
    await pipeline(Readable.fromWeb(answer.body), response);
  } catch {
    if (response.headersSent) response.destroy();
    else response.writeHead(500).end();
  }
}
// endregion | Helpers
