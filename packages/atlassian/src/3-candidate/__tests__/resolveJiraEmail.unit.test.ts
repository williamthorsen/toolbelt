import { describe, expect, it } from 'vitest';

import { resolveJiraEmail } from '../resolveJiraEmail.ts';

const EMAIL = 'someone@example.com';

describe(resolveJiraEmail, () => {
  it('prefers a supplied email over every other source', () => {
    expect(
      resolveJiraEmail({ email: EMAIL, env: { JIRA_EMAIL: 'other@example.com' }, fallback: 'spec@example.com' }),
    ).toBe(EMAIL);
  });

  it('falls back to the environment before the fallback', () => {
    expect(resolveJiraEmail({ env: { JIRA_EMAIL: EMAIL }, fallback: 'spec@example.com' })).toBe(EMAIL);
  });

  it('falls back to the fallback, which is where a spec reaches the chain', () => {
    expect(resolveJiraEmail({ env: {}, fallback: EMAIL })).toBe(EMAIL);
  });

  it('trims what it returns', () => {
    expect(resolveJiraEmail({ email: `  ${EMAIL}  ` })).toBe(EMAIL);
  });

  it('treats an empty environment variable as a miss', () => {
    expect(resolveJiraEmail({ env: { JIRA_EMAIL: ' '.repeat(3) }, fallback: EMAIL })).toBe(EMAIL);
  });

  it('throws naming the environment variable where every source misses', () => {
    expect(() => resolveJiraEmail({ env: {} })).toThrow('No Atlassian account email was given');
  });
});
