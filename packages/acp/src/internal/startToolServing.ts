import { fileURLToPath } from 'node:url';

import { fromMcpServer } from '@agentclientprotocol/sdk/experimental/mcp-server';
import type {
  HasConnectionContext,
  McpCapabilities,
  McpOverAcpProvider,
  McpServer as McpServerDeclaration,
} from '@agentclientprotocol/sdk/unstable';

import type { ToolServer } from '../types/run.ts';
import { BRIDGE_TOKEN_VARIABLE, BRIDGE_URL_VARIABLE, bridgeModuleUrl } from './mcpStdioBridge.ts';
import { selectMcpTransport } from './selectMcpTransport.ts';
import { startMcpHttpEndpoint } from './startMcpHttpEndpoint.ts';

/** The `mcpServers` entries that a session declares, and the serving behind them, stopped on disposal. */
export interface ToolServing extends AsyncDisposable {
  readonly mcpServers: McpServerDeclaration[];
}

/** The ACP connection over which the client serves tools when the agent takes MCP over ACP. */
export interface AcpToolConnection {
  readonly context: HasConnectionContext;
  readonly provider: McpOverAcpProvider;
}

/**
 * Starts serving `tools` over the transport that `selectMcpTransport` picks from the agent's capabilities, and
 * returns the one `mcpServers` entry that declares it. Without tools, declares none and serves nothing.
 *
 * @internal
 */
export async function startToolServing(
  tools: ToolServer | undefined,
  capabilities: McpCapabilities | null | undefined,
  connection: AcpToolConnection,
): Promise<ToolServing> {
  if (tools === undefined) return { mcpServers: [], [Symbol.asyncDispose]: async () => {} };

  const transport = selectMcpTransport(capabilities);
  if (transport === 'acp') {
    const adapter = fromMcpServer(tools.createServer);
    const registration = connection.provider.registerServer(connection.context, {
      name: tools.name,
      handler: adapter.handler,
    });
    return {
      mcpServers: [registration.declaration],
      async [Symbol.asyncDispose]() {
        try {
          await registration.dispose();
        } finally {
          await adapter.close();
        }
      },
    };
  }

  const endpoint = await startMcpHttpEndpoint(tools.createServer);
  const declaration: McpServerDeclaration =
    transport === 'http'
      ? {
          type: 'http',
          name: tools.name,
          url: endpoint.url,
          headers: [{ name: 'Authorization', value: `Bearer ${endpoint.token}` }],
        }
      : {
          name: tools.name,
          command: process.execPath,
          args: [fileURLToPath(bridgeModuleUrl)],
          env: [
            { name: BRIDGE_URL_VARIABLE, value: endpoint.url },
            { name: BRIDGE_TOKEN_VARIABLE, value: endpoint.token },
          ],
        };
  return { mcpServers: [declaration], [Symbol.asyncDispose]: () => endpoint[Symbol.asyncDispose]() };
}
