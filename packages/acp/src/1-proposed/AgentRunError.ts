import { describeError } from '@williamthorsen/toolbelt.errors';

/** What `AgentRunError` records about the failed agent. */
export interface AgentRunErrorDetails {
  readonly command: string;
  /** The exit code, when the agent exited on its own before the run failed. */
  readonly exitCode?: number | undefined;
  /** The signal that ended the agent, when one did before the run failed. */
  readonly signal?: NodeJS.Signals | undefined;
  /** The end of the agent's stderr. */
  readonly stderrTail: string;
}

/**
 * The error that `runPrompt` rejects with when the agent cannot be started, breaks the protocol, or exits during
 * the run. `cause` holds the underlying error: a spawn error whose `code` names the system error, such as
 * `ENOENT` for a command that is not installed, or the SDK's `RequestError`, whose `code` is the JSON-RPC error
 * code that the agent answered with.
 *
 * @category ACP
 * @stage proposed
 * @experimental
 */
export class AgentRunError extends Error {
  override readonly name = 'AgentRunError';
  readonly command: string;
  readonly exitCode: number | undefined;
  readonly signal: NodeJS.Signals | undefined;
  readonly stderrTail: string;

  constructor(details: AgentRunErrorDetails, options: { readonly cause: unknown }) {
    super(buildMessage(details, options.cause), options);
    this.command = details.command;
    this.exitCode = details.exitCode;
    this.signal = details.signal;
    this.stderrTail = details.stderrTail;
  }
}

// region | Helpers
/** Builds the message, naming the command and how it ended, and quoting the end of its stderr. */
function buildMessage({ command, exitCode, signal, stderrTail }: AgentRunErrorDetails, cause: unknown): string {
  const exitDetail =
    exitCode === undefined ? (signal === undefined ? '' : ` (killed by ${signal})`) : ` (exited ${exitCode})`;
  const lines = [`The agent \`${command}\` failed${exitDetail}: ${describeError(cause)}`];
  const trimmed = stderrTail.trim();
  if (trimmed !== '') lines.push(`Its stderr ended with:\n${trimmed}`);
  return lines.join('\n');
}
// endregion | Helpers
