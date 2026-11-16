import type { RequestPermissionRequest } from '@agentclientprotocol/sdk/unstable';

import type { AgentProfile } from '../types/run.ts';

/** What `claudeCodeProfile` lets the caller change. */
export interface ClaudeCodeProfileOptions {
  /** The command that starts Claude's ACP adapter. Defaults to `claude-agent-acp` on `PATH`. */
  readonly command?: string;
  /** The model for the session, such as `sonnet`. Without one, the adapter chooses. */
  readonly model?: string;
}

/**
 * Returns the profile for Claude Code, through the `@agentclientprotocol/claude-agent-acp` adapter, which signs in
 * with the Claude Code CLI's own login. The session loads none of the user's settings, skills, hooks, or MCP
 * servers, has no built-in tools, and runs in the `default` mode, in which every tool call asks. The account's own
 * slash commands stay listed. A call of a tool on an MCP server is identified by the server's name, which the
 * adapter sends in the request's tool-call metadata.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export function claudeCodeProfile(options: ClaudeCodeProfileOptions = {}): AgentProfile {
  return {
    command: options.command ?? 'claude-agent-acp',
    permissionModeId: 'default',
    sessionMeta: {
      claudeCode: {
        options: {
          settingSources: [],
          tools: [],
          strictMcpConfig: true,
          ...(options.model !== undefined && { model: options.model }),
        },
      },
    },
    isToolServerCall: isClaudeToolServerCall,
  };
}

// region | Helpers
/** Reports whether the adapter's metadata for the request's tool call names `serverName` as its MCP server. */
function isClaudeToolServerCall({ toolCall }: RequestPermissionRequest, serverName: string): boolean {
  let value: unknown = toolCall._meta;
  for (const key of ['claudeCode', 'mcpServer', 'name']) value = readOwnProperty(value, key);
  return value === serverName;
}

/** Returns the own property `key` of `value`, or nothing when `value` is not an object or does not have it. */
function readOwnProperty(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Object.getOwnPropertyDescriptor(value, key)?.value : undefined;
}
// endregion | Helpers
