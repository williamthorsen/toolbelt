import { describe, expect, it } from 'vitest';

import { resolveJiraSite } from '../resolveJiraSite.ts';

const SITE = 'acme.atlassian.net';

describe(resolveJiraSite, () => {
  it('prefers a supplied site over every other source', () => {
    expect(
      resolveJiraSite({ env: { JIRA_SITE: 'env.atlassian.net' }, fallback: 'spec.atlassian.net', site: SITE }),
    ).toBe(SITE);
  });

  it('falls back to the environment before the fallback', () => {
    expect(resolveJiraSite({ env: { JIRA_SITE: SITE }, fallback: 'spec.atlassian.net' })).toBe(SITE);
  });

  it('falls back to the fallback, which is where a spec reaches the chain', () => {
    expect(resolveJiraSite({ env: {}, fallback: SITE })).toBe(SITE);
  });

  it('trims what it returns', () => {
    expect(resolveJiraSite({ site: `  ${SITE}  ` })).toBe(SITE);
  });

  it('treats an empty environment variable as a miss', () => {
    expect(resolveJiraSite({ env: { JIRA_SITE: ' '.repeat(3) }, fallback: SITE })).toBe(SITE);
  });

  it('throws naming the environment variable where every source misses', () => {
    expect(() => resolveJiraSite({ env: {} })).toThrow('JIRA_SITE');
  });
});
