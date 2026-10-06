import path from 'node:path';
import process from 'node:process';

import { describe, expect, it } from 'vitest';

import { parseArgs } from '../parseArgs.ts';
import { ParseError } from '../ParseError.ts';
import type { FlagSchema, OperandDefinition } from '../types.ts';
import { UsageError } from '../UsageError.ts';

const mixedFlags = {
  dryRun: { type: 'boolean', description: 'Report without writing' },
  output: { type: 'string', description: 'The output file', short: 'o' },
  verbose: { type: 'boolean', description: 'Print more', short: 'v' },
} satisfies FlagSchema;

describe(parseArgs, () => {
  describe('empty argv', () => {
    it('returns default flags, empty operands, and an empty rest', () => {
      const result = parseArgs([], { flags: mixedFlags });

      expect(result.flags).toStrictEqual({ dryRun: false, output: undefined, verbose: false });
      expect(result.operands).toStrictEqual({});
      expect(result.rest).toStrictEqual([]);
    });
  });

  describe('flag names', () => {
    it('derives the long name from the key in kebab case', () => {
      expect(parseArgs(['--dry-run'], { flags: mixedFlags }).flags.dryRun).toBe(true);
    });

    it('uses a declared long name in place of the key', () => {
      const flags = { skipChecks: { type: 'boolean', description: 'Skip', long: 'no-verify' } } satisfies FlagSchema;

      expect(parseArgs(['--no-verify'], { flags }).flags.skipChecks).toBe(true);
      expect(captureParseError(() => parseArgs(['--skip-checks'], { flags }))).toMatchObject({
        kind: 'unknown-flag',
        token: '--skip-checks',
      });
    });

    it('does not accept an unknown short name that equals a long name', () => {
      const flags = { x: { type: 'boolean', description: 'X' } } satisfies FlagSchema;

      expect(captureParseError(() => parseArgs(['-x'], { flags }))).toMatchObject({
        kind: 'unknown-flag',
        token: '-x',
      });
    });
  });

  describe('boolean flags', () => {
    it('sets a boolean flag through its short name', () => {
      expect(parseArgs(['-v'], { flags: mixedFlags }).flags.verbose).toBe(true);
    });

    it('throws unexpected-value when a boolean flag is given a value via = form', () => {
      const error = captureParseError(() => parseArgs(['--dry-run=true'], { flags: mixedFlags }));
      expect(error).toMatchObject({ kind: 'unexpected-value', token: '--dry-run' });
      expect(error.message).toBe('Option does not accept a value: --dry-run');
    });

    it('expands clustered short boolean flags', () => {
      const flags = {
        all: { type: 'boolean', description: 'All', short: 'a' },
        build: { type: 'boolean', description: 'Build', short: 'b' },
      } satisfies FlagSchema;

      expect(parseArgs(['-ab'], { flags }).flags).toStrictEqual({ all: true, build: true });
      expect(captureParseError(() => parseArgs(['-ax'], { flags }))).toMatchObject({
        kind: 'unknown-flag',
        token: '-x',
      });
    });
  });

  describe('string flags', () => {
    it('parses the = form, the space-separated form, and the short form', () => {
      expect(parseArgs(['--output=a.js'], { flags: mixedFlags }).flags.output).toBe('a.js');
      expect(parseArgs(['--output', 'a.js'], { flags: mixedFlags }).flags.output).toBe('a.js');
      expect(parseArgs(['-o', 'a.js'], { flags: mixedFlags }).flags.output).toBe('a.js');
    });

    it('throws missing-value on an empty = value, a trailing flag, or a following flag', () => {
      const error = captureParseError(() => parseArgs(['--output='], { flags: mixedFlags }));
      expect(error).toMatchObject({ kind: 'missing-value', token: '--output' });
      expect(error.message).toBe('Missing value for option: --output');
      expect(captureParseError(() => parseArgs(['--output'], { flags: mixedFlags }))).toMatchObject({
        kind: 'missing-value',
        token: '--output',
      });
      expect(captureParseError(() => parseArgs(['--output', '--dry-run'], { flags: mixedFlags }))).toMatchObject({
        kind: 'missing-value',
        token: '--output',
      });
    });

    it('accepts an inline value that starts with a dash', () => {
      expect(parseArgs(['--output=-x'], { flags: mixedFlags }).flags.output).toBe('-x');
    });

    it('treats bare - as a value', () => {
      expect(parseArgs(['--output', '-'], { flags: mixedFlags }).flags.output).toBe('-');
    });

    it('takes the last value of a repeated flag', () => {
      expect(parseArgs(['-o', 'a', '--output', 'b'], { flags: mixedFlags }).flags.output).toBe('b');
    });
  });

  describe('choices', () => {
    const flags = {
      bump: { type: 'string', description: 'The bump', choices: ['major', 'minor', 'patch'] },
    } satisfies FlagSchema;

    it('accepts a listed value', () => {
      expect(parseArgs(['--bump', 'minor'], { flags }).flags.bump).toBe('minor');
    });

    it('throws invalid-choice on an unlisted value', () => {
      const error = captureParseError(() => parseArgs(['--bump', 'x'], { flags }));
      expect(error).toMatchObject({ kind: 'invalid-choice', token: 'x' });
      expect(error.message).toBe('Invalid value for --bump: x. Expected one of: major, minor, patch');
    });
  });

  describe('parse', () => {
    const flags = {
      max: {
        type: 'string',
        description: 'The maximum',
        parse: (raw: string): number => {
          const value = Number(raw);
          if (!Number.isSafeInteger(value)) throw new Error('Expected an integer.');
          return value;
        },
      },
    } satisfies FlagSchema;

    it('returns the converted value', () => {
      expect(parseArgs(['--max', '3'], { flags }).flags.max).toBe(3);
    });

    it('throws invalid-value with the thrown message and the thrown error as cause', () => {
      const error = captureParseError(() => parseArgs(['--max', 'x'], { flags }));
      expect(error).toMatchObject({ kind: 'invalid-value', token: 'x' });
      expect(error.message).toBe('Invalid value for --max: x. Expected an integer.');
      expect(error.cause).toBeInstanceOf(Error);
    });

    it('receives a path already resolved against baseDir', () => {
      const pathFlags = {
        root: { type: 'path', description: 'Root', parse: (raw: string) => `<${raw}>` },
      } satisfies FlagSchema;

      expect(parseArgs(['--root', 'a'], { flags: pathFlags }, { baseDir: '/base' }).flags.root).toBe('</base/a>');
    });
  });

  describe('default', () => {
    const flags = {
      level: { type: 'string', description: 'The level', choices: ['low', 'high'], default: 'low' },
      max: { type: 'string', description: 'The maximum', parse: Number, default: 10 },
    } satisfies FlagSchema;

    it('applies when the flag is absent, without passing through parse', () => {
      expect(parseArgs([], { flags }).flags).toStrictEqual({ level: 'low', max: 10 });
    });

    it('is ignored when the flag is given', () => {
      expect(parseArgs(['--level', 'high', '--max', '3'], { flags }).flags).toStrictEqual({ level: 'high', max: 3 });
    });
  });

  describe('path flags', () => {
    const flags = { config: { type: 'path', description: 'The config file' } } satisfies FlagSchema;

    it('resolves against a given baseDir', () => {
      expect(parseArgs(['--config', 'a/b.json'], { flags }, { baseDir: '/base' }).flags.config).toBe('/base/a/b.json');
    });

    it('resolves against the working directory by default', () => {
      expect(parseArgs(['--config', 'b.json'], { flags }).flags.config).toBe(path.resolve(process.cwd(), 'b.json'));
    });

    it('keeps an absolute path', () => {
      expect(parseArgs(['--config', '/x.json'], { flags }, { baseDir: '/base' }).flags.config).toBe('/x.json');
    });
  });

  describe('unknown flags', () => {
    it('throws unknown-flag, echoing the typed form', () => {
      const error = captureParseError(() => parseArgs(['--unknown'], { flags: mixedFlags }));
      expect(error).toMatchObject({ kind: 'unknown-flag', token: '--unknown' });
      expect(error.message).toBe('Unknown option: --unknown');
      expect(captureParseError(() => parseArgs(['-x'], { flags: mixedFlags }))).toMatchObject({
        kind: 'unknown-flag',
        token: '-x',
      });
      expect(captureParseError(() => parseArgs(['--unknown=val'], { flags: mixedFlags }))).toMatchObject({
        kind: 'unknown-flag',
        token: '--unknown',
      });
    });

    it('reports the first offending token', () => {
      expect(captureParseError(() => parseArgs(['--bogus', 'extra'], {}))).toMatchObject({
        kind: 'unknown-flag',
        token: '--bogus',
      });
      expect(captureParseError(() => parseArgs(['extra', '--bogus'], {}))).toMatchObject({
        kind: 'unexpected-positional',
        token: 'extra',
      });
    });
  });

  describe('operands', () => {
    const operands = [
      { name: 'action', description: 'The action', choices: ['start', 'stop'] },
      { name: 'service', description: 'The service', optional: true },
    ] as const satisfies readonly OperandDefinition[];

    it('fills operands in order, interleaved with flags', () => {
      const result = parseArgs(['start', '-v', 'db'], { flags: mixedFlags, operands });

      expect(result.operands).toStrictEqual({ action: 'start', service: 'db' });
      expect(result.flags.verbose).toBe(true);
    });

    it('leaves an absent optional operand undefined', () => {
      expect(parseArgs(['stop'], { operands }).operands).toStrictEqual({ action: 'stop', service: undefined });
    });

    it('throws missing-operand on an absent required operand', () => {
      const error = captureParseError(() => parseArgs([], { operands }));
      expect(error).toMatchObject({ kind: 'missing-operand', token: '<action>' });
      expect(error.message).toBe('Missing argument: <action>');
    });

    it('throws invalid-choice on an operand outside its choices', () => {
      const error = captureParseError(() => parseArgs(['go'], { operands }));
      expect(error).toMatchObject({ kind: 'invalid-choice', token: 'go' });
      expect(error.message).toBe('Invalid value for <action>: go. Expected one of: start, stop');
    });

    it('throws unexpected-positional on an extra positional', () => {
      const error = captureParseError(() => parseArgs(['start', 'db', 'x'], { operands }));
      expect(error).toMatchObject({ kind: 'unexpected-positional', token: 'x' });
      expect(error.message).toBe('Unexpected positional argument: x');
    });

    it('rejects any positional, including bare -, when no operands are declared', () => {
      expect(captureParseError(() => parseArgs(['-'], {}))).toMatchObject({
        kind: 'unexpected-positional',
        token: '-',
      });
    });

    it('collects a variadic operand, and an absent optional one as []', () => {
      const variadic = [
        { name: 'first', description: 'First' },
        { name: 'others', description: 'Others', optional: true, variadic: true },
      ] as const satisfies readonly OperandDefinition[];

      expect(parseArgs(['a', 'b', 'c'], { operands: variadic }).operands).toStrictEqual({
        first: 'a',
        others: ['b', 'c'],
      });
      expect(parseArgs(['a'], { operands: variadic }).operands).toStrictEqual({ first: 'a', others: [] });
    });

    it('requires at least one value for a required variadic operand', () => {
      const variadic = [
        { name: 'files', description: 'Files', variadic: true },
      ] as const satisfies readonly OperandDefinition[];

      expect(captureParseError(() => parseArgs([], { operands: variadic }))).toMatchObject({
        kind: 'missing-operand',
        token: '<files>',
      });
    });

    it('fills operands with the positionals after --', () => {
      const free = [
        { name: 'first', description: 'First' },
        { name: 'second', description: 'Second' },
      ] as const satisfies readonly OperandDefinition[];
      const result = parseArgs(['-v', '--', '--output', 'x'], { flags: mixedFlags, operands: free });

      expect(result.operands).toStrictEqual({ first: '--output', second: 'x' });
      expect(result.flags.output).toBeUndefined();
    });
  });

  describe('stopAtPositional', () => {
    const flags = {
      filter: { type: 'string', description: 'The filter', short: 'F' },
      quiet: { type: 'boolean', description: 'Quiet', short: 'q' },
    } satisfies FlagSchema;

    it('returns the first positional and everything after it, unparsed, in rest', () => {
      const result = parseArgs(['-q', 'build', '--bogus', '--', 'x'], { flags }, { stopAtPositional: true });

      expect(result.flags.quiet).toBe(true);
      expect(result.rest).toStrictEqual(['build', '--bogus', '--', 'x']);
    });

    it('keeps -- as the first element of rest', () => {
      expect(parseArgs(['-q', '--', '--json'], { flags }, { stopAtPositional: true }).rest).toStrictEqual([
        '--',
        '--json',
      ]);
    });

    it('parses clustered and attached short flags before the positional', () => {
      const clustered = parseArgs(['-qF', 'pkg', 'test'], { flags }, { stopAtPositional: true });
      expect(clustered.flags).toStrictEqual({ filter: 'pkg', quiet: true });
      expect(clustered.rest).toStrictEqual(['test']);

      const attached = parseArgs(['-Fpkg', 'test'], { flags }, { stopAtPositional: true });
      expect(attached.flags.filter).toBe('pkg');
      expect(attached.rest).toStrictEqual(['test']);
    });

    it('still rejects an unknown flag before the positional', () => {
      expect(
        captureParseError(() => parseArgs(['--bogus', 'test'], { flags }, { stopAtPositional: true })),
      ).toMatchObject({ kind: 'unknown-flag', token: '--bogus' });
    });
  });

  describe('errors', () => {
    it('throws ParseError as a UsageError', () => {
      expect(() => parseArgs(['--x'], {})).toThrow(UsageError);
    });

    it('throws a plain Error on an invalid spec', () => {
      const flags = { help: { type: 'boolean', description: 'Help' } } satisfies FlagSchema;

      expect(() => parseArgs([], { flags })).toThrow(/reserved or already declared/);
    });
  });
});

// region | Helpers

/** Returns the `ParseError` that the call throws, and rethrows any other error. */
function captureParseError(parse: () => unknown): ParseError {
  try {
    parse();
  } catch (error: unknown) {
    if (!(error instanceof ParseError)) throw error;
    return error;
  }
  throw new Error('Expected a ParseError, but nothing was thrown.');
}

// endregion | Helpers
