import { describe, expect, it } from 'vitest';

import { chainError } from '../chainError.ts';

describe(chainError, () => {
  it('prefixes the message to the description of an Error cause', () => {
    const error = chainError('Failed to load config', new Error('ENOENT'));

    expect(error.message).toBe('Failed to load config: ENOENT');
  });

  it('prefixes the message to the description of a cause that is not an Error', () => {
    const error = chainError('Failed to load config', 'ENOENT');

    expect(error.message).toBe('Failed to load config: ENOENT');
  });

  it('carries an Error cause unchanged', () => {
    const cause = new Error('ENOENT');

    expect(chainError('Failed to load config', cause).cause).toBe(cause);
  });

  it('carries a cause that is not an Error unchanged', () => {
    const cause = { code: 'ENOENT' };

    expect(chainError('Failed to load config', cause).cause).toBe(cause);
  });

  it('omits its own frame from the stack', () => {
    const error = chainError('Failed to load config', new Error('ENOENT'));

    expect(error.stack).not.toContain('at chainError');
  });
});
