import { describe, expectTypeOf, it } from 'vitest';

import { createCli, defineCommand, defineGroup } from '../createCli.ts';
import type { Group } from '../nodes.ts';
import type { FlagSchema } from '../types.ts';

interface RootContext {
  env: string;
}

interface LevelContext extends RootContext {
  level: 'low' | 'high';
}

// Each definition is wrapped in a function that is never invoked, since only its types are under test.
describe('createCli types', () => {
  it('infers flags and operands in run', () => {
    expectTypeOf(() =>
      createCli<RootContext>().defineCommand({
        summary: 'S',
        flags: { bump: { type: 'string', description: 'B', choices: ['major', 'minor'] } },
        operands: [{ name: 'target', description: 'T', optional: true }],
        run: ({ flags, operands, context }) => {
          expectTypeOf(flags).toEqualTypeOf<{ bump: 'major' | 'minor' | undefined }>();
          expectTypeOf(operands).toEqualTypeOf<{ target: string | undefined }>();
          expectTypeOf(context).toEqualTypeOf<RootContext>();
        },
      }),
    ).toBeFunction();
  });

  it('gives a passthrough command its arguments unparsed', () => {
    expectTypeOf(() =>
      defineCommand({
        summary: 'S',
        passthrough: true,
        run: ({ args, context }) => {
          expectTypeOf(args).toEqualTypeOf<string[]>();
          expectTypeOf(context).toBeUnknown();
        },
      }),
    ).toBeFunction();
  });

  it('infers the context through deriveContext and a nested group, with inline choices on the group flags', () => {
    const leveled = createCli<LevelContext>();
    const build = () =>
      createCli<RootContext>().defineGroup({
        summary: 'Root',
        flags: { level: { type: 'string', description: 'L', choices: ['low', 'high'], default: 'low' } },
        deriveContext: (flags, context) => {
          expectTypeOf(flags).toEqualTypeOf<{ level: 'low' | 'high' }>();
          return { ...context, level: flags.level };
        },
        commands: {
          issue: leveled.defineGroup({
            summary: 'Issue',
            commands: {
              list: leveled.defineCommand({
                summary: 'List',
                run: ({ context }) => {
                  expectTypeOf(context).toEqualTypeOf<LevelContext>();
                },
              }),
            },
          }),
        },
      });

    expectTypeOf(build).returns.toEqualTypeOf<Group<RootContext>>();
  });

  it('nests a context-free command under a contextful group', () => {
    expectTypeOf(() =>
      createCli<RootContext>().defineGroup({
        summary: 'Root',
        commands: { ping: defineCommand({ summary: 'Ping', run: () => 0 }) },
      }),
    ).toBeFunction();
  });

  it('accepts a handler annotated to return void, and an async handler', () => {
    expectTypeOf(() =>
      defineGroup({
        summary: 'Root',
        commands: {
          sync: defineCommand({ summary: 'Sync', run: (): void => {} }),
          async: defineCommand({ summary: 'Async', run: () => Promise.resolve(3) }),
        },
      }),
    ).toBeFunction();
  });

  it('keeps the literals of a shared schema declared with satisfies', () => {
    const shared = {
      quiet: { type: 'boolean', description: 'Q', short: 'q' },
      output: { type: 'path', description: 'O' },
    } satisfies FlagSchema;

    expectTypeOf(() =>
      defineCommand({
        summary: 'S',
        flags: { ...shared, name: { type: 'string', description: 'N' } },
        run: ({ flags }) => {
          expectTypeOf(flags).toEqualTypeOf<{ quiet: boolean; output: string | undefined; name: string | undefined }>();
        },
      }),
    ).toBeFunction();
  });

  it('rejects a command or a group without a summary', () => {
    expectTypeOf(() => {
      // @ts-expect-error -- `summary` is required on a command.
      defineCommand({ run: () => 0 });
      // @ts-expect-error -- `summary` is required on a group.
      defineGroup({ commands: {} });
    }).toBeFunction();
  });

  it('reports a deriveContext that omits a field on the child that needs it', () => {
    const leveled = createCli<LevelContext>();

    expectTypeOf(() =>
      createCli<RootContext>().defineGroup({
        summary: 'Root',
        flags: { verbose: { type: 'boolean', description: 'V' } },
        deriveContext: (_flags, context) => ({ ...context }),
        commands: {
          ok: defineCommand({ summary: 'Ok', run: () => 0 }),
          // @ts-expect-error -- The derived context lacks `level`.
          list: leveled.defineCommand({ summary: 'List', run: () => 0 }),
        },
      }),
    ).toBeFunction();
  });

  it('reports a child whose context the group lacks on that child', () => {
    const leveled = createCli<LevelContext>();

    expectTypeOf(() =>
      createCli<RootContext>().defineGroup({
        summary: 'Root',
        commands: {
          ok: defineCommand({ summary: 'Ok', run: () => 0 }),
          // @ts-expect-error -- The group supplies `RootContext`, which lacks `level`.
          list: leveled.defineCommand({ summary: 'List', run: () => 0 }),
        },
      }),
    ).toBeFunction();
  });
});
