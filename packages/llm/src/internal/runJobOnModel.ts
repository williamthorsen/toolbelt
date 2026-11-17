import { type LanguageModel, type LanguageModelUsage, stepCountIs, streamText, tool, type ToolSet } from 'ai';

import { JobRunError } from '../1-proposed/JobRunError.ts';
import type { Job, JobOutcome, JobTool, RunJobOptions, Usage } from '../types/job.ts';

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

  let rounds = 0;
  let usage = ZERO_USAGE;
  try {
    for await (const part of result.stream) {
      switch (part.type) {
        case 'text-delta':
          onEvent?.({ type: 'text-delta', text: part.text });
          break;
        case 'tool-call':
          onEvent?.({ type: 'tool-call', callId: part.toolCallId, toolName: part.toolName, input: part.input });
          break;
        case 'tool-result':
          onEvent?.({ type: 'tool-result', callId: part.toolCallId, toolName: part.toolName, output: part.output });
          break;
        case 'finish-step': {
          rounds += 1;
          const roundUsage = convertUsage(part.usage);
          usage = addUsage(usage, roundUsage);
          onEvent?.({ type: 'round-finished', round: rounds, usage: roundUsage });
          break;
        }
        case 'error':
          throw part.error;
      }
    }
  } catch (error) {
    controller.abort();
    throw selectRejection(error, toolFailure, signal);
  }
  if (toolFailure !== undefined || signal?.aborted === true) {
    throw selectRejection(undefined, toolFailure, signal);
  }

  return buildOutcome(job, rounds, usage);
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
function buildOutcome<Result>(job: Job<Result>, rounds: number, usage: Usage): JobOutcome<Result> {
  const result = job.readResult();
  if (result !== undefined) return { status: 'completed', result, rounds, usage };
  return { status: 'unfinished', reason: rounds >= job.maxRounds ? 'round-cap' : 'stopped', rounds, usage };
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
