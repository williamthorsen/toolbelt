import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { captureError } from '../captureError.ts';
import { captureStdio } from '../captureStdio.ts';
import { captureWarnings } from '../captureWarnings.ts';

describe(captureWarnings, () => {
  it.each([
    {
      label: 'a message alone',
      emit: () => process.emitWarning('plain'),
      expected: { name: 'Warning', message: 'plain' },
    },
    {
      label: 'a type and a code',
      emit: () => process.emitWarning('old', 'DeprecationWarning', 'DEP1'),
      expected: { name: 'DeprecationWarning', message: 'old', code: 'DEP1' },
    },
    {
      label: 'an options object',
      emit: () => process.emitWarning('slow', { type: 'PerfWarning', code: 'P1', detail: 'more' }),
      expected: { name: 'PerfWarning', message: 'slow', code: 'P1', detail: 'more' },
    },
    {
      label: 'a constructor in place of a type',
      emit: () => process.emitWarning('traced', captureWarnings),
      expected: { name: 'Warning', message: 'traced' },
    },
    {
      label: 'an empty type',
      emit: () => process.emitWarning('untyped', ''),
      expected: { name: 'Warning', message: 'untyped' },
    },
    {
      label: 'an options object with an empty type',
      emit: () => process.emitWarning('untyped', { type: '' }),
      expected: { name: 'Warning', message: 'untyped' },
    },
    {
      label: 'an options object with a falsy non-string type',
      emit: () => callEmitWarning('untyped', { type: 0 }),
      expected: { name: 'Warning', message: 'untyped' },
    },
  ])('if the call passes $label, records the Error that Node would emit', ({ emit, expected }) => {
    using captured = captureWarnings();

    emit();

    expect(captured.warnings).toHaveLength(1);
    expect(captured.warnings[0]).toBeInstanceOf(Error);
    expect(captured.warnings[0]).toMatchObject(expected);
  });

  it.each([
    { label: '42', args: [42] },
    { label: 'undefined', args: [undefined] },
    { label: 'a plain object', args: [{}] },
    { label: "'x', 5", args: ['x', 5] },
    { label: "'x', null", args: ['x', null] },
    { label: "'x', []", args: ['x', []] },
    { label: "'x', 'T', 7", args: ['x', 'T', 7] },
    { label: "'x', 'T', null", args: ['x', 'T', null] },
    { label: "'x', { type: 5 }", args: ['x', { type: 5 }] },
    { label: "'x', { code: 5 }", args: ['x', { code: 5 }] },
    { label: "'x', { code: null }", args: ['x', { code: null }] },
    { label: 'an Error and a type of 5', args: [new Error('e'), 5] },
    { label: "an Error, 'T', and a code of 7", args: [new Error('e'), 'T', 7] },
  ])('if the call passes $label, throws as Node does and records nothing', async ({ args }) => {
    using captured = captureWarnings();

    const error = await captureError(TypeError, () => callEmitWarning(...args));

    expect(error).toHaveProperty('code', 'ERR_INVALID_ARG_TYPE');
    expect(captured.warnings).toStrictEqual([]);
  });

  it('records an Error argument as given, ignoring the valid type and code passed with it', () => {
    const warning = new Error('given');

    using captured = captureWarnings();

    process.emitWarning(warning, 'IgnoredWarning', 'IGNORED');

    expect(captured.warnings).toStrictEqual([warning]);
    expect(warning.name).toBe('Error');
  });

  it('keeps a warning off stderr and does not fire the warning event', async () => {
    const heard: Error[] = [];
    const listener = (warning: Error): void => {
      heard.push(warning);
    };
    process.on('warning', listener);

    try {
      using stdio = captureStdio();
      {
        using _captured = captureWarnings();
        process.emitWarning('quiet');
      }
      await new Promise((resolve) => setImmediate(resolve));

      expect(stdio.stderr).toBe('');
      expect(heard).toStrictEqual([]);
    } finally {
      process.off('warning', listener);
    }
  });

  it('empties the record on reset', () => {
    using captured = captureWarnings();

    process.emitWarning('first');
    captured.reset();
    process.emitWarning('second');

    expect(captured.warnings.map((warning) => warning.message)).toStrictEqual(['second']);
  });

  it('restores the original emitWarning on dispose', () => {
    const before = Object.getOwnPropertyDescriptor(process, 'emitWarning');

    {
      using _captured = captureWarnings();
      expect(Object.getOwnPropertyDescriptor(process, 'emitWarning')).not.toStrictEqual(before);
    }

    expect(Object.getOwnPropertyDescriptor(process, 'emitWarning')).toStrictEqual(before);
  });
});

// region | Helpers

/** Calls `process.emitWarning` with arguments that its declared parameter types may exclude. */
function callEmitWarning(...args: unknown[]): void {
  Reflect.apply(process.emitWarning.bind(process), undefined, args);
}

// endregion | Helpers
