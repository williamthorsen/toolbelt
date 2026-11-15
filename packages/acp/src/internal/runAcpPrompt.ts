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
import { isNonNullable } from '@williamthorsen/toolbelt.guards';

import type { RunEvent, RunPromptOptions } from '../types/run.ts';
import { createEventQueue, type EventQueue } from './createEventQueue.ts';

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
  const halt = new AbortController();
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
    /** Runs the handshake, opens the session, and sends the prompt, pushing the stop when the turn ends. */
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
      const hasSystemPrompt = isNonNullable(initialized.agentCapabilities?.sessionCapabilities?.systemPrompt);
      const { sessionId } = await context.request(methods.agent.session.new, {
        cwd: options.cwd,
        mcpServers: [],
        ...(instructions !== '' &&
          hasSystemPrompt && { systemPrompt: { mode: 'append', content: [toTextBlock(instructions)] } }),
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
          halt.abort(signal?.reason);
        }, settings.cancelGraceMs);
      };
      if (signal?.aborted === true) onAbort();

      const { stopReason, usage } = await responding;
      queue.push({
        type: 'stopped',
        stopReason,
        ...(isNonNullable(usage) && { usage }),
        ...(lastCost !== undefined && { cost: lastCost }),
      });
    }

    await Promise.race([converse(), rejectOnAbort(halt.signal)]);
  });

  /** Abandons the run before the prompt is sent, and cancels the turn after. */
  function abort(): void {
    if (onAbort === undefined) halt.abort(signal?.reason);
    else onAbort();
  }
  signal?.addEventListener('abort', abort, { once: true });

  const settled = endQueueWith(run, queue);

  try {
    yield* queue;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(cancelTimer);
    halt.abort(new Error('The run was ended by its consumer.'));
    await settled;
  }
}

// region | Helpers
/** Closes the queue when the run resolves, and fails it with the run's error when the run rejects. */
async function endQueueWith(run: Promise<void>, queue: EventQueue<RunEvent>): Promise<void> {
  try {
    await run;
    queue.close();
  } catch (error) {
    queue.fail(error);
  }
}

/** Returns a promise that rejects with the signal's reason once it aborts. */
function rejectOnAbort(signal: AbortSignal): Promise<never> {
  const { promise, reject } = Promise.withResolvers<never>();
  if (signal.aborted) reject(signal.reason);
  signal.addEventListener(
    'abort',
    () => {
      reject(signal.reason);
    },
    { once: true },
  );
  return promise;
}

/** Refuses a request once, or reports the turn as cancelled while a cancellation is under way. */
function refusePermission(request: RequestPermissionRequest, isCancelling: boolean): RequestPermissionResponse {
  const rejection = request.options.find(({ kind }) => kind === 'reject_once');
  if (isCancelling || rejection === undefined) return { outcome: { outcome: 'cancelled' } };
  return { outcome: { outcome: 'selected', optionId: rejection.optionId } };
}

/** Wraps text as an ACP text content block. */
function toTextBlock(text: string): ContentBlock {
  return { type: 'text', text };
}
// endregion | Helpers
