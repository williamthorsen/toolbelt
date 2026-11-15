import type { Cost, SessionUpdate, StopReason, Usage } from '@agentclientprotocol/sdk/unstable';

/** The command that starts an agent harness as an ACP agent, and the sign-in method that it is given. */
export interface AgentProfile {
  readonly command: string;
  readonly args?: readonly string[];
  /** Variables set over the parent process's environment. */
  readonly env?: Readonly<Record<string, string>>;
  /** The method to authenticate with, used only when the agent lists it. */
  readonly authMethodId?: string;
}

/** What `runPrompt` runs, and where. */
export interface RunPromptOptions {
  readonly agent: AgentProfile;
  /** An absolute path, used as the agent's working directory and the session's. */
  readonly cwd: string;
  readonly prompt: string;
  /** Sent as the session's system prompt when the agent supports one, and ahead of the prompt otherwise. */
  readonly instructions?: string;
  /** Cancels the turn once the prompt is sent, and abandons the run before that. */
  readonly signal?: AbortSignal;
}

/** An update that the agent sent during the turn, or the turn's end, which is always the last event. */
export type RunEvent =
  | { readonly type: 'update'; readonly update: SessionUpdate }
  | {
      readonly type: 'stopped';
      readonly stopReason: StopReason;
      /** Token counts, when the agent reports them. */
      readonly usage?: Usage;
      /** The cost of the session's last `usage_update`, when the agent reports one. */
      readonly cost?: Cost;
    };
