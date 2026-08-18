import { blankNonCode, getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

import { classifyExitMock, type ExitMockVerdict } from './classifyExitMock.ts';

export interface ExitMock extends ExitMockVerdict {
  line: number;
}

const SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;

/**
 * Lists every `process.exit` mock in a test file, each named by what it is doing.
 *
 * The anchor is exact. `vi.spyOn(process, 'exit')` is the only way to intercept the call, so unlike a sweep
 * keyed on a helper's name there is no variant that lands outside it; every difference between hand-rolled
 * mocks is downstream of this call and reachable from it.
 *
 * The anchor reads the spied method's name out of a string literal, so it is the one detector that cannot scan
 * blanked code: `'exit'` blanks like any other string. It matches the source and reads the verdict off the
 * blanked text instead, which the equal offsets of the two make exact.
 *
 * @internal
 */
export function listExitMocks(source: string): ExitMock[] {
  const code = blankNonCode(source);
  const mocks: ExitMock[] = [];

  for (const match of source.matchAll(SPY)) {
    // The anchor's own first character survives blanking exactly where the spy is code the runtime runs.
    if (code[match.index] !== source[match.index]) continue;

    const after = code.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, code), line: getLineAtOffset(code, match.index) });
  }

  return mocks;
}
