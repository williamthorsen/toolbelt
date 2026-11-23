import { describe, expect, it } from 'vitest';

import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import type { ProviderConnection } from '../../types/job.ts';
import { createModel } from '../createModel.ts';
import { runJobOnModel } from '../runJobOnModel.ts';

const CHECK_ROUNDS = 5;

describe(runJobOnModel, () => {
  it('sends Anthropic a breakpoint on the instructions and on the end of the earlier rounds', async () => {
    const bodies = await recordRequestBodies(
      { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'key-a' },
      buildAnthropicRound,
    );

    const second = bodies[1];
    expect(second).toMatchObject({ system: [{ cache_control: { type: 'ephemeral' } }] });
    expect(findLastBlock(second)).toMatchObject({ type: 'tool_result', cache_control: { type: 'ephemeral' } });
  });

  it('never sends Anthropic more than four breakpoints, however many rounds the job takes', async () => {
    const bodies = await recordRequestBodies(
      { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'key-a' },
      buildAnthropicRound,
    );

    expect(bodies).toHaveLength(CHECK_ROUNDS + 1);
    expect(bodies.map(countBreakpoints)).toStrictEqual([2, 3, 3, 3, 3, 3]);
  });

  it('sends another provider no cache marks', async () => {
    const bodies = await recordRequestBodies(
      { provider: 'openrouter', model: 'anthropic/claude-haiku-5-5', apiKey: 'key-r' },
      buildChatCompletionRound,
    );

    expect(bodies).toHaveLength(CHECK_ROUNDS + 1);
    expect(bodies.map((body) => JSON.stringify(body))).not.toContainEqual(expect.stringMatching(/cache|ephemeral/i));
  });
});

// region | Helpers
/** A tool call that a canned round returns. */
interface RoundCall {
  readonly callId: string;
  readonly toolName: string;
  readonly input: unknown;
}

/** Builds Anthropic's server-sent events for a round that ends in one tool call. */
function buildAnthropicRound({ callId, toolName, input }: RoundCall): string {
  return buildEventStream([
    {
      type: 'message_start',
      message: {
        id: `msg-${callId}`,
        type: 'message',
        role: 'assistant',
        model: 'claude-haiku-5-5',
        content: [],
        stop_reason: null,
        usage: { input_tokens: 10, output_tokens: 1 },
      },
    },
    {
      type: 'content_block_start',
      index: 0,
      content_block: { type: 'tool_use', id: callId, name: toolName, input: {} },
    },
    { type: 'content_block_delta', index: 0, delta: { type: 'input_json_delta', partial_json: JSON.stringify(input) } },
    { type: 'content_block_stop', index: 0 },
    { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 3 } },
    { type: 'message_stop' },
  ]);
}

/** Builds an OpenAI-compatible chat-completion stream for a round that ends in one tool call. */
function buildChatCompletionRound({ callId, toolName, input }: RoundCall): string {
  const chunk = { id: `chat-${callId}`, object: 'chat.completion.chunk', created: 0, model: 'm' };
  const toolCall = {
    index: 0,
    id: callId,
    type: 'function',
    function: { name: toolName, arguments: JSON.stringify(input) },
  };
  return buildEventStream([
    { ...chunk, choices: [{ index: 0, delta: { role: 'assistant', tool_calls: [toolCall] }, finish_reason: null }] },
    {
      ...chunk,
      choices: [{ index: 0, delta: {}, finish_reason: 'tool_calls' }],
      usage: { prompt_tokens: 10, completion_tokens: 3 },
    },
    '[DONE]',
  ]);
}

/** Serializes events as a server-sent-event stream of `data` lines. */
function buildEventStream(events: readonly unknown[]): string {
  return events.map((event) => `data: ${typeof event === 'string' ? event : JSON.stringify(event)}\n\n`).join('');
}

/** Counts the `cache_control` entries anywhere in a request body. */
function countBreakpoints(body: unknown): number {
  return JSON.stringify(body).match(/"cache_control"/g)?.length ?? 0;
}

/** Returns the last content block of an Anthropic request's last message. */
function findLastBlock(body: unknown): unknown {
  const messages: unknown = typeof body === 'object' && body !== null && 'messages' in body ? body.messages : [];
  const last: unknown = Array.isArray(messages) ? messages.at(-1) : undefined;
  const content: unknown = typeof last === 'object' && last !== null && 'content' in last ? last.content : [];
  return Array.isArray(content) ? content.at(-1) : undefined;
}

/**
 * Runs a job of `CHECK_ROUNDS` `check` rounds and a `submit` round on the connection, answering each request with a
 * canned round, and returns the request bodies.
 */
async function recordRequestBodies(
  connection: ProviderConnection,
  buildRound: (call: RoundCall) => string,
): Promise<unknown[]> {
  const bodies: unknown[] = [];
  const fetch: typeof globalThis.fetch = (_input, init) => {
    bodies.push(JSON.parse(typeof init?.body === 'string' ? init.body : 'null'));
    const round = bodies.length;
    const call =
      round > CHECK_ROUNDS
        ? { callId: `c${round}`, toolName: 'submit', input: { value: 'done' } }
        : { callId: `c${round}`, toolName: 'check', input: { draft: 'a' } };
    return Promise.resolve(new Response(buildRound(call), { headers: { 'content-type': 'text/event-stream' } }));
  };

  const outcome = await runJobOnModel(
    { ...createSubmitJob(), maxRounds: CHECK_ROUNDS + 1 },
    createModel(connection, fetch),
  );

  expect(outcome).toMatchObject({ status: 'completed', result: 'done' });
  return bodies;
}
// endregion | Helpers
