import { describe, expect, it } from 'vitest';

import { formatCrashReport } from '../installCrashHandler.ts';

describe(formatCrashReport, () => {
  it('reports an error by its message, followed by its frames', () => {
    const report = formatCrashReport('demo', buildError('disk full'));

    expect(report).toBe('demo: internal error: disk full\n    at first (a.ts:1:1)\n    at second (b.ts:2:2)\n');
  });

  it('prints a multi-line message once, above the frames', () => {
    const report = formatCrashReport('demo', buildError('line one\nline two'));

    expect(report).toBe(
      'demo: internal error: line one\nline two\n    at first (a.ts:1:1)\n    at second (b.ts:2:2)\n',
    );
  });

  it('reports the message line alone for an error without a stack', () => {
    const error = new Error('bare');
    delete error.stack;

    expect(formatCrashReport('demo', error)).toBe('demo: internal error: bare\n');
  });

  it('reports each error in the cause chain with its frames', () => {
    const report = formatCrashReport('demo', buildError('outer', buildError('inner', 'root cause')));

    expect(report.split('\n')).toStrictEqual([
      'demo: internal error: outer',
      '    at first (a.ts:1:1)',
      '    at second (b.ts:2:2)',
      'caused by: inner',
      '    at first (a.ts:1:1)',
      '    at second (b.ts:2:2)',
      "caused by: 'root cause'",
      '',
    ]);
  });

  it('stops at a cause that the chain has already reported', () => {
    const outer = buildError('outer');
    outer.cause = buildError('inner', outer);

    expect(formatCrashReport('demo', outer).match(/caused by:/gu)).toHaveLength(1);
  });

  it.each([
    ['an object', { code: 7 }, '{ code: 7 }'],
    ['a primitive', 'boom', "'boom'"],
    ['a null-prototype object', Object.create(null), '[Object: null prototype] {}'],
  ])('reports %s that is not an `Error` by its inspect form, without frames', (_label, value, expected) => {
    expect(formatCrashReport('demo', value)).toBe(`demo: internal error: ${expected}\n`);
  });
});

// region | Helpers

/** Builds an error with a fixed two-frame stack, so that the report does not depend on where the test runs. */
function buildError(message: string, cause?: unknown): Error {
  const error = new Error(message, { cause });
  // eslint-disable-next-line unicorn/no-error-property-assignment -- a fixed stack keeps the expected report independent of where the test runs.
  error.stack = `Error: ${message}\n    at first (a.ts:1:1)\n    at second (b.ts:2:2)`;
  return error;
}

// endregion | Helpers
