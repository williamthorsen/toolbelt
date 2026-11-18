import type { StandardJSONSchemaV1, StandardSchemaV1 } from '@standard-schema/spec';

/**
 * A unit of model work that an app defines once: the instructions, the input, the tools as pure functions, and a
 * round cap. Build a fresh job for each run, so that the tools' state does not leak between runs.
 */
export interface Job<Result> {
  /** The system instructions. */
  readonly instructions: string;
  /** The user message that starts the job. */
  readonly input: string;
  /** The tools that the model may call, keyed by tool name. */
  readonly tools: Readonly<Record<string, JobTool>>;
  /** The most model requests that the run makes; a positive integer. */
  readonly maxRounds: number;
  /**
   * Returns the job's result once its tools have produced one, and `undefined` until then. The runner calls it
   * after each round and stops as soon as it returns a value. The result must be JSON-serializable.
   */
  readResult(): Result | undefined;
}

/**
 * A tool that the model may call. `execute` is a pure function of its input and the job's own state; it returns an
 * expected failure as output, so that the model can act on it, and throws only on a defect, which ends the run.
 * Its output must be JSON-serializable.
 */
export interface JobTool<Input = unknown, Output = unknown> {
  /** What the tool does, for the model. */
  readonly description: string;
  /**
   * The schema of the tool's input. It implements Standard Schema, which validates the model's input before
   * `execute`, and Standard JSON Schema, which describes the input to the model. A zod 4 schema implements both.
   */
  readonly inputSchema: StandardSchemaV1<unknown, Input> & StandardJSONSchemaV1<unknown, Input>;
  execute(input: Input): Output | Promise<Output>;
}

/**
 * The provider account on which a job runs. A request goes from wherever `runJob` runs, the page included, straight
 * to the provider.
 */
export type ProviderConnection = AnthropicConnection | ApiKeyConnection;

/**
 * A connection to Anthropic. It takes an API key, or a bearer token such as a provider CLI login's, for which the
 * runner adds the OAuth beta header. The runner also sends `anthropic-dangerous-direct-browser-access`, so that the
 * request is accepted from a page. A header in `headers` overrides either one.
 */
export type AnthropicConnection = ConnectionBase & { readonly provider: 'anthropic' } & (
    { readonly apiKey: string; readonly authToken?: never } | { readonly apiKey?: never; readonly authToken: string }
  );

/** A connection to a provider that authenticates with an API key. */
export interface ApiKeyConnection extends ConnectionBase {
  readonly provider: 'google' | 'openai' | 'openrouter';
  readonly apiKey: string;
}

/** The fields that every provider connection has. */
export interface ConnectionBase {
  /** The provider's model id, such as `claude-sonnet-5-5`. */
  readonly model: string;
  /** Headers added to every request. */
  readonly headers?: Readonly<Record<string, string>>;
}

/** How `runJob` reports progress and is stopped. */
export interface RunJobOptions {
  /** Stops the job; the run then rejects with the signal's reason. */
  readonly signal?: AbortSignal;
  /** Receives each event as it happens. The runner does not await it, and a throw from it ends the run. */
  readonly onEvent?: (event: JobEvent) => void;
}

/**
 * Something that happened during a run. Every event is JSON-serializable. A `tool-call` is followed by its
 * `tool-result`, or by a `tool-error` when the call fails: an input that fails the tool's schema returns to the model,
 * and a throw from `execute` ends the run.
 */
export type JobEvent =
  | { readonly type: 'text-delta'; readonly text: string }
  | { readonly type: 'tool-call'; readonly callId: string; readonly toolName: string; readonly input: unknown }
  | { readonly type: 'tool-result'; readonly callId: string; readonly toolName: string; readonly output: unknown }
  | { readonly type: 'tool-error'; readonly callId: string; readonly toolName: string; readonly message: string }
  | { readonly type: 'round-finished'; readonly round: number; readonly usage: Usage };

/** Token counts. A count that the provider does not report is 0. */
export interface Usage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
}

/**
 * How a run ended: `completed` with the job's result, or `unfinished` because it reached `maxRounds` with the model
 * still calling tools (`round-cap`) or because the model stopped calling tools (`stopped`) before the job had a
 * result. It is JSON-serializable.
 */
export type JobOutcome<Result> =
  | { readonly status: 'completed'; readonly result: Result; readonly rounds: number; readonly usage: Usage }
  | {
      readonly status: 'unfinished';
      readonly reason: 'round-cap' | 'stopped';
      readonly rounds: number;
      readonly usage: Usage;
    };

/** Why a job failed; see `JobRunError`. */
export type JobFailureReason = 'credential-refused' | 'failed' | 'unreachable';
