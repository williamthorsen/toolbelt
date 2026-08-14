export type ExitMockKind = 'non-throwing' | 'sentinel-clone' | 'throwing' | 'unclassified';

const IMPLEMENTATION = /^\s*\.mockImplementation\(/;
const THROWN_CLASS = /throw new (\w+)\(/;
const BARE_REFERENCE = /^[\w$.]+$/;

/**
 * Names what a `process.exit` mock is doing, from the text following the spy and the file that holds it.
 *
 * A mock throwing a class the same file declares reports as `sentinel-clone` rather than as the `throwing`
 * mock it also is, so one finding names the class to retire alongside the mock.
 *
 * Only an implementation passed as a bare reference is `unclassified`. Anything else carries a body, and a
 * body holding no `throw` is evidence rather than an absence of it.
 *
 * @internal
 */
export function classifyExitMock(after: string, source: string): ExitMockKind {
  if (!IMPLEMENTATION.test(after)) return 'non-throwing';

  const body = readImplementation(after);
  const thrown = THROWN_CLASS.exec(body);

  if (thrown !== null) {
    const declared = new RegExp(String.raw`\bclass ${thrown[1]}\b[^\n]*\bextends\b`);
    return declared.test(source) ? 'sentinel-clone' : 'throwing';
  }

  if (/\bthrow\b/.test(body)) return 'throwing';
  return BARE_REFERENCE.test(body.trim()) ? 'unclassified' : 'non-throwing';
}

// region | Helpers

/** Reads the `mockImplementation` argument by matching parentheses from the call's own. */
function readImplementation(after: string): string {
  const start = after.indexOf('(');
  let depth = 0;
  for (let index = start; index < after.length; index += 1) {
    if (after[index] === '(') depth += 1;
    else if (after[index] === ')') {
      depth -= 1;
      if (depth === 0) return after.slice(start + 1, index);
    }
  }
  return after.slice(start + 1);
}

// endregion | Helpers
