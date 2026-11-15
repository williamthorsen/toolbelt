import {
  agent,
  type AgentApp,
  type AuthMethod,
  methods,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionUpdate,
  type StopReason,
  type Usage,
} from '@agentclientprotocol/sdk/unstable';

/** How a fake agent answers each request of a run. Every field is optional, and the defaults make a run succeed. */
export interface FakeAgentConfig {
  /** Leaves `initialize` unanswered, as a command that does not speak ACP does. */
  readonly holdInitialize?: boolean;
  /** The version that `initialize` answers. Defaults to the SDK's v1. */
  readonly protocolVersion?: number;
  readonly authMethods?: readonly AuthMethod[];
  readonly failAuthenticate?: boolean;
  readonly advertiseSystemPrompt?: boolean;
  /** Sent in order once the prompt arrives. */
  readonly updates?: readonly SessionUpdate[];
  /** Raised after the updates, or, with `holdUntilCancel`, after `session/cancel` arrives. */
  readonly permissionRequest?: Omit<RequestPermissionRequest, 'sessionId'>;
  /** Keeps the turn open until `session/cancel` arrives, then stops with `cancelled`. */
  readonly holdUntilCancel?: boolean;
  /** Keeps the turn open forever, `session/cancel` included. */
  readonly ignoreCancel?: boolean;
  readonly stopReason?: StopReason;
  readonly usage?: Usage;
  /** Process form only: writes `stderr` and exits with `code` before reading any message. */
  readonly exitBeforeInitialize?: { readonly stderr: string; readonly code: number };
  /** Process form only: the file to which the process writes its pid. */
  readonly pidFile?: string;
}

/** A request or notification that the fake agent received, or its permission request's answer. */
export interface ReceivedMessage {
  readonly method: string;
  readonly params: unknown;
}

/** Creates an ACP agent that answers per `config` and records what it receives. */
export function createFakeAgent(config: FakeAgentConfig = {}): { agent: AgentApp; received: ReceivedMessage[] } {
  const received: ReceivedMessage[] = [];
  let cancel = Promise.withResolvers<undefined>();

  const app = agent({ name: 'fake-agent' })
    .onRequest(methods.agent.initialize, async ({ params }) => {
      received.push({ method: methods.agent.initialize, params });
      if (config.holdInitialize === true) await new Promise<never>(() => {});
      return {
        protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
        agentCapabilities: config.advertiseSystemPrompt === true ? { sessionCapabilities: { systemPrompt: {} } } : {},
        authMethods: [...(config.authMethods ?? [])],
      };
    })
    .onRequest(methods.agent.authenticate, ({ params }) => {
      received.push({ method: methods.agent.authenticate, params });
      if (config.failAuthenticate === true) throw new Error('authentication refused');
      return {};
    })
    .onRequest(methods.agent.session.new, ({ params }) => {
      received.push({ method: methods.agent.session.new, params });
      return { sessionId: 'fake-session' };
    })
    .onNotification(methods.agent.session.cancel, ({ params }) => {
      received.push({ method: methods.agent.session.cancel, params });
      cancel.resolve(undefined);
    })
    .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
      received.push({ method: methods.agent.session.prompt, params });
      cancel = Promise.withResolvers<undefined>();
      const { sessionId } = params;

      const updates = config.updates ?? [];
      for (const update of updates) {
        await client.notify(methods.client.session.update, { sessionId, update });
      }

      /** Raises the configured permission request and records the client's answer. */
      async function requestPermission(): Promise<void> {
        if (config.permissionRequest === undefined) return;
        const response: RequestPermissionResponse = await client.request(methods.client.session.requestPermission, {
          ...config.permissionRequest,
          sessionId,
        });
        received.push({ method: methods.client.session.requestPermission, params: response });
      }

      if (config.ignoreCancel === true) {
        await new Promise<never>(() => {});
      }
      if (config.holdUntilCancel === true) {
        await cancel.promise;
        await requestPermission();
        return { stopReason: 'cancelled' };
      }

      await requestPermission();
      return {
        stopReason: config.stopReason ?? 'end_turn',
        ...(config.usage !== undefined && { usage: config.usage }),
      };
    });

  return { agent: app, received };
}
