export interface ExitMockVerdict {
  kind: ExitMockKind;
  /** The sentinel class the mock throws, on a `sentinel-clone` alone. */
  symbol?: string;
}

export type ExitMockKind = 'non-throwing' | 'sentinel-clone' | 'throwing' | 'unclassified';

const IMPLEMENTATION = /^\s*\.mockImplementation(?:Once)?\(/;
const THROWN_CLASS = /throw new (\w+)\(/;
const BARE_REFERENCE = /^[\w$.]+$/;

/**
 * Names what a `process.exit` mock is doing, from the text following the spy and the file that holds it.
 *
 * A mock throwing a class the same file declares reports as `sentinel-clone` rather than as the `throwing`
 * mock it also is, so one finding names the class to retire alongside the mock.
 *
 * `non-throwing` is claimed only against a body this read in full and found no `throw` in, because that kind
 * carries the defect severity. Everything else is `unclassified`: an implementation given as a bare reference,
 * one attached anywhere but the spy's own call chain, and one whose parentheses never balance.
 *
 * @internal
 */
export function classifyExitMock(after: string, source: string): ExitMockVerdict {
  if (!IMPLEMENTATION.test(after)) return { kind: 'unclassified' };

  const body = readImplementation(after);
  if (body === undefined) return { kind: 'unclassified' };

  const symbol = THROWN_CLASS.exec(body)?.[1];
  if (symbol !== undefined) {
    const declared = new RegExp(String.raw`\bclass ${symbol}\b[^\n]*\bextends\b`);
    return declared.test(source) ? { kind: 'sentinel-clone', symbol } : { kind: 'throwing' };
  }

  if (/\bthrow\b/.test(body)) return { kind: 'throwing' };
  return { kind: BARE_REFERENCE.test(body.trim()) ? 'unclassified' : 'non-throwing' };
}

// region | Helpers

/**
 * Reads the `mockImplementation` argument, or nothing where its parentheses never balance.
 *
 * Returning nothing is what keeps a body this could not read whole out of the `non-throwing` verdict, a
 * `throw` past the unbalanced point being invisible rather than absent.
 */
function readImplementation(after: string): string | undefined {
  const start = after.indexOf('(');
  let depth = 0;

  for (let index = start; index < after.length; index += 1) {
    if (after[index] === '(') depth += 1;
    else if (after[index] === ')') {
      depth -= 1;
      if (depth === 0) return after.slice(start + 1, index);
    }
  }

  return undefined;
}

// endregion | Helpers
