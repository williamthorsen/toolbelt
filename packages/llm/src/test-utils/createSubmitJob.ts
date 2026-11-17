import { z } from 'zod';

import type { Job } from '../types/job.ts';

/**
 * Creates a job whose `submit` tool sets the result and whose `check` tool reports success, with any tool replaced
 * by an override's `execute`.
 */
export function createSubmitJob(overrides: { check?: () => unknown } = {}): Job<string> {
  let result: string | undefined;
  return {
    instructions: 'Convert the input.',
    input: 'Some prompt',
    maxRounds: 5,
    readResult: () => result,
    tools: {
      check: {
        description: 'Checks a draft.',
        inputSchema: z.object({ draft: z.string() }),
        execute: overrides.check ?? (() => ({ ok: true })),
      },
      submit: {
        description: 'Submits the result.',
        inputSchema: z.object({ value: z.string() }),
        execute: (input: { value: string }) => {
          result = input.value;
          return 'accepted';
        },
      },
    },
  };
}
