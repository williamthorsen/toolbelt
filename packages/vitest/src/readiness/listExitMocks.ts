import { getLineAtOffset } from '@williamthorsen/toolbelt.adoption';

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
 * @internal
 */
export function listExitMocks(source: string): ExitMock[] {
  const mocks: ExitMock[] = [];

  for (const match of source.matchAll(SPY)) {
    const after = source.slice(match.index + match[0].length);
    mocks.push({ ...classifyExitMock(after, source), line: getLineAtOffset(source, match.index) });
  }

  return mocks;
}
