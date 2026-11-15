import { describe, expect, it } from 'vitest';

import { JiraRefusalError } from '../JiraRefusalError.ts';

describe(JiraRefusalError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new JiraRefusalError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'JiraRefusalError' });
  });
});
