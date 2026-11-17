import { execFileSync } from 'node:child_process';

import { assert, describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Job, ProviderConnection } from '../../types/job.ts';
import { runJob } from '../runJob.ts';

const MODEL = 'claude-haiku-5-5';

const RUN_TIMEOUT_MS = 60_000;

/** About three times the 488 input and output tokens that the job measured on `claude-haiku-5-5`. */
const TOKEN_CEILING = 1500;

const connection = findAnthropicConnection();

describe.skipIf(connection === undefined)('runJob on Anthropic', () => {
  it(
    'runs a job to its result through the browser and credential headers',
    async () => {
      assert(connection !== undefined, 'The suite skips without a connection.');

      const outcome = await runJob(createGreetingJob(), connection);

      expect(outcome).toMatchObject({ status: 'completed', result: 'Hello, Ada' });
      expect(outcome.usage.inputTokens + outcome.usage.outputTokens).toBeLessThan(TOKEN_CEILING);
    },
    RUN_TIMEOUT_MS,
  );
});

// region | Helpers
/** Creates a job whose one tool records the greeting that the model submits. */
function createGreetingJob(): Job<string> {
  let greeting: string | undefined;
  return {
    instructions: 'Greet the person named in the input by calling the `submit` tool with "Hello, " and their name.',
    input: 'Ada',
    maxRounds: 3,
    readResult: () => greeting,
    tools: {
      submit: {
        description: 'Submits the greeting.',
        inputSchema: z.object({ greeting: z.string() }),
        execute: (input: { greeting: string }) => {
          greeting = input.greeting;
          return 'Submitted.';
        },
      },
    },
  };
}

/**
 * Returns a connection on the `ant` CLI's login, which exercises the bearer-token path, or else on
 * `ANTHROPIC_API_KEY`; `undefined` when neither is available.
 */
function findAnthropicConnection(): ProviderConnection | undefined {
  try {
    const authToken = execFileSync('ant', ['auth', 'print-credentials', '--access-token'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (authToken !== '') return { provider: 'anthropic', model: MODEL, authToken };
  } catch {
    // Fall through to the API key when `ant` is missing or not signed in.
  }
  const apiKey = process.env['ANTHROPIC_API_KEY'];
  return apiKey === undefined || apiKey === '' ? undefined : { provider: 'anthropic', model: MODEL, apiKey };
}
// endregion | Helpers
