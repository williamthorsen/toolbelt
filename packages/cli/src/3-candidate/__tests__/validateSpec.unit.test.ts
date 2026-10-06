import { describe, expect, it } from 'vitest';

import type { FlagSchema, OperandDefinition } from '../types.ts';
import { validateSpec } from '../validateSpec.ts';

describe(validateSpec, () => {
  it('accepts a valid spec', () => {
    expect(() =>
      validateSpec({
        flags: {
          dryRun: { type: 'boolean', description: 'D', short: 'n', default: false },
          level: { type: 'string', description: 'L', choices: ['a', 'b'], default: 'a' },
          weird_key: { type: 'string', description: 'W', long: 'weird' },
        },
        operands: [
          { name: 'first', description: 'F' },
          { name: 'rest', description: 'R', optional: true, variadic: true },
        ],
      }),
    ).not.toThrow();
  });

  it.each<[string, FlagSchema, RegExp]>([
    ['a key that is not camelCase without long', { dry_run: { type: 'boolean', description: 'D' } }, /camelCase/],
    ['a long name with dashes', { x: { type: 'boolean', description: 'X', long: '--x' } }, /starts with a dash/],
    ['an empty long name', { x: { type: 'boolean', description: 'X', long: '' } }, /empty/],
    ['the reserved long name help', { help: { type: 'boolean', description: 'H' } }, /--help/],
    ['the reserved short name h', { hidden: { type: 'boolean', description: 'H', short: 'h' } }, /-h/],
    [
      'two flags whose long names collide',
      { dryRun: { type: 'boolean', description: 'D' }, other: { type: 'boolean', description: 'O', long: 'dry-run' } },
      /--dry-run/,
    ],
    [
      'a duplicate short name',
      { a: { type: 'boolean', description: 'A', short: 'x' }, b: { type: 'boolean', description: 'B', short: 'x' } },
      /-x/,
    ],
    ['a short name of two characters', { a: { type: 'boolean', description: 'A', short: 'ab' } }, /one character/],
    ['a dash as short name', { a: { type: 'boolean', description: 'A', short: '-' } }, /one character/],
    ['choices on a boolean flag', { a: { type: 'boolean', description: 'A', choices: ['x'] } }, /only a string flag/],
    ['choices on a path flag', { a: { type: 'path', description: 'A', choices: ['x'] } }, /only a string flag/],
    ['empty choices', { a: { type: 'string', description: 'A', choices: [] } }, /empty 'choices'/],
    ['valueHint on a boolean flag', { a: { type: 'boolean', description: 'A', valueHint: 'X' } }, /valueHint/],
    ['parse on a boolean flag', { a: { type: 'boolean', description: 'A', parse: String } }, /parse/],
    [
      'a default outside the choices',
      { a: { type: 'string', description: 'A', choices: ['x'], default: 'y' } },
      /not one of/,
    ],
    [
      'a non-boolean default on a boolean flag',
      { a: { type: 'boolean', description: 'A', default: 'yes' } },
      /boolean 'default'/,
    ],
  ])('throws on %s', (_case, flags, pattern) => {
    expect(() => validateSpec({ flags })).toThrow(pattern);
  });

  it.each<[string, OperandDefinition[], RegExp]>([
    ['an empty operand name', [{ name: '', description: 'E' }], /empty name/],
    [
      'a duplicate operand name',
      [
        { name: 'a', description: 'A' },
        { name: 'a', description: 'A' },
      ],
      /declared twice/,
    ],
    [
      'a required operand after an optional one',
      [
        { name: 'a', description: 'A', optional: true },
        { name: 'b', description: 'B' },
      ],
      /follows an optional/,
    ],
    [
      'a variadic operand that is not last',
      [
        { name: 'a', description: 'A', variadic: true },
        { name: 'b', description: 'B', optional: true },
      ],
      /last operand/,
    ],
    ['empty operand choices', [{ name: 'a', description: 'A', choices: [] }], /empty 'choices'/],
  ])('throws on %s', (_case, operands, pattern) => {
    expect(() => validateSpec({ operands })).toThrow(pattern);
  });
});
