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
 * slash commands stay listed.
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
  };
}
