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

  it('reports the disposal error and the suppressed error of a `SuppressedError`, indented under it', () => {
    const wrapper = stampStack(new SuppressedError(buildError('dispose failed'), buildError('body failed'), 'outer'));

    expect(formatCrashReport('demo', wrapper).split('\n')).toStrictEqual([
      'demo: internal error: outer',
      '    at first (a.ts:1:1)',
      '    at second (b.ts:2:2)',
      '  error: dispose failed',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      '  suppressed: body failed',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      '',
    ]);
  });

  it('reports each error of an `AggregateError`, labelled by its index', () => {
    const wrapper = stampStack(new AggregateError([buildError('first failed'), buildError('second failed')], 'all'));

    expect(formatCrashReport('demo', wrapper).split('\n')).toStrictEqual([
      'demo: internal error: all',
      '    at first (a.ts:1:1)',
      '    at second (b.ts:2:2)',
      '  errors[0]: first failed',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      '  errors[1]: second failed',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      '',
    ]);
  });

  it("reports a wrapped error's cause at the wrapped error's indent, before the wrapper's own cause", () => {
    const wrapper = new AggregateError([buildError('member', 'member cause')], 'all', { cause: 'wrapper cause' });
    delete wrapper.stack;

    expect(formatCrashReport('demo', wrapper).split('\n')).toStrictEqual([
      'demo: internal error: all',
      '  errors[0]: member',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      "  caused by: 'member cause'",
      "caused by: 'wrapper cause'",
      '',
    ]);
  });

  it('reports a wrapped value that is not an `Error` by its inspect form, without frames', () => {
    const wrapper = new AggregateError([{ code: 7 }], 'all');
    delete wrapper.stack;

    expect(formatCrashReport('demo', wrapper)).toBe('demo: internal error: all\n  errors[0]: { code: 7 }\n');
  });

  it('indents every line of a wrapped multi-line description', () => {
    const wrapper = new AggregateError([buildError('line one\nline two'), { code: 7, path: 'x'.repeat(80) }], 'all');
    delete wrapper.stack;

    expect(formatCrashReport('demo', wrapper).split('\n')).toStrictEqual([
      'demo: internal error: all',
      '  errors[0]: line one',
      '  line two',
      '      at first (a.ts:1:1)',
      '      at second (b.ts:2:2)',
      '  errors[1]: {',
      '    code: 7,',
      `    path: '${'x'.repeat(80)}'`,
      '  }',
      '',
    ]);
  });

  it('reports a value reached both as a wrapped error and as a cause once', () => {
    const shared = buildError('shared');
    const wrapper = new AggregateError([shared, shared], 'all', { cause: shared });

    expect(formatCrashReport('demo', wrapper).match(/shared/gu)).toHaveLength(1);
  });

  it('reports the wrapped errors of a `SuppressedError` reached as a cause', () => {
    const wrapper = new SuppressedError('dispose failed', 'body failed', 'suppressed');
    delete wrapper.stack;
    const outer = new Error('outer', { cause: wrapper });
    delete outer.stack;

    expect(formatCrashReport('demo', outer).split('\n')).toStrictEqual([
      'demo: internal error: outer',
      'caused by: suppressed',
      "  error: 'dispose failed'",
      "  suppressed: 'body failed'",
      '',
    ]);
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
  return stampStack(new Error(message, { cause }));
}

/** Replaces an error's stack with a fixed two-frame one, so that the report does not depend on where the test runs. */
function stampStack<T extends Error>(error: T): T {
  error.stack = `${error.name}: ${error.message}\n    at first (a.ts:1:1)\n    at second (b.ts:2:2)`;
  return error;
}

// endregion | Helpers
