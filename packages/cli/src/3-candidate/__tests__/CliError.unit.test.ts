import { describe, expect, it } from 'vitest';

import { CliError } from '../CliError.ts';
import { ParseError } from '../ParseError.ts';
import { UsageError } from '../UsageError.ts';

describe(CliError, () => {
  it('defaults the exit code to 1', () => {
    expect(new CliError('Failed')).toMatchObject({ exitCode: 1, message: 'Failed', name: 'CliError' });
  });

  it.each([1, 2, 127, 255])('keeps the exit code %d', (exitCode) => {
    expect(new CliError('Failed', { exitCode }).exitCode).toBe(exitCode);
  });

  it.each([0, 256, -1, 1.5, NaN])('rejects the exit code %d', (exitCode) => {
    expect(() => new CliError('Failed', { exitCode })).toThrow(RangeError);
  });

  it('keeps its cause', () => {
    const cause = new Error('Root');

    expect(new CliError('Failed', { cause }).cause).toBe(cause);
  });

  it.each([
    ['UsageError', new UsageError('Bad input')],
    ['ParseError', new ParseError('unknown-flag', '--bogus', 'Unknown option: --bogus')],
  ])('is the base of %s, which exits 2', (_name, error) => {
    expect(error).toBeInstanceOf(CliError);
    expect(error.exitCode).toBe(2);
  });

  it('passes the cause of a UsageError through', () => {
    const cause = new Error('Root');

    expect(new UsageError('Bad input', { cause }).cause).toBe(cause);
    expect(new UsageError('Bad input')).not.toHaveProperty('cause');
  });
});
