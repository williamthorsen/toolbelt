import { describe, expect, it } from 'vitest';

import { countAdoptedCalls, summarizeSources } from '../summarizeSources.ts';

const IMPORT = "import { describeError, isError } from '@williamthorsen/toolbelt.errors';";
const CANDIDATE_IMPORT = "import { chainError } from '@williamthorsen/toolbelt.errors/candidate';";

describe(countAdoptedCalls, () => {
  it('counts calls in a source that imports the package', () => {
    expect(countAdoptedCalls(`${IMPORT}\nlog(describeError(error));\nif (isError(error)) return;`)).toBe(2);
  });

  it('counts calls in a source importing through a maturity subpath', () => {
    expect(countAdoptedCalls(`${CANDIDATE_IMPORT}\nthrow chainError('failed', error);`)).toBe(1);
  });

  it('counts a require of the package', () => {
    expect(
      countAdoptedCalls(`const { describeError } = require('@williamthorsen/toolbelt.errors');\ndescribeError(e);`),
    ).toBe(1);
  });

  it('counts nothing in a source that calls its own helper of the same name', () => {
    const clone = [
      'export function describeError(error: unknown): string {',
      '  if (error instanceof Error) return error.message;',
      '  return String(error);',
      '}',
      'log(describeError(error));',
    ].join('\n');

    expect(countAdoptedCalls(clone)).toBe(0);
  });

  it('does not count the import statement itself as a call', () => {
    expect(countAdoptedCalls(IMPORT)).toBe(0);
  });
});

describe(summarizeSources, () => {
  it('counts a project holding only its own clone as having adopted nothing', () => {
    const clone = [
      'export function describeError(error: unknown): string {',
      '  if (error instanceof Error) return error.message;',
      '  return String(error);',
      '}',
      'log(describeError(error));',
    ].join('\n');

    const summary = summarizeSources([{ path: 'src/errors.ts', text: clone }]);

    expect(summary).toStrictEqual({
      adopted: 0,
      findings: [{ kind: 'describe-clone', line: 2, path: 'src/errors.ts', symbol: 'describeError' }],
      sourceCount: 1,
    });
  });

  it('attributes every finding to the source it came from', () => {
    const summary = summarizeSources([
      { path: 'src/a.ts', text: 'const m = e instanceof Error ? e.message : String(e);' },
      { path: 'src/b.ts', text: `${IMPORT}\nlog(describeError(error));` },
    ]);

    expect(summary).toStrictEqual({
      adopted: 1,
      findings: [{ kind: 'describe-inline', line: 1, path: 'src/a.ts' }],
      sourceCount: 2,
    });
  });

  it('summarizes an empty project', () => {
    expect(summarizeSources([])).toStrictEqual({ adopted: 0, findings: [], sourceCount: 0 });
  });
});
