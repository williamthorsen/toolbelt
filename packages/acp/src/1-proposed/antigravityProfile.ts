import { tmpdir } from 'node:os';
import path from 'node:path';

import type { AgentProfile } from '../types/run.ts';

/** What `antigravityProfile` lets the caller change. */
export interface AntigravityProfileOptions {
  /** The command that starts the Antigravity CLI. Defaults to `agy` on `PATH`. */
  readonly command?: string;
  /**
   * The absolute path of the directory from which the CLI reads its configuration in place of `~/.gemini`, and to
   * which it writes its session state. Defaults to `toolbelt.acp-antigravity` in the system's temporary directory.
   */
  readonly geminiDir?: string;
}

/**
 * Returns the profile for Google's Antigravity CLI, which signs in with the CLI's cached personal Google login.
 * The session reads its configuration from a directory of its own, so none of the user's hooks, plugins, or MCP
 * servers load, and runs in the `default` mode, in which every tool call asks. The CLI's built-in tools and
 * commands cannot be turned off.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export function antigravityProfile(options: AntigravityProfileOptions = {}): AgentProfile {
  return {
    command: options.command ?? 'agy',
    args: ['acp', '--gemini-dir', options.geminiDir ?? path.join(tmpdir(), 'toolbelt.acp-antigravity')],
    authMethodId: 'oauth-personal',
    permissionModeId: 'default',
  };
}
