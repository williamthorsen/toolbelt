import { describeError } from '@williamthorsen/toolbelt.errors';
import {
  type FinishReason,
  type LanguageModel,
  type LanguageModelUsage,
  type ModelMessage,
  stepCountIs,
  streamText,
  type TextStreamPart,
  tool,
  type ToolSet,
} from 'ai';

import { JobRunError } from '../1-proposed/JobRunError.ts';
import type { Job, JobEvent, JobOutcome, JobTool, RunJobOptions, Usage } from '../types/job.ts';
import { assertPositiveInteger } from './assertPositiveInteger.ts';
import { addUsage, ZERO_USAGE } from './usage.ts';

/** Marks the end of the content before it as an Anthropic cache breakpoint. */
const CACHE_BREAKPOINT = { anthropic: { cacheControl: { type: 'ephemeral' } } } as const;

/** The part of an AI SDK step that the output cap reads. */
interface StepUsage {
  readonly usage: LanguageModelUsage;
}

/** What a run has counted so far. */
interface RunProgress {
  rounds: number;
  usage: Usage;
  lastFinishReason: FinishReason | undefined;
}

/**
 * Runs a job's model loop on a language model, one model request per round, and returns how it ended.
 *
 * @internal
 */
export async function runJobOnModel<Result>(
  job: Job<Result>,
  model: LanguageModel,
  { signal, onEvent }: RunJobOptions = {},
): Promise<JobOutcome<Result>> {
  assertPositiveInteger(job.maxRounds, 'maxRounds');
  if (job.maxOutputTokens !== undefined) assertPositiveInteger(job.maxOutputTokens, 'maxOutputTokens');
  signal?.throwIfAborted();

  // Ends the model's requests when a tool throws or the run fails.
  const controller = new AbortController();
  let toolFailure: { readonly error: unknown } | undefined;
  function recordToolFailure(error: unknown, call: { readonly callId: string; readonly toolName: string }): void {
    toolFailure ??= { error };
    controller.abort();
    // The abort ends the stream before the AI SDK reports the failed call, so report it here.
    onEvent?.({ type: 'tool-error', ...call, message: describeError(error) });
  }

  const progress: RunProgress = { rounds: 0, usage: ZERO_USAGE, lastFinishReason: undefined };
  const result = streamText({
    model,
    instructions: {
      role: 'system',
      content: job.instructions,
      providerOptions: CACHE_BREAKPOINT,
    },
    prompt: job.input,
    tools: buildToolSet(job.tools, recordToolFailure),
    stopWhen: [
      stepCountIs(job.maxRounds),
      () => job.readResult() !== undefined,
      ({ steps }) => job.maxOutputTokens !== undefined && sumOutputTokens(steps) >= job.maxOutputTokens,
    ],
    prepareStep: buildStepPreparer(job.maxOutputTokens),
    abortSignal: signal === undefined ? controller.signal : AbortSignal.any([signal, controller.signal]),
    // The loop below reads every error from the stream; the default handler would also log it.
    onError: () => {},
  });

  try {
    for await (const part of result.stream) {
      if (part.type === 'error') throw part.error;
      const event = recordPart(part, progress);
      if (event !== undefined) onEvent?.(event);
    }
  } catch (error) {
    controller.abort();
    throw selectRejection(error, toolFailure, signal);
  }
  if (toolFailure !== undefined || signal?.aborted === true) {
    throw selectRejection(undefined, toolFailure, signal);
  }

  return buildOutcome(job, progress);
}

// region | Helpers
/** Builds the outcome of a run that ended without failing. */
function buildOutcome<Result>(job: Job<Result>, progress: RunProgress): JobOutcome<Result> {
  const { rounds, usage, lastFinishReason } = progress;
  const result = job.readResult();
  if (result !== undefined) return { status: 'completed', result, rounds, usage };
  if (isTokenCapReached(job, progress)) return { status: 'unfinished', reason: 'token-cap', rounds, usage };
  // Only a round that ended in tool calls would have been followed by another, had the cap allowed it.
  const reason = rounds >= job.maxRounds && lastFinishReason === 'tool-calls' ? 'round-cap' : 'stopped';
  return { status: 'unfinished', reason, rounds, usage };
}

/** Wraps each job tool as an AI SDK tool whose `execute` reports a throw before rethrowing it. */
function buildToolSet(
  tools: Job<unknown>['tools'],
  onToolFailure: (error: unknown, call: { readonly callId: string; readonly toolName: string }) => void,
): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, jobTool]: [string, JobTool]) => [
      name,
      tool({
        description: jobTool.description,
        inputSchema: jobTool.inputSchema,
        execute: async (input: unknown, { toolCallId }) => {
          try {
            return await jobTool.execute(input);
          } catch (error) {
            onToolFailure(error, { callId: toolCallId, toolName: name });
            throw error;
          }
        },
      }),
    ]),
  );
}

/**
 * Returns a `prepareStep` that marks the end of the conversation and the end of the previous round's request as cache
 * breakpoints, and limits each round's output to what remains of the cap, if any. The previous round's end is the
 * prefix that it wrote to the cache, so a round reads that prefix whatever the number of blocks that it added; with the
 * instructions' breakpoint, a request has at most three, within Anthropic's limit of four.
 */
function buildStepPreparer(maxOutputTokens: number | undefined): (options: {
  readonly steps: readonly StepUsage[];
  readonly messages: ModelMessage[];
}) => {
  messages: ModelMessage[];
  maxOutputTokens?: number;
} {
  let previousEnd: number | undefined;
  return ({ steps, messages }) => {
    const ends = new Set([previousEnd, messages.length - 1]);
    previousEnd = messages.length - 1;
    return {
      // The returned messages carry forward to the next round, so clear the breakpoints that an earlier round set.
      messages: messages.map((message, index) => (ends.has(index) ? markMessage(message) : unmarkMessage(message))),
      ...(maxOutputTokens !== undefined && { maxOutputTokens: maxOutputTokens - sumOutputTokens(steps) }),
    };
  };
}

/** Converts the AI SDK's usage to the package's own, counting an unreported count as 0. */
function convertUsage(usage: LanguageModelUsage): Usage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens ?? 0,
  };
}

/** Reports whether the run's output has reached the job's cap in a round that the model did not end on its own. */
function isTokenCapReached(job: Job<unknown>, { usage, lastFinishReason }: RunProgress): boolean {
  return job.maxOutputTokens !== undefined && usage.outputTokens >= job.maxOutputTokens && lastFinishReason !== 'stop';
}

/** Returns a copy of the message that ends with a cache breakpoint. */
function markMessage(message: ModelMessage): ModelMessage {
  const { anthropic, ...others } = message.providerOptions ?? {};
  return { ...message, providerOptions: { ...others, anthropic: { ...anthropic, ...CACHE_BREAKPOINT.anthropic } } };
}

/** Records a stream part in the run's progress and returns the event that it reports, if any. */
function recordPart(part: TextStreamPart<ToolSet>, progress: RunProgress): JobEvent | undefined {
  switch (part.type) {
    case 'text-delta':
      return { type: 'text-delta', text: part.text };
    case 'tool-call':
      return { type: 'tool-call', callId: part.toolCallId, toolName: part.toolName, input: part.input };
    case 'tool-result':
      return { type: 'tool-result', callId: part.toolCallId, toolName: part.toolName, output: part.output };
    case 'tool-error':
      return {
        type: 'tool-error',
        callId: part.toolCallId,
        toolName: part.toolName,
        message: describeError(part.error),
      };
    case 'finish-step': {
      progress.rounds += 1;
      progress.lastFinishReason = part.finishReason;
      const usage = convertUsage(part.usage);
      progress.usage = addUsage(progress.usage, usage);
      return { type: 'round-finished', round: progress.rounds, usage };
    }
    default:
      return undefined;
  }
}

/** Adds up the output tokens of the steps that the AI SDK recorded, counting an unreported count as 0. */
function sumOutputTokens(steps: readonly StepUsage[]): number {
  return steps.reduce((total, step) => total + (step.usage.outputTokens ?? 0), 0);
}

/** Chooses what a failed run rejects with: a tool's throw, then the caller's abort, then the error itself. */
function selectRejection(
  error: unknown,
  toolFailure: { readonly error: unknown } | undefined,
  signal: AbortSignal | undefined,
): unknown {
  if (toolFailure !== undefined) return new JobRunError({ cause: toolFailure.error, reason: 'failed' });
  if (signal?.aborted === true) return signal.reason;
  return new JobRunError({ cause: error });
}
/** Returns the message without a cache breakpoint, keeping its other provider options. */
function unmarkMessage(message: ModelMessage): ModelMessage {
  const anthropic = message.providerOptions?.['anthropic'];
  if (anthropic?.['cacheControl'] === undefined) return message;
  const { cacheControl: _cacheControl, ...rest } = anthropic;
  return { ...message, providerOptions: { ...message.providerOptions, anthropic: rest } };
}
// endregion | Helpers
