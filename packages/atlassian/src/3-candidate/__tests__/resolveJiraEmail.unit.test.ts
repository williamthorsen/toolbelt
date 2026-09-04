import { describe, expect, it } from 'vitest';

import { resolveJiraEmail } from '../resolveJiraEmail.ts';

const EMAIL = 'someone@example.com';

describe(resolveJiraEmail, () => {
  it('prefers a supplied email over the environment', () => {
    expect(resolveJiraEmail({ email: EMAIL, env: { JIRA_EMAIL: 'other@example.com' } })).toBe(EMAIL);
  });

  it('falls back to the environment', () => {
    expect(resolveJiraEmail({ env: { JIRA_EMAIL: EMAIL } })).toBe(EMAIL);
  });

  it('trims what it answers', () => {
    expect(resolveJiraEmail({ email: `  ${EMAIL}  ` })).toBe(EMAIL);
  });

  it('treats an empty environment variable as a miss', () => {
    expect(() => resolveJiraEmail({ env: { JIRA_EMAIL: ' '.repeat(3) } })).toThrow('JIRA_EMAIL');
  });

  it('throws naming the environment variable where every source misses', () => {
    expect(() => resolveJiraEmail({ env: {} })).toThrow('No Atlassian account email was given');
  });
});
