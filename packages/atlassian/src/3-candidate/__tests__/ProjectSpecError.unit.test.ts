import { describe, expect, it } from 'vitest';

import { ProjectSpecError } from '../ProjectSpecError.ts';

describe(ProjectSpecError, () => {
  it('has its own name and keeps the message and cause', () => {
    const cause = new Error('underlying');
    const error = new ProjectSpecError('What failed.', { cause });

    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({ cause, message: 'What failed.', name: 'ProjectSpecError' });
  });
});
