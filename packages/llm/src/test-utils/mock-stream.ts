import type { LanguageModelV4StreamPart, LanguageModelV4StreamResult } from '@ai-sdk/provider';
import { convertArrayToReadableStream } from 'ai/test';

/** The usage that every round built by `buildRound` reports, in the package's own shape. */
export const ROUND_USAGE = { inputTokens: 10, outputTokens: 3, cacheReadTokens: 5, cacheWriteTokens: 1 };

/**
 * Returns one round's stream: its content, then a finish part that reports `ROUND_USAGE`, with its output tokens
 * replaced by `outputTokens` when given.
 */
export function buildRound(
  content: LanguageModelV4StreamPart[],
  finishReason: 'length' | 'stop' | 'tool-calls' = 'tool-calls',
  outputTokens = ROUND_USAGE.outputTokens,
): LanguageModelV4StreamResult {
  return {
    stream: convertArrayToReadableStream<LanguageModelV4StreamPart>([
      { type: 'stream-start', warnings: [] },
      ...content,
      {
        type: 'finish',
        finishReason: { unified: finishReason, raw: finishReason },
        usage: {
          inputTokens: { total: 10, noCache: 4, cacheRead: 5, cacheWrite: 1 },
          outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
        },
      },
    ]),
  };
}

/** Returns the stream parts of one text block. */
export function buildText(text: string): LanguageModelV4StreamPart[] {
  return [
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: text },
    { type: 'text-end', id: 't' },
  ];
}

/** Returns a tool-call stream part with its input encoded as the provider sends it. */
export function buildToolCall(toolCallId: string, toolName: string, input: unknown): LanguageModelV4StreamPart {
  return { type: 'tool-call', toolCallId, toolName, input: JSON.stringify(input) };
}
