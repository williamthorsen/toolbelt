import { describe, expect, it } from 'vitest';

import { JiraSettingError } from '../JiraSettingError.ts';

describe(JiraSettingError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new JiraSettingError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'JiraSettingError' });
  });
});
