import path from 'node:path';
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

  const bridgePath = transport === 'stdio' ? resolveBridgePath(bridgeModuleUrl) : undefined;
  const endpoint = await startMcpHttpEndpoint(tools.createServer);
  const declaration: McpServerDeclaration =
    bridgePath === undefined
      ? {
          type: 'http',
          name: tools.name,
          url: endpoint.url,
          headers: [{ name: 'Authorization', value: `Bearer ${endpoint.token}` }],
        }
      : {
          name: tools.name,
          command: process.execPath,
          args: [bridgePath],
          env: [
            { name: BRIDGE_URL_VARIABLE, value: endpoint.url },
            { name: BRIDGE_TOKEN_VARIABLE, value: endpoint.token },
          ],
        };
  return { mcpServers: [declaration], [Symbol.asyncDispose]: () => endpoint[Symbol.asyncDispose]() };
}

/**
 * Returns the path of the stdio bridge module that `moduleUrl` names. Throws when the URL names another module,
 * as it does when a bundler has inlined the package into an app, since the agent could not run the bridge then.
 *
 * @internal
 */
export function resolveBridgePath(moduleUrl: string): string {
  const bridgePath = fileURLToPath(moduleUrl);
  if (!/^mcpStdioBridge\.[cm]?[jt]s$/.test(path.basename(bridgePath))) {
    throw new Error(
      `The MCP stdio bridge resolves to ${bridgePath}, which is not the bridge module. Leave @williamthorsen/toolbelt.acp external to the app's bundle.`,
    );
  }
  return bridgePath;
}
