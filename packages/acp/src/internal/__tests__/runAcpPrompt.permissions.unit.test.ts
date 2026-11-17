import { describe, expect, it } from 'vitest';

import { createFakeAgent, type FakeAgentConfig, findParams } from '../../test-utils/createFakeAgent.ts';
import { createGreetingToolServer } from '../../test-utils/createGreetingToolServer.ts';
import {
  collectAbortingOnFirstEvent,
  OPTIONS,
  PERMISSION_REQUEST,
  TEXT_UPDATE,
} from '../../test-utils/runAcpPromptFixtures.ts';
import type { PermissionPolicy, RunPromptOptions } from '../../types/run.ts';
import { runAcpPrompt } from '../runAcpPrompt.ts';

describe(runAcpPrompt, () => {
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

  describe('preapproved tools', () => {
    const APP_CALL: NonNullable<FakeAgentConfig['permissionRequest']> = {
      ...PERMISSION_REQUEST,
      toolCall: { toolCallId: 'call-1', title: 'app tool' },
    };
    const OTHER_CALL: NonNullable<FakeAgentConfig['permissionRequest']> = {
      ...PERMISSION_REQUEST,
      toolCall: { toolCallId: 'call-2', title: 'shell command' },
    };
    const PREAPPROVED_OPTIONS: RunPromptOptions = {
      ...OPTIONS,
      agent: {
        command: 'unused',
        isToolServerCall: ({ toolCall }, serverName) => toolCall.title === `${serverName} tool`,
      },
      tools: { name: 'app', createServer: createGreetingToolServer(), isPreapproved: true },
    };

    it("allows a call of the run's own tools once without consulting the policy", async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: APP_CALL });
      let callCount = 0;
      const permissionPolicy: PermissionPolicy = () => {
        callCount += 1;
        return 'reject';
      };

      await Array.fromAsync(runAcpPrompt(agent, { ...PREAPPROVED_OPTIONS, permissionPolicy }));

      expect(callCount).toBe(0);
      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'allow' },
      });
    });

    it('gives the policy a request for any other tool', async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: OTHER_CALL });
      const requests: unknown[] = [];
      const permissionPolicy: PermissionPolicy = (request) => {
        requests.push(request);
        return 'allow';
      };

      await Array.fromAsync(runAcpPrompt(agent, { ...PREAPPROVED_OPTIONS, permissionPolicy }));

      expect(requests).toStrictEqual([{ ...OTHER_CALL, sessionId: 'fake-session' }]);
      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'allow' },
      });
    });

    it.for([
      { title: 'a request for any other tool', options: PREAPPROVED_OPTIONS, request: OTHER_CALL },
      {
        title: "a call of the run's own tools when they are not preapproved",
        options: { ...PREAPPROVED_OPTIONS, tools: { name: 'app', createServer: createGreetingToolServer() } },
        request: APP_CALL,
      },
      {
        title: 'a call on a profile that cannot identify one',
        options: { ...PREAPPROVED_OPTIONS, agent: { command: 'unused' } },
        request: APP_CALL,
      },
    ])('refuses $title once when there is no policy', async ({ options, request }) => {
      const { agent, received } = createFakeAgent({ permissionRequest: request });

      await Array.fromAsync(runAcpPrompt(agent, options));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({
        outcome: { outcome: 'selected', optionId: 'reject' },
      });
    });

    it("answers cancelled when a call of the run's own tools offers no allow-once option", async () => {
      const permissionRequest = {
        ...APP_CALL,
        options: [{ optionId: 'reject', name: 'Reject', kind: 'reject_once' as const }],
      };
      const { agent, received } = createFakeAgent({ permissionRequest });

      await Array.fromAsync(runAcpPrompt(agent, PREAPPROVED_OPTIONS));

      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
    });

    it("answers cancelled, then rejects with the error, when the profile's predicate throws", async () => {
      const { agent, received } = createFakeAgent({ permissionRequest: APP_CALL });
      const isToolServerCall = (): boolean => {
        throw new Error('predicate failed');
      };

      await expect(
        Array.fromAsync(
          runAcpPrompt(agent, { ...PREAPPROVED_OPTIONS, agent: { command: 'unused', isToolServerCall } }),
        ),
      ).rejects.toThrow('predicate failed');
      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
      expect(findParams(received, 'session/cancel')).toBeDefined();
    });

    it("answers cancelled to a call of the run's own tools raised after the cancellation", async () => {
      const { agent, received } = createFakeAgent({
        updates: [TEXT_UPDATE],
        holdUntilCancel: true,
        permissionRequest: APP_CALL,
      });
      const controller = new AbortController();

      await collectAbortingOnFirstEvent(
        runAcpPrompt(agent, { ...PREAPPROVED_OPTIONS, signal: controller.signal }),
        controller,
      );

      expect(findParams(received, 'session/request_permission')).toStrictEqual({ outcome: { outcome: 'cancelled' } });
    });
  });
});
