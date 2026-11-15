import type { SessionUpdate } from '@agentclientprotocol/sdk/unstable';
import { describe, expect, it } from 'vitest';

import { createFakeAgent, type FakeAgentConfig, type ReceivedMessage } from '../../test-utils/createFakeAgent.ts';
import {
  createGreetingToolServer,
  GREETING_TEXT,
  GREETING_TOOL_NAME,
} from '../../test-utils/createGreetingToolServer.ts';
import type { PermissionPolicy, RunEvent, RunPromptOptions } from '../../types/run.ts';
import { BRIDGE_TOKEN_VARIABLE, BRIDGE_URL_VARIABLE } from '../mcpStdioBridge.ts';
import { runAcpPrompt } from '../runAcpPrompt.ts';

const OPTIONS: RunPromptOptions = { agent: { command: 'unused' }, cwd: '/work', prompt: 'hello' };

const TOOL_OPTIONS: RunPromptOptions = { ...OPTIONS, tools: { name: 'app', createServer: createGreetingToolServer() } };

const GREETING_UPDATE: RunEvent = {
  type: 'update',
  update: { sessionUpdate: 'agent_message_chunk', content: { type: 'text', text: GREETING_TEXT } },
};

const TEXT_UPDATE: SessionUpdate = {
  sessionUpdate: 'agent_message_chunk',
  content: { type: 'text', text: 'hi' },
};

const PERMISSION_REQUEST: NonNullable<FakeAgentConfig['permissionRequest']> = {
  toolCall: { toolCallId: 'call-1' },
  options: [
    { optionId: 'allow', name: 'Allow', kind: 'allow_once' },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' },
  ],
};

describe(runAcpPrompt, () => {
  it('relays the updates in order, then reports the stop with usage and the last cost', async () => {
    const usage = { totalTokens: 30, inputTokens: 20, outputTokens: 10 };
    const { agent } = createFakeAgent({
      updates: [
        TEXT_UPDATE,
        { sessionUpdate: 'usage_update', used: 1, size: 100, cost: { amount: 0.01, currency: 'USD' } },
        { sessionUpdate: 'usage_update', used: 2, size: 100, cost: { amount: 0.02, currency: 'USD' } },
      ],
      usage,
    });

    const events = await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

    expect(events.map(({ type }) => type)).toStrictEqual(['update', 'update', 'update', 'stopped']);
    expect(events[0]).toStrictEqual({ type: 'update', update: TEXT_UPDATE });
    expect(events.at(-1)).toStrictEqual({
      type: 'stopped',
      stopReason: 'end_turn',
      usage,
      cost: { amount: 0.02, currency: 'USD' },
    });
  });

  it('omits usage and cost from the stop when the agent reports neither', async () => {
    const { agent } = createFakeAgent({ stopReason: 'max_tokens' });

    const events = await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

    expect(events).toStrictEqual([{ type: 'stopped', stopReason: 'max_tokens' }]);
  });

  it('opens the session in the given directory with the prompt as one text block', async () => {
    const { agent, received } = createFakeAgent();

    await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

    expect(findParams(received, 'initialize')).toMatchObject({ protocolVersion: 1, clientCapabilities: {} });
    expect(findParams(received, 'session/new')).toStrictEqual({ cwd: '/work', mcpServers: [] });
    expect(findParams(received, 'session/prompt')).toMatchObject({ prompt: [{ type: 'text', text: 'hello' }] });
  });

  it("sends the profile's session meta as the session's `_meta`", async () => {
    const { agent, received } = createFakeAgent();
    const sessionMeta = { claudeCode: { options: { settingSources: [] } } };

    await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, agent: { command: 'x', sessionMeta } }));

    expect(findParams(received, 'session/new')).toStrictEqual({ cwd: '/work', mcpServers: [], _meta: sessionMeta });
  });

  it('rejects an agent that answers a version other than 1', async () => {
    const { agent, received } = createFakeAgent({ protocolVersion: 2 });

    await expect(Array.fromAsync(runAcpPrompt(agent, OPTIONS))).rejects.toThrow(/ACP version 2/);
    expect(findParams(received, 'session/new')).toBeUndefined();
  });

  describe('authentication', () => {
    const authMethods = [{ id: 'oauth-personal', name: 'Google' }];

    it("authenticates with the profile's method when the agent lists it", async () => {
      const { agent, received } = createFakeAgent({ authMethods });

      await Array.fromAsync(
        runAcpPrompt(agent, { ...OPTIONS, agent: { command: 'x', authMethodId: 'oauth-personal' } }),
      );

      expect(findParams(received, 'authenticate')).toMatchObject({ methodId: 'oauth-personal' });
    });

    it("skips authentication when the agent does not list the profile's method", async () => {
      const { agent, received } = createFakeAgent({ authMethods });

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, agent: { command: 'x', authMethodId: 'api-key' } }));

      expect(findParams(received, 'authenticate')).toBeUndefined();
    });

    it('rejects when authentication fails', async () => {
      const { agent, received } = createFakeAgent({ authMethods, failAuthenticate: true });
      const options = { ...OPTIONS, agent: { command: 'x', authMethodId: 'oauth-personal' } };

      // The SDK answers an error thrown by an agent's handler with JSON-RPC's generic internal error.
      await expect(Array.fromAsync(runAcpPrompt(agent, options))).rejects.toThrow('Internal error');
      expect(findParams(received, 'session/new')).toBeUndefined();
    });
  });

  describe('instructions', () => {
    it('sends the instructions as an appended system prompt when the agent supports one', async () => {
      const { agent, received } = createFakeAgent({ advertiseSystemPrompt: true });

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, instructions: 'Be brief.' }));

      expect(findParams(received, 'session/new')).toMatchObject({
        systemPrompt: { mode: 'append', content: [{ type: 'text', text: 'Be brief.' }] },
      });
      expect(findParams(received, 'session/prompt')).toMatchObject({ prompt: [{ type: 'text', text: 'hello' }] });
    });

    it('puts the instructions ahead of the prompt when the agent does not support a system prompt', async () => {
      const { agent, received } = createFakeAgent();

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, instructions: 'Be brief.' }));

      expect(findParams(received, 'session/new')).not.toHaveProperty('systemPrompt');
      expect(findParams(received, 'session/prompt')).toMatchObject({
        prompt: [
          { type: 'text', text: 'Be brief.' },
          { type: 'text', text: 'hello' },
        ],
      });
    });
  });

  describe('permission mode', () => {
    const modes = {
      currentModeId: 'auto',
      availableModes: [
        { id: 'auto', name: 'Auto' },
        { id: 'default', name: 'Default' },
      ],
    };
    const options = { ...OPTIONS, agent: { command: 'x', permissionModeId: 'default' } };

    it("sets the profile's mode when the session is in another", async () => {
      const { agent, received } = createFakeAgent({ modes });

      await Array.fromAsync(runAcpPrompt(agent, options));

      expect(received.map(({ method }) => method)).toStrictEqual([
        'initialize',
        'session/new',
        'session/set_mode',
        'session/prompt',
      ]);
      expect(findParams(received, 'session/set_mode')).toStrictEqual({
        sessionId: 'fake-session',
        modeId: 'default',
      });
    });

    it("leaves the mode alone when the session is already in the profile's mode", async () => {
      const { agent, received } = createFakeAgent({ modes: { ...modes, currentModeId: 'default' } });

      await Array.fromAsync(runAcpPrompt(agent, options));

      expect(findParams(received, 'session/set_mode')).toBeUndefined();
    });

    it('leaves the mode alone when the profile names none', async () => {
      const { agent, received } = createFakeAgent({ modes });

      await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

      expect(findParams(received, 'session/set_mode')).toBeUndefined();
    });

    it("rejects, without prompting, when the session does not list the profile's mode", async () => {
      const { agent, received } = createFakeAgent({ modes });
      const unlisted = { ...OPTIONS, agent: { command: 'x', permissionModeId: 'ask' } };

      await expect(Array.fromAsync(runAcpPrompt(agent, unlisted))).rejects.toThrow(
        'The session does not list the permission mode "ask"; it lists "auto", "default".',
      );
      expect(findParams(received, 'session/prompt')).toBeUndefined();
    });

    it('rejects, without prompting, when the agent reports no modes', async () => {
      const { agent, received } = createFakeAgent();

      await expect(Array.fromAsync(runAcpPrompt(agent, options))).rejects.toThrow('it lists no modes');
      expect(findParams(received, 'session/prompt')).toBeUndefined();
    });
  });

  describe('permission requests', () => {
    it('refuses a request with its reject-once option', async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });

      await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'reject' },
      });
    });

    it('answers cancelled when the request offers no reject-once option', async () => {
      const permissionRequest = {
        ...PERMISSION_REQUEST,
        options: [{ optionId: 'allow', name: 'Allow', kind: 'allow_once' as const }],
      };
      const { agent, received } = createFakeAgent({ permissionRequest });

      await Array.fromAsync(runAcpPrompt(agent, OPTIONS));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
    });

    it('gives the policy the request and grants it once when the policy allows it', async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });
      const requests: unknown[] = [];
      const permissionPolicy: PermissionPolicy = (request) => {
        requests.push(request);
        return 'allow';
      };

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, permissionPolicy }));

      expect(requests).toStrictEqual([{ ...PERMISSION_REQUEST, sessionId: 'fake-session' }]);
      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'allow' },
      });
    });

    it('waits for a policy that answers asynchronously', async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });
      const permissionPolicy: PermissionPolicy = async () => {
        await new Promise((resolve) => setImmediate(resolve));
        return 'allow' as const;
      };

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, permissionPolicy }));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'allow' },
      });
    });

    it.for([
      { title: 'rejects it', verdict: 'reject' },
      { title: 'returns nothing', verdict: undefined },
      // A JavaScript caller can return a value that the type excludes.
      { title: 'returns a value outside the type', verdict: 'always' },
    ])('refuses the request once when the policy $title', async ({ verdict }) => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });
      // @ts-expect-error -- one case returns a value outside `PermissionVerdict`.
      const permissionPolicy: PermissionPolicy = () => verdict;

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, permissionPolicy }));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'reject' },
      });
    });

    it.for([
      { title: 'no allow-once option', kinds: ['reject_once'] as const },
      { title: 'only options that apply always', kinds: ['allow_always', 'reject_always'] as const },
    ])('answers cancelled when the policy allows a request that offers $title', async ({ kinds }) => {
      const permissionRequest = {
        ...PERMISSION_REQUEST,
        options: kinds.map((kind) => ({ optionId: kind, name: kind, kind })),
      };
      const { agent, received } = createFakeAgent({ permissionRequest });

      await Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, permissionPolicy: () => 'allow' }));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
    });

    it('answers cancelled, then rejects with the error, when the policy throws', async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });
      const permissionPolicy: PermissionPolicy = () => {
        throw new Error('policy failed');
      };

      await expect(Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, permissionPolicy }))).rejects.toThrow(
        'policy failed',
      );
      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
      expect(findParams(received, 'session/cancel')).toBeDefined();
    });
  });

  describe('abort', () => {
    it('rejects with the reason, without connecting, when the signal is already aborted', async () => {
      const { agent, received } = createFakeAgent();
      const signal = AbortSignal.abort(new Error('stop'));

      await expect(Array.fromAsync(runAcpPrompt(agent, { ...OPTIONS, signal }))).rejects.toThrow('stop');
      expect(received).toStrictEqual([]);
    });

    it('rejects with the reason, without prompting, when the signal aborts during the handshake', async () => {
      const { agent, received } = createFakeAgent();
      const controller = new AbortController();
      await using run = runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal });

      const first = run.next();
      controller.abort(new Error('stop'));

      await expect(first).rejects.toThrow('stop');
      expect(findParams(received, 'session/prompt')).toBeUndefined();
    });

    it('cancels the turn, answers a request raised meanwhile with cancelled, and reports the cancelled stop', async () => {
      const { agent, received } = createFakeAgent({
        updates: [TEXT_UPDATE],
        holdUntilCancel: true,
        permissionRequest: PERMISSION_REQUEST,
      });
      const controller = new AbortController();

      const events = await collectAbortingOnFirstEvent(
        runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal }),
        controller,
      );

      expect(findParams(received, 'session/cancel')).toStrictEqual({ sessionId: 'fake-session' });
      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
      expect(events.at(-1)).toStrictEqual({ type: 'stopped', stopReason: 'cancelled' });
    });

    it('does not consult the policy about a request raised after the cancellation', async () => {
      const { agent } = createFakeAgent({
        updates: [TEXT_UPDATE],
        holdUntilCancel: true,
        permissionRequest: PERMISSION_REQUEST,
      });
      const controller = new AbortController();
      let callCount = 0;
      const permissionPolicy: PermissionPolicy = () => {
        callCount += 1;
        return 'allow';
      };

      await collectAbortingOnFirstEvent(
        runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal, permissionPolicy }),
        controller,
      );

      expect(callCount).toBe(0);
    });

    it("aborts a pending policy's signal and answers its request with cancelled", async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: PERMISSION_REQUEST });
      const controller = new AbortController();
      let policySignal: AbortSignal | undefined;
      const permissionPolicy: PermissionPolicy = (_request, { signal }) => {
        policySignal = signal;
        controller.abort(new Error('stop'));
        return new Promise<never>(() => {});
      };

      const events = await Array.fromAsync(
        runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal, permissionPolicy }),
      );

      expect(policySignal?.aborted).toBe(true);
      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
      expect(events).toStrictEqual([{ type: 'stopped', stopReason: 'end_turn' }]);
    });

    it("aborts a pending policy's signal when the consumer stops iterating", async () => {
      const { agent } = createFakeAgent({ updates: [TEXT_UPDATE], permissionRequest: PERMISSION_REQUEST });
      const { promise: started, resolve } = Promise.withResolvers<AbortSignal>();
      const permissionPolicy: PermissionPolicy = (_request, { signal }) => {
        resolve(signal);
        return new Promise<never>(() => {});
      };
      await using run = runAcpPrompt(agent, { ...OPTIONS, permissionPolicy });

      await run.next();
      const policySignal = await started;
      await run.return(undefined);

      expect(policySignal.aborted).toBe(true);
    });

    it('rejects with the reason when the agent does not stop within the grace period', async () => {
      const { agent } = createFakeAgent({ updates: [TEXT_UPDATE], ignoreCancel: true });
      const controller = new AbortController();
      await using run = runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal }, { cancelGraceMs: 10 });

      await run.next();
      controller.abort(new Error('stop'));

      await expect(run.next()).rejects.toThrow('stop');
    });
  });

  describe('tools', () => {
    it('serves the tools over the ACP connection when the agent advertises MCP over ACP', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { acp: true, http: true },
        callTool: { name: GREETING_TOOL_NAME },
      });

      const events = await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      expect(events).toContainEqual(GREETING_UPDATE);
      expect(findDeclaredServer(received)).toMatchObject({ type: 'acp', name: 'app' });
    });

    it('serves the tools from a loopback HTTP endpoint when the agent advertises HTTP', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { http: true },
        callTool: { name: GREETING_TOOL_NAME },
      });

      const events = await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      expect(events).toContainEqual(GREETING_UPDATE);
      const server = findDeclaredServer(received);
      expect(server).toMatchObject({ type: 'http', name: 'app', headers: [{ name: 'Authorization' }] });
      expect(new URL(readDeclaredUrl(server)).hostname).toBe('127.0.0.1');
    });

    it('declares the stdio bridge, run with this Node, when the agent advertises neither', async () => {
      const { agent, received } = createFakeAgent({ mcpCapabilities: { sse: true } });

      await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      const server = findDeclaredServer(received);
      expect(server).toMatchObject({
        name: 'app',
        command: process.execPath,
        args: [expect.stringMatching(/mcpStdioBridge\.ts$/)],
      });
      expect(readEnvNames(server)).toStrictEqual([BRIDGE_URL_VARIABLE, BRIDGE_TOKEN_VARIABLE]);
    });

    it('stops the HTTP endpoint when the run ends', async () => {
      const { agent, received } = createFakeAgent({ mcpCapabilities: { http: true } });

      await Array.fromAsync(runAcpPrompt(agent, TOOL_OPTIONS));

      await expect(fetch(readDeclaredUrl(findDeclaredServer(received)), { method: 'POST' })).rejects.toThrow(
        'fetch failed',
      );
    });

    it('stops the HTTP endpoint when the consumer stops iterating', async () => {
      const { agent, received } = createFakeAgent({
        mcpCapabilities: { http: true },
        updates: [TEXT_UPDATE],
        holdUntilCancel: true,
      });

      for await (const event of runAcpPrompt(agent, TOOL_OPTIONS)) {
        if (event.type === 'update') break;
      }

      await expect(fetch(readDeclaredUrl(findDeclaredServer(received)), { method: 'POST' })).rejects.toThrow(
        'fetch failed',
      );
    });
  });
});

// region | Helpers
/** Reads a run, aborting it once the first update arrives, so that the abort lands mid-turn. */
async function collectAbortingOnFirstEvent(
  run: AsyncGenerator<RunEvent>,
  controller: AbortController,
): Promise<RunEvent[]> {
  const events: RunEvent[] = [];
  for await (const event of run) {
    events.push(event);
    if (events.length === 1) controller.abort(new Error('stop'));
  }
  return events;
}

/** Returns the one MCP server that the session declared. */
function findDeclaredServer(received: readonly ReceivedMessage[]): unknown {
  const params = findParams(received, 'session/new');
  if (typeof params !== 'object' || params === null || !('mcpServers' in params) || !Array.isArray(params.mcpServers)) {
    throw new Error('The session declared no MCP servers.');
  }
  expect(params.mcpServers).toHaveLength(1);
  return params.mcpServers[0];
}

/** Returns the params of the first message received for `method`. */
function findParams(received: readonly ReceivedMessage[], method: string): unknown {
  return received.find((message) => message.method === method)?.params;
}

/** Returns a declared HTTP server's URL. */
function readDeclaredUrl(server: unknown): string {
  if (typeof server !== 'object' || server === null || !('url' in server) || typeof server.url !== 'string') {
    throw new Error('The declared server has no URL.');
  }
  return server.url;
}

/** Returns the names of a declared stdio server's environment variables. */
function readEnvNames(server: unknown): unknown[] {
  if (typeof server !== 'object' || server === null || !('env' in server) || !Array.isArray(server.env)) {
    throw new Error('The declared server has no environment.');
  }
  return server.env.map((variable: unknown) =>
    typeof variable === 'object' && variable !== null && 'name' in variable ? variable.name : undefined,
  );
}
// endregion | Helpers
