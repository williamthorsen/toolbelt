import { describe, expect, it } from 'vitest';

import { createSubmitJob } from '../../test-utils/createSubmitJob.ts';
import type { JobHandlerOptions } from '../../types/endpoint.ts';
import { createJobHandler } from '../createJobHandler.ts';

const OPTIONS: JobHandlerOptions<string> = {
  connection: { provider: 'anthropic', model: 'claude-haiku-5-5', apiKey: 'unused' },
  maxInputLength: 100,
  createJob: () => createSubmitJob(),
};

describe(createJobHandler, () => {
  it('returns a handler that answers requests', async () => {
    const handler = createJobHandler(OPTIONS);

    const response = await handler(new Request('https://app.example/api/job'));

    expect(response.status).toBe(405);
  });

  it.each([
    ['maxInputLength', { maxInputLength: 0 }],
    ['maxRounds', { maxRounds: 1.5 }],
  ])('throws a RangeError when %s is not a positive integer', (name, override) => {
    const create = () => createJobHandler({ ...OPTIONS, ...override });

    expect(create).toThrow(RangeError);
    expect(create).toThrow(`${name} must be a positive integer`);
  });
});
