import { homedir } from 'node:os';
import path from 'node:path';

import type { RequestPermissionRequest } from '@agentclientprotocol/sdk/unstable';

import type { AgentProfile } from '../types/run.ts';

/** What `antigravityProfile` lets the caller change. */
export interface AntigravityProfileOptions {
  /** The command that starts the Antigravity CLI. Defaults to `agy` on `PATH`. */
  readonly command?: string;
  /**
   * The absolute path of the directory from which the CLI reads its configuration in place of `~/.gemini`, and to
   * which it writes its session state. Defaults to `~/.cache/toolbelt.acp/antigravity`, which the CLI creates.
   */
  readonly geminiDir?: string;
}

/**
 * Returns the profile for Google's Antigravity CLI, which signs in with the CLI's cached personal Google login.
 * The session reads its configuration from a directory of its own, so none of the user's hooks, plugins, or MCP
 * servers load, and runs in the `default` mode, in which a command asks and a file read does not. The CLI's
 * built-in tools and commands cannot be turned off. A call of a tool on an MCP server is identified by its title,
 * `Run mcp_<server>_<tool>`, which does not separate the server's name from the tool's: A call on a server whose
 * name extends the given one with `_` is identified as a call on the given server. Only a configuration in a
 * `geminiDir` of the caller's can declare such a server.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export function antigravityProfile(options: AntigravityProfileOptions = {}): AgentProfile {
  return {
    command: options.command ?? 'agy',
    args: ['acp', '--gemini-dir', options.geminiDir ?? path.join(homedir(), '.cache', 'toolbelt.acp', 'antigravity')],
    authMethodId: 'oauth-personal',
    permissionModeId: 'default',
    isToolServerCall: isAntigravityToolServerCall,
  };
}

// region | Helpers
/** Reports whether the request's tool call is titled as a call of a tool on the MCP server named `serverName`. */
function isAntigravityToolServerCall({ toolCall }: RequestPermissionRequest, serverName: string): boolean {
  const prefix = `Run mcp_${serverName}_`;
  const { title } = toolCall;
  return typeof title === 'string' && title.length > prefix.length && title.startsWith(prefix);
}
// endregion | Helpers
