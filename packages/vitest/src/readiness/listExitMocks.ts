import { classifyExitMock, type ExitMockKind } from './classifyExitMock.ts';

export interface ExitMock {
  kind: ExitMockKind;
  line: number;
  /** The sentinel class the mock throws, on a `sentinel-clone` alone. */
  symbol?: string;
}

const SPY = /\bvi\s*\.\s*spyOn\(\s*process\s*,\s*(['"])exit\1\s*\)/g;
const LOOKAHEAD = 400;

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

  SPY.lastIndex = 0;
  let match = SPY.exec(source);
  while (match !== null) {
    const end = match.index + match[0].length;
    const after = source.slice(end, end + LOOKAHEAD);
    const kind = classifyExitMock(after, source);

    mocks.push({ kind, line: countLines(source, match.index), ...findSymbol(kind, after) });
    match = SPY.exec(source);
  }

  return mocks;
}

// region | Helpers

/** Counts the 1-based line the offset falls on. */
function countLines(source: string, offset: number): number {
  let line = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === '\n') line += 1;
  }
  return line;
}

/** Names the thrown sentinel class, on a `sentinel-clone` alone. */
function findSymbol(kind: ExitMockKind, after: string): { symbol?: string } {
  if (kind !== 'sentinel-clone') return {};
  const symbol = /throw new (\w+)\(/.exec(after)?.[1];
  return symbol === undefined ? {} : { symbol };
}

// endregion | Helpers
