import {
  type AgentApp,
  client,
  type ContentBlock,
  type Cost,
  methods,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type Stream,
} from '@agentclientprotocol/sdk/unstable';

import type { RunEvent, RunPromptOptions } from '../types/run.ts';
import { createEventQueue } from './createEventQueue.ts';

/** Timing that a test shortens. */
export interface AcpRunSettings {
  /** How long a cancelled turn may take to stop before the run gives up on the agent. */
  readonly cancelGraceMs: number;
}

const DEFAULT_SETTINGS: AcpRunSettings = { cancelGraceMs: 10_000 };

/**
 * Runs one prompt over an ACP connection to `target`, yielding the turn's updates and then its stop. The
 * connection closes when the turn stops, when the consumer stops iterating, or on a failure, which rejects the
 * iteration. An abort before the prompt is sent rejects with the signal's reason; one after it cancels the turn.
 *
 * @internal
 */
export async function* runAcpPrompt(
  target: Stream | AgentApp,
  options: RunPromptOptions,
  settings: AcpRunSettings = DEFAULT_SETTINGS,
): AsyncGenerator<RunEvent> {
  const { signal } = options;
  signal?.throwIfAborted();

  const queue = createEventQueue<RunEvent>();
  const halt = Promise.withResolvers<never>();
  // The race below observes the rejection; this covers a halt that comes before the race starts.
  halt.promise.catch(() => {});
  let lastCost: Cost | undefined;
  let isCancelling = false;
  let cancelTimer: NodeJS.Timeout | undefined;
  let onAbort: (() => void) | undefined;

  const app = client({ name: '@williamthorsen/toolbelt.acp' })
    .onNotification(methods.client.session.update, ({ params: { update } }) => {
      if (update.sessionUpdate === 'usage_update' && update.cost !== undefined && update.cost !== null) {
        lastCost = update.cost;
      }
      queue.push({ type: 'update', update });
    })
    .onRequest(methods.client.session.requestPermission, ({ params }) => refusePermission(params, isCancelling));

  const run = app.connectWith(target, async (context) => {
    async function converse(): Promise<void> {
      const initialized = await context.request(methods.agent.initialize, {
        protocolVersion: PROTOCOL_VERSION,
        clientCapabilities: {},
      });
      if (initialized.protocolVersion !== PROTOCOL_VERSION) {
        throw new Error(
          `The agent answered ACP version ${initialized.protocolVersion}; this client speaks version ${PROTOCOL_VERSION}.`,
        );
      }

      const { authMethodId } = options.agent;
      if (authMethodId !== undefined && (initialized.authMethods ?? []).some(({ id }) => id === authMethodId)) {
        await context.request(methods.agent.authenticate, { methodId: authMethodId });
      }

      const instructions = options.instructions ?? '';
      const hasSystemPrompt = isPresent(initialized.agentCapabilities?.sessionCapabilities?.systemPrompt);
      const { sessionId } = await context.request(methods.agent.session.new, {
        cwd: options.cwd,
        mcpServers: [],
        ...(instructions !== '' && hasSystemPrompt
          ? { systemPrompt: { mode: 'append', content: [toTextBlock(instructions)] } }
          : {}),
      });

      signal?.throwIfAborted();
      const prompt =
        instructions !== '' && !hasSystemPrompt
          ? [toTextBlock(instructions), toTextBlock(options.prompt)]
          : [toTextBlock(options.prompt)];
      const responding = context.request(methods.agent.session.prompt, { sessionId, prompt });

      onAbort = () => {
        isCancelling = true;
        void context.notify(methods.agent.session.cancel, { sessionId });
        cancelTimer = setTimeout(() => {
          halt.reject(signal?.reason);
        }, settings.cancelGraceMs);
      };
      if (signal?.aborted === true) onAbort();

      const { stopReason, usage } = await responding;
      queue.push({
        type: 'stopped',
        stopReason,
        ...(isPresent(usage) ? { usage } : {}),
        ...(lastCost === undefined ? {} : { cost: lastCost }),
      });
    }

    await Promise.race([converse(), halt.promise]);
  });

  function abort(): void {
    if (onAbort === undefined) halt.reject(signal?.reason);
    else onAbort();
  }
  signal?.addEventListener('abort', abort, { once: true });

  run.then(
    () => {
      queue.close();
    },
    (error: unknown) => {
      queue.fail(error);
    },
  );

  try {
    yield* queue;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(cancelTimer);
    halt.reject(new Error('The run was ended by its consumer.'));
    await run.catch(() => {});
  }
}

// region | Helpers
function isPresent<T>(value: T | null | undefined): value is T {
  return value !== undefined && value !== null;
}

/** Refuses a request once, or reports the turn as cancelled while a cancellation is under way. */
function refusePermission(request: RequestPermissionRequest, isCancelling: boolean): RequestPermissionResponse {
  const rejection = request.options.find(({ kind }) => kind === 'reject_once');
  if (isCancelling || rejection === undefined) return { outcome: { outcome: 'cancelled' } };
  return { outcome: { outcome: 'selected', optionId: rejection.optionId } };
}

function toTextBlock(text: string): ContentBlock {
  return { type: 'text', text };
}
// endregion | Helpers
