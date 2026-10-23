import process from 'node:process';

import { describe, expect, it } from 'vitest';

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
  ])('if the call passes $label, records the Error that Node would emit', ({ emit, expected }) => {
    using captured = captureWarnings();

    emit();

    expect(captured.warnings).toHaveLength(1);
    expect(captured.warnings[0]).toBeInstanceOf(Error);
    expect(captured.warnings[0]).toMatchObject(expected);
  });

  it('records an Error argument as given, ignoring the type and code passed with it', () => {
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
