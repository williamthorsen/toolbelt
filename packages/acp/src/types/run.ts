import type {
  Cost,
  RequestPermissionRequest,
  SessionUpdate,
  StopReason,
  Usage,
} from '@agentclientprotocol/sdk/unstable';

/**
 * The command that starts an agent harness as an ACP agent, the sign-in method that it is given, and the
 * permission mode in which its session runs.
 */
export interface AgentProfile {
  readonly command: string;
  readonly args?: readonly string[];
  /** Variables set over the parent process's environment. */
  readonly env?: Readonly<Record<string, string>>;
  /** The method to authenticate with, used only when the agent lists it. */
  readonly authMethodId?: string;
  /**
   * The session mode in which the harness asks before it runs a tool. The run fails before the prompt is sent
   * when the session does not list it. Without one, the session stays in the mode that the harness chose, which
   * can be a mode of the user's own settings that runs tools without asking.
   */
  readonly permissionModeId?: string;
}

/** What a policy decides about one permission request. */
export type PermissionVerdict = 'allow' | 'reject';

/** What a policy is given beside the request. */
export interface PermissionPolicyContext {
  /** Aborts when the turn is cancelled or the run ends, after which the policy's answer is discarded. */
  readonly signal: AbortSignal;
}

/**
 * Decides one of the agent's permission requests. `'allow'` grants the request once, and any other result
 * refuses it once; the client never selects an option that makes the harness stop asking. A request whose
 * options cannot express the decision is answered as cancelled, which refuses it. A policy that throws cancels
 * the turn and fails the run.
 */
export type PermissionPolicy = (
  request: RequestPermissionRequest,
  context: PermissionPolicyContext,
) => PermissionVerdict | undefined | Promise<PermissionVerdict | undefined>;

/** What `runPrompt` runs, and where. */
export interface RunPromptOptions {
  readonly agent: AgentProfile;
  /** An absolute path, used as the agent's working directory and the session's. */
  readonly cwd: string;
  readonly prompt: string;
  /** Sent as the session's system prompt when the agent supports one, and ahead of the prompt otherwise. */
  readonly instructions?: string;
  /** Answers the agent's permission requests. Without one, every request is refused. */
  readonly permissionPolicy?: PermissionPolicy;
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
