import {
  type AgentApp,
  client,
  type ContentBlock,
  type Cost,
  McpOverAcpProvider,
  methods,
  PROTOCOL_VERSION,
  type RequestPermissionRequest,
  type RequestPermissionResponse,
  type SessionModeState,
  type Stream,
} from '@agentclientprotocol/sdk/unstable';
import { isNonNullable } from '@williamthorsen/toolbelt.guards';

import type { PermissionPolicy, RunEvent, RunPromptOptions } from '../types/run.ts';
import { createEventQueue, type EventQueue } from './createEventQueue.ts';
import { startToolServing } from './startToolServing.ts';

/** Timing that a test shortens. */
export interface AcpRunSettings {
  /** How long a cancelled turn may take to stop before the run gives up on the agent. */
  readonly cancelGraceMs: number;
}

const DEFAULT_SETTINGS: AcpRunSettings = { cancelGraceMs: 10_000 };

const CANCELLED: RequestPermissionResponse = { outcome: { outcome: 'cancelled' } };

/**
 * Runs one prompt over an ACP connection to `target`, yielding the turn's updates and then its stop. The
 * connection closes when the turn stops, when the consumer stops iterating, or on a failure, which rejects the
 * iteration. An abort before the prompt is sent rejects with the signal's reason; one after it cancels the turn.
 * A permission policy that throws cancels the turn too, and the iteration then rejects with the policy's error.
 * The app's tools are served for the turn and stop being served when the connection closes.
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
  const cancelling = new AbortController();
  let cancelTimer: NodeJS.Timeout | undefined;
  let onAbort: ((reason: unknown) => void) | undefined;
  let policyFailure: { readonly error: unknown } | undefined;
  const mcpProvider = new McpOverAcpProvider();

  const app = client({ name: '@williamthorsen/toolbelt.acp' })
    .onNotification(methods.client.session.update, ({ params: { update } }) => {
      if (update.sessionUpdate === 'usage_update' && update.cost !== undefined && update.cost !== null) {
        lastCost = update.cost;
      }
      queue.push({ type: 'update', update });
    })
    .onRequest(methods.client.session.requestPermission, ({ params }) =>
      answerPermission(params, options.permissionPolicy, cancelling.signal, (error) => {
        policyFailure ??= { error };
        onAbort?.(error);
      }),
    )
    .onRequest(methods.client.mcp.message, mcpProvider.handleRequest);

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

      const { authMethodId, sessionMeta } = options.agent;
      if (authMethodId !== undefined && (initialized.authMethods ?? []).some(({ id }) => id === authMethodId)) {
        await context.request(methods.agent.authenticate, { methodId: authMethodId });
      }

      await using toolServing = await startToolServing(options.tools, initialized.agentCapabilities?.mcpCapabilities, {
        context,
        provider: mcpProvider,
      });

      const instructions = options.instructions ?? '';
      const hasSystemPrompt = isNonNullable(initialized.agentCapabilities?.sessionCapabilities?.systemPrompt);
      const { sessionId, modes } = await context.request(methods.agent.session.new, {
        cwd: options.cwd,
        mcpServers: toolServing.mcpServers,
        ...(sessionMeta !== undefined && { _meta: { ...sessionMeta } }),
        ...(instructions !== '' &&
          hasSystemPrompt && { systemPrompt: { mode: 'append', content: [toTextBlock(instructions)] } }),
      });

      const modeId = findModeToSet(modes, options.agent.permissionModeId);
      if (modeId !== undefined) await context.request(methods.agent.session.setMode, { sessionId, modeId });

      signal?.throwIfAborted();
      const prompt =
        instructions !== '' && !hasSystemPrompt
          ? [toTextBlock(instructions), toTextBlock(options.prompt)]
          : [toTextBlock(options.prompt)];
      const responding = context.request(methods.agent.session.prompt, { sessionId, prompt });

      onAbort = (reason) => {
        if (cancelling.signal.aborted) return;
        cancelling.abort(reason);
        void context.notify(methods.agent.session.cancel, { sessionId });
        cancelTimer = setTimeout(() => {
          halt.abort(reason);
        }, settings.cancelGraceMs);
      };
      if (signal?.aborted === true) onAbort(signal.reason);

      const { stopReason, usage } = await responding;
      if (policyFailure !== undefined) throw policyFailure.error;
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
    else onAbort(signal?.reason);
  }
  signal?.addEventListener('abort', abort, { once: true });

  const settled = endQueueWith(run, queue);

  try {
    yield* queue;
  } finally {
    signal?.removeEventListener('abort', abort);
    clearTimeout(cancelTimer);
    cancelling.abort();
    halt.abort(new Error('The run was ended by its consumer.'));
    await settled;
  }
}

// region | Helpers
/**
 * Answers a permission request with the policy's decision, selecting only options that apply once. Answers
 * cancelled once `cancelling` aborts, when the request does not offer the option that the decision needs, and
 * when the policy throws, which is also reported to `failRun`.
 */
async function answerPermission(
  request: RequestPermissionRequest,
  policy: PermissionPolicy | undefined,
  cancelling: AbortSignal,
  failRun: (error: unknown) => void,
): Promise<RequestPermissionResponse> {
  if (cancelling.aborted) return CANCELLED;

  let verdict: unknown;
  if (policy !== undefined) {
    const settled = new AbortController();
    const { promise: cancelled, resolve } = Promise.withResolvers<'cancelled'>();
    cancelling.addEventListener(
      'abort',
      () => {
        resolve('cancelled');
      },
      { once: true, signal: settled.signal },
    );
    const outcome = await Promise.race([cancelled, callPolicy(policy, request, cancelling)]);
    settled.abort();
    if (outcome === 'cancelled') return CANCELLED;
    if ('error' in outcome) {
      failRun(outcome.error);
      return CANCELLED;
    }
    verdict = outcome.verdict;
  }

  const wantedKind = verdict === 'allow' ? 'allow_once' : 'reject_once';
  const option = request.options.find(({ kind }) => kind === wantedKind);
  return option === undefined ? CANCELLED : { outcome: { outcome: 'selected', optionId: option.optionId } };
}

/** Calls the policy and returns its verdict, or the error that it threw, so that an abandoned call cannot reject. */
async function callPolicy(
  policy: PermissionPolicy,
  request: RequestPermissionRequest,
  signal: AbortSignal,
): Promise<{ readonly verdict: unknown } | { readonly error: unknown }> {
  try {
    return { verdict: await policy(request, { signal }) };
  } catch (error) {
    return { error };
  }
}

/** Closes the queue when the run resolves, and fails it with the run's error when the run rejects. */
async function endQueueWith(run: Promise<void>, queue: EventQueue<RunEvent>): Promise<void> {
  try {
    await run;
    queue.close();
  } catch (error) {
    queue.fail(error);
  }
}

/**
 * Returns the profile's permission mode when the session must be switched to it, and nothing when the profile
 * names none or the session is already in it. Throws when the session does not list the mode.
 */
function findModeToSet(
  modes: SessionModeState | null | undefined,
  permissionModeId: string | undefined,
): string | undefined {
  if (permissionModeId === undefined) return undefined;
  const listedModeIds = (modes?.availableModes ?? []).map(({ id }) => id);
  if (!listedModeIds.includes(permissionModeId)) {
    throw new Error(
      `The session does not list the permission mode "${permissionModeId}"; it lists ${formatModeIds(listedModeIds)}.`,
    );
  }
  return modes?.currentModeId === permissionModeId ? undefined : permissionModeId;
}

/** Formats mode ids for an error message. */
function formatModeIds(modeIds: readonly string[]): string {
  return modeIds.length === 0 ? 'no modes' : modeIds.map((id) => `"${id}"`).join(', ');
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

/** Wraps text as an ACP text content block. */
function toTextBlock(text: string): ContentBlock {
  return { type: 'text', text };
}
// endregion | Helpers
