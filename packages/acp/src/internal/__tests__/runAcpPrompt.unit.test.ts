import type { SessionUpdate } from '@agentclientprotocol/sdk/unstable';
import { describe, expect, it } from 'vitest';

import { createFakeAgent, type FakeAgentConfig, type ReceivedMessage } from '../../test-utils/createFakeAgent.ts';
import type { RunEvent, RunPromptOptions } from '../../types/run.ts';
import { runAcpPrompt } from '../runAcpPrompt.ts';

const OPTIONS: RunPromptOptions = { agent: { command: 'unused' }, cwd: '/work', prompt: 'hello' };

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

    it('rejects with the reason when the agent does not stop within the grace period', async () => {
      const { agent } = createFakeAgent({ updates: [TEXT_UPDATE], ignoreCancel: true });
      const controller = new AbortController();
      await using run = runAcpPrompt(agent, { ...OPTIONS, signal: controller.signal }, { cancelGraceMs: 10 });

      await run.next();
      controller.abort(new Error('stop'));

      await expect(run.next()).rejects.toThrow('stop');
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

/** Returns the params of the first message received for `method`. */
function findParams(received: readonly ReceivedMessage[], method: string): unknown {
  return received.find((message) => message.method === method)?.params;
}
// endregion | Helpers
