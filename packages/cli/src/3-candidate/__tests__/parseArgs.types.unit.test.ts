import { describe, expectTypeOf, it } from 'vitest';

import { parseArgs } from '../parseArgs.ts';
import type { FlagSchema } from '../types.ts';

// Each call is wrapped in a function that is never invoked, since only its types are under test.
describe('parseArgs types', () => {
  it('infers each flag type from its definition', () => {
    const parse = () =>
      parseArgs([], {
        flags: {
          bump: { type: 'string', description: 'B', choices: ['major', 'minor'] },
          config: { type: 'path', description: 'C' },
          level: { type: 'string', description: 'L', choices: ['low', 'high'], default: 'low' },
          max: { type: 'string', description: 'M', parse: (raw) => raw.length },
          name: { type: 'string', description: 'N' },
          quiet: { type: 'boolean', description: 'Q' },
          retries: { type: 'string', description: 'R', parse: Number, default: 3 },
        },
      });

    expectTypeOf(parse).returns.toHaveProperty('flags').toEqualTypeOf<{
      bump: 'major' | 'minor' | undefined;
      config: string | undefined;
      level: 'low' | 'high';
      max: number | undefined;
      name: string | undefined;
      quiet: boolean;
      retries: number;
    }>();
  });

  it('infers an array of the value type for a multiple flag', () => {
    type Bump = 'major' | 'minor';
    const parse = () =>
      parseArgs([], {
        flags: {
          bump: { type: 'string', description: 'B', choices: ['major', 'minor'], multiple: true },
          count: { type: 'string', description: 'C', parse: Number, multiple: true },
          root: { type: 'path', description: 'R', multiple: true },
          tag: { type: 'string', description: 'T', multiple: true },
        },
      });

    expectTypeOf(parse).returns.toHaveProperty('flags').toEqualTypeOf<{
      bump: Bump[];
      count: number[];
      root: string[];
      tag: string[];
    }>();
  });

  it('infers each operand type by name', () => {
    const parse = () =>
      parseArgs([], {
        operands: [
          { name: 'action', description: 'A', choices: ['start', 'stop'] },
          { name: 'service', description: 'S' },
          { name: 'target', description: 'T', optional: true },
          { name: 'files', description: 'F', optional: true, variadic: true },
        ],
      });

    expectTypeOf(parse).returns.toHaveProperty('operands').toEqualTypeOf<{
      action: 'start' | 'stop';
      service: string;
      target: string | undefined;
      files: string[];
    }>();
  });

  it('keeps literal types from a schema declared with satisfies', () => {
    const shared = { quiet: { type: 'boolean', description: 'Q' } } satisfies FlagSchema;
    const parse = () => parseArgs([], { flags: { ...shared, name: { type: 'string', description: 'N' } } });

    expectTypeOf(parse).returns.toHaveProperty('flags').toEqualTypeOf<{ quiet: boolean; name: string | undefined }>();
  });

  it('rejects a flag or an operand without a description', () => {
    expectTypeOf(() => {
      // @ts-expect-error -- `description` is required on a flag.
      parseArgs([], { flags: { quiet: { type: 'boolean' } } });
      // @ts-expect-error -- `description` is required on an operand.
      parseArgs([], { operands: [{ name: 'a' }] });
    }).toBeFunction();
  });

  it('rejects a default of the wrong type', () => {
    expectTypeOf(() => {
      // @ts-expect-error -- The default must be one of the choices.
      parseArgs([], { flags: { level: { type: 'string', description: 'L', choices: ['low'], default: 'high' } } });
      // @ts-expect-error -- The default must have the type that `parse` returns.
      parseArgs([], { flags: { max: { type: 'string', description: 'M', parse: Number, default: 'x' } } });
      // @ts-expect-error -- A multiple flag does not take a default.
      parseArgs([], { flags: { tag: { type: 'string', description: 'T', multiple: true, default: ['a'] } } });
    }).toBeFunction();
  });
});
