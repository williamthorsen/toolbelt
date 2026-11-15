import { describe, expect, it } from 'vitest';

import { JiraTokenCommandError } from '../JiraTokenCommandError.ts';

describe(JiraTokenCommandError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new JiraTokenCommandError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'JiraTokenCommandError' });
  });
});
