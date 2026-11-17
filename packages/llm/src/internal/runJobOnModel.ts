import { describeError } from '@williamthorsen/toolbelt.errors';
import {
  type FinishReason,
  type LanguageModel,
  type LanguageModelUsage,
  stepCountIs,
  streamText,
  type TextStreamPart,
  tool,
  type ToolSet,
} from 'ai';

import { JobRunError } from '../1-proposed/JobRunError.ts';
import type { Job, JobEvent, JobOutcome, JobTool, RunJobOptions, Usage } from '../types/job.ts';

/** What a run has counted so far. */
interface RunProgress {
  rounds: number;
  usage: Usage;
  lastFinishReason: FinishReason | undefined;
}

const ZERO_USAGE: Usage = { inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cacheWriteTokens: 0 };

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
  assertValidMaxRounds(job.maxRounds);
  signal?.throwIfAborted();

  // Ends the model's requests when a tool throws or the run fails.
  const controller = new AbortController();
  let toolFailure: { readonly error: unknown } | undefined;
  function recordToolFailure(error: unknown): void {
    toolFailure ??= { error };
    controller.abort();
  }

  const result = streamText({
    model,
    instructions: {
      role: 'system',
      content: job.instructions,
      providerOptions: { anthropic: { cacheControl: { type: 'ephemeral' } } },
    },
    prompt: job.input,
    tools: buildToolSet(job.tools, recordToolFailure),
    stopWhen: [stepCountIs(job.maxRounds), () => job.readResult() !== undefined],
    abortSignal: signal === undefined ? controller.signal : AbortSignal.any([signal, controller.signal]),
    // The loop below reads every error from the stream; the default handler would also log it.
    onError: () => {},
  });

  const progress: RunProgress = { rounds: 0, usage: ZERO_USAGE, lastFinishReason: undefined };
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
/** Adds two usage counts field by field. */
function addUsage(a: Usage, b: Usage): Usage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    cacheReadTokens: a.cacheReadTokens + b.cacheReadTokens,
    cacheWriteTokens: a.cacheWriteTokens + b.cacheWriteTokens,
  };
}

/** Throws a `RangeError` unless `maxRounds` is a positive integer. */
function assertValidMaxRounds(maxRounds: number): void {
  if (!Number.isSafeInteger(maxRounds) || maxRounds < 1) {
    throw new RangeError(`maxRounds must be a positive integer; received ${maxRounds}.`);
  }
}

/** Builds the outcome of a run that ended without failing. */
function buildOutcome<Result>(job: Job<Result>, { rounds, usage, lastFinishReason }: RunProgress): JobOutcome<Result> {
  const result = job.readResult();
  if (result !== undefined) return { status: 'completed', result, rounds, usage };
  // Only a round that ended in tool calls would have been followed by another, had the cap allowed it.
  const reason = rounds >= job.maxRounds && lastFinishReason === 'tool-calls' ? 'round-cap' : 'stopped';
  return { status: 'unfinished', reason, rounds, usage };
}

/** Wraps each job tool as an AI SDK tool whose `execute` reports a throw before rethrowing it. */
function buildToolSet(tools: Job<unknown>['tools'], onToolFailure: (error: unknown) => void): ToolSet {
  return Object.fromEntries(
    Object.entries(tools).map(([name, jobTool]: [string, JobTool]) => [
      name,
      tool({
        description: jobTool.description,
        inputSchema: jobTool.inputSchema,
        execute: async (input: unknown) => {
          try {
            return await jobTool.execute(input);
          } catch (error) {
            onToolFailure(error);
            throw error;
          }
        },
      }),
    ]),
  );
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

/** Chooses what a failed run rejects with: a tool's throw, then the caller's abort, then the error itself. */
function selectRejection(
  error: unknown,
  toolFailure: { readonly error: unknown } | undefined,
  signal: AbortSignal | undefined,
): unknown {
  if (toolFailure !== undefined) return new JobRunError({ cause: toolFailure.error });
  if (signal?.aborted === true) return signal.reason;
  return new JobRunError({ cause: error });
}
// endregion | Helpers
