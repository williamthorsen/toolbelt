import { describe, expect, it } from 'vitest';

import * as candidateExports from '../../3-candidate/index.ts';
import { PACKAGE_NAME } from '../packageName.ts';
import { countAdoptedCalls, summarizeSources } from '../summarizeSources.ts';

// A consumer catches `ProcessExitError` rather than calling it, so no call site of it counts as adoption.
const UNCALLED_EXPORTS = new Set(['ProcessExitError']);

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

  it('counts each call where a source makes several', () => {
    const text = `import { disposeOnTestFinished, makeFixture, silenceConsole } from '@williamthorsen/toolbelt.vitest/candidate';
const tree = disposeOnTestFinished(createTempTree({}));
const it = test.extend('silent', makeFixture(() => silenceConsole(['warn'])));`;

    expect(countAdoptedCalls(text)).toBe(3);
  });

  // Fails when the tier gains a callable export that nothing added to the alternation this counts against.
  it('counts a call to every export a consumer calls', () => {
    const callable = Object.entries(candidateExports)
      .filter(([name, value]) => typeof value === 'function' && !UNCALLED_EXPORTS.has(name))
      .map(([name]) => name);

    const uncounted = callable.filter(
      (name) => countAdoptedCalls(`import {} from '${PACKAGE_NAME}/candidate';\n${name}();`) === 0,
    );

    expect(callable).not.toHaveLength(0);
    expect(uncounted).toStrictEqual([]);
  });
});
