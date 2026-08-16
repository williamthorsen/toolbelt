import { describe, expect, it } from 'vitest';

import { countAdoptedCalls, summarizeSources } from '../summarizeSources.ts';

describe(summarizeSources, () => {
  it('attaches the path to every finding and counts the sources read', () => {
    const sources = [{ path: 'a.test.ts', text: "vi.spyOn(process, 'exit').mockImplementation(() => {});" }];

    expect(summarizeSources(sources)).toStrictEqual({
      adopted: 0,
      findings: [{ kind: 'non-throwing', line: 1, path: 'a.test.ts' }],
      sourceCount: 1,
    });
  });
});

describe(countAdoptedCalls, () => {
  it('counts calls in a source importing the package', () => {
    const text = `import { throwOnProcessExit } from '@williamthorsen/toolbelt.vitest/candidate';
using _exit = throwOnProcessExit();`;

    expect(countAdoptedCalls(text)).toBe(1);
  });

  it('counts nothing where the name is the project’s own', () => {
    expect(countAdoptedCalls('using _exit = throwOnProcessExit();')).toBe(0);
  });

  it('counts every export the package publishes', () => {
    const text = `import { disposeOnTestFinished, makeFixture, silenceConsole } from '@williamthorsen/toolbelt.vitest/candidate';
const tree = disposeOnTestFinished(createTempTree({}));
const it = test.extend('silent', makeFixture(() => silenceConsole(['warn'])));`;

    expect(countAdoptedCalls(text)).toBe(3);
  });
});
