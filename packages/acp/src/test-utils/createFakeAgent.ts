import {
  agent,
  type AgentApp,
  type AuthMethod,
  type HasConnectionContext,
  isMcpServerAcp,
  type McpCapabilities,
  McpOverAcpCaller,
  type McpServer as McpServerDeclaration,
  methods,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionModeState,
  type SessionUpdate,
  type StopReason,
  type Usage,
} from '@agentclientprotocol/sdk/unstable';
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client';
import { getDefaultEnvironment, StdioClientTransport } from '@modelcontextprotocol/client/stdio';

/** How a fake agent answers each request of a run. Every field is optional, and the defaults make a run succeed. */
export interface FakeAgentConfig {
  /** Leaves `initialize` unanswered, as a command that does not speak ACP does. */
  readonly holdInitialize?: boolean;
  /** The version that `initialize` answers. Defaults to the SDK's v1. */
  readonly protocolVersion?: number;
  readonly authMethods?: readonly AuthMethod[];
  readonly failAuthenticate?: boolean;
  readonly advertiseSystemPrompt?: boolean;
  /** Returned from `initialize` as the agent's MCP capabilities. */
  readonly mcpCapabilities?: McpCapabilities;
  /**
   * The tool to call, without arguments, on the first MCP server that `session/new` declared, once the prompt
   * arrives and before the configured updates. The text of its result is sent as an `agent_message_chunk`.
   */
  readonly callTool?: { readonly name: string };
  /** Returned from `session/new` as given; a later `session/set_mode` is recorded and does not change it. */
  readonly modes?: SessionModeState;
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
  let declaredServers: readonly McpServerDeclaration[] = [];
  const mcpCaller = new McpOverAcpCaller({ clientInfo: { name: 'fake-agent', version: '1.0.0' } });

  const app = agent({ name: 'fake-agent' })
    .onRequest(methods.agent.initialize, async ({ params }) => {
      received.push({ method: methods.agent.initialize, params });
      if (config.holdInitialize === true) await new Promise<never>(() => {});
      return {
        protocolVersion: config.protocolVersion ?? PROTOCOL_VERSION,
        agentCapabilities: {
          ...(config.advertiseSystemPrompt === true && { sessionCapabilities: { systemPrompt: {} } }),
          ...(config.mcpCapabilities !== undefined && { mcpCapabilities: config.mcpCapabilities }),
        },
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
      declaredServers = params.mcpServers;
      return { sessionId: 'fake-session', ...(config.modes !== undefined && { modes: config.modes }) };
    })
    .onRequest(methods.agent.session.setMode, ({ params }) => {
      received.push({ method: methods.agent.session.setMode, params });
      return {};
    })
    .onNotification(methods.agent.session.cancel, ({ params }) => {
      received.push({ method: methods.agent.session.cancel, params });
      cancel.resolve(undefined);
    })
    .onRequest(methods.agent.session.prompt, async ({ params, client }) => {
      received.push({ method: methods.agent.session.prompt, params });
      cancel = Promise.withResolvers<undefined>();
      const { sessionId } = params;

      if (config.callTool !== undefined) {
        const text = await callDeclaredTool(declaredServers[0], config.callTool.name, client, mcpCaller);
        await client.notify(methods.client.session.update, {
          sessionId,
          update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text } },
        });
      }

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
    })
    .onNotification(methods.agent.mcp.message, mcpCaller.handleNotification);

  return { agent: app, received };
}

// region | Helpers
/** Calls `toolName` on a declared server through the server's transport, and returns its result's text. */
async function callDeclaredTool(
  server: McpServerDeclaration | undefined,
  toolName: string,
  client: HasConnectionContext,
  mcpCaller: McpOverAcpCaller,
): Promise<string> {
  if (server === undefined) throw new Error('The session declared no MCP server.');
  if (isMcpServerAcp(server)) {
    const outcome = await mcpCaller.request(client, server.serverId, 'tools/call', { name: toolName, arguments: {} });
    if (!('result' in outcome)) throw new Error(`The tool call failed: ${outcome.error.message}`);
    return readResultText(outcome.result);
  }

  const mcpClient = new Client({ name: 'fake-agent', version: '1.0.0' });
  const transport =
    'command' in server
      ? new StdioClientTransport({
          command: server.command,
          args: server.args,
          env: {
            ...getDefaultEnvironment(),
            ...Object.fromEntries(server.env.map(({ name, value }) => [name, value])),
          },
        })
      : new StreamableHTTPClientTransport(new URL(server.url), {
          requestInit: { headers: Object.fromEntries(server.headers.map(({ name, value }) => [name, value])) },
        });
  await mcpClient.connect(transport);
  try {
    return readResultText(await mcpClient.callTool({ name: toolName, arguments: {} }));
  } finally {
    await mcpClient.close();
  }
}

/** Joins the text blocks of a tool result. */
function readResultText(result: unknown): string {
  if (typeof result !== 'object' || result === null || !('content' in result) || !Array.isArray(result.content)) {
    throw new Error('The tool result has no content.');
  }
  return result.content
    .map((block: unknown) =>
      typeof block === 'object' && block !== null && 'text' in block && typeof block.text === 'string'
        ? block.text
        : '',
    )
    .join('');
}
// endregion | Helpers
