import type { McpCapabilities } from '@agentclientprotocol/sdk/unstable';

/** An MCP transport over which the client can serve the app's tools. */
export type McpTransport = 'acp' | 'http' | 'stdio';

/**
 * Returns the transport over which to serve the app's tools: ACP when the agent advertises it, then HTTP, and
 * otherwise stdio, which every agent must accept.
 *
 * @internal
 */
export function selectMcpTransport(capabilities: McpCapabilities | null | undefined): McpTransport {
  if (capabilities?.acp === true) return 'acp';
  if (capabilities?.http === true) return 'http';
  return 'stdio';
}
