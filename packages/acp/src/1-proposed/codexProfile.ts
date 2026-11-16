import type { AgentProfile } from '../types/run.ts';

/** What `codexProfile` lets the caller change. */
export interface CodexProfileOptions {
  /** The command that starts Codex's ACP adapter. Defaults to `codex-acp` on `PATH`. */
  readonly command?: string;
}

/**
 * Returns the profile for OpenAI's Codex, through the `@agentclientprotocol/codex-acp` adapter, in its `read-only`
 * mode, in which a write or a command needs approval. Unverified: The profile follows the adapter's documentation
 * and has not been run, and it does not isolate the session from the user's Codex configuration. The adapter's
 * open issues report tool calls that run before permission mediation (agentclientprotocol/codex-acp#401) and
 * subagents that cannot call session tool servers (agentclientprotocol/codex-acp#761). The profile cannot identify
 * a call of a tool on an MCP server, since how the adapter names one has not been verified.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export function codexProfile(options: CodexProfileOptions = {}): AgentProfile {
  return {
    command: options.command ?? 'codex-acp',
    permissionModeId: 'read-only',
  };
}
