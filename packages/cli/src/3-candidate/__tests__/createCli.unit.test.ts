import { describe, expect, it } from 'vitest';

import { createCli, defineCommand, defineGroup } from '../createCli.ts';
import type { BoundCommand, BoundGroup, Writer } from '../nodes.ts';

const silent: Writer = { write: () => true };

describe(createCli, () => {
  it('returns definers that supply the context to run', async () => {
    const { defineCommand: define } = createCli<{ name: string }>();
    const command = define({ summary: 'S', run: ({ context }) => (context.name === 'x' ? 7 : 1) });

    await expect(invoke(command.bind({ name: 'x' }), [])).resolves.toBe(7);
  });
});

describe(defineCommand, () => {
  it('records its documentation and spec', () => {
    const command = defineCommand({
      summary: 'S',
      description: 'D',
      epilog: 'E',
      flags: { quiet: { type: 'boolean', description: 'Q' } },
      operands: [{ name: 'target', description: 'T' }],
      run: () => 0,
    });

    expect(command).toMatchObject({
      kind: 'command',
      summary: 'S',
      description: 'D',
      epilog: 'E',
      passthrough: false,
      flags: { quiet: { type: 'boolean', description: 'Q' } },
      operands: [{ name: 'target', description: 'T' }],
    });
  });

  it('parses its arguments against its spec before running', async () => {
    let received: unknown;
    const command = defineCommand({
      summary: 'S',
      flags: { max: { type: 'string', description: 'M', parse: Number } },
      operands: [{ name: 'target', description: 'T' }],
      run: ({ flags, operands }) => {
        received = { flags, operands };
      },
    });

    await expect(invoke(command.bind(undefined), ['--max', '3', 'x'])).resolves.toBeUndefined();
    expect(received).toStrictEqual({ flags: { max: 3 }, operands: { target: 'x' } });
  });

  it('gives a passthrough command its arguments unparsed', async () => {
    let received: unknown;
    const command = defineCommand({
      summary: 'S',
      passthrough: true,
      run: ({ args }) => {
        received = args;
      },
    });

    await invoke(command.bind(undefined), ['--help', '--', 'x']);
    expect(received).toStrictEqual(['--help', '--', 'x']);
  });

  it('throws on an invalid spec when defined', () => {
    expect(() =>
      defineCommand({ summary: 'S', flags: { help: { type: 'boolean', description: 'H' } }, run: () => 0 }),
    ).toThrow(/--help/);
  });
});

describe(defineGroup, () => {
  const ping = defineCommand({ summary: 'Ping', run: () => 0 });

  it('throws on an empty command name', () => {
    expect(() => defineGroup({ summary: 'G', commands: { '': ping } })).toThrow(/empty or starts with a dash/);
  });

  it('throws on a command name that starts with a dash', () => {
    expect(() => defineGroup({ summary: 'G', commands: { '-x': ping } })).toThrow(/empty or starts with a dash/);
  });

  it('throws on a default command that is not one of its commands', () => {
    expect(() => defineGroup({ summary: 'G', commands: { ping }, defaultCommand: 'pong' })).toThrow(
      /'pong' is not one of the group's commands/,
    );
  });

  it('throws on an invalid flag schema', () => {
    expect(() =>
      defineGroup({
        summary: 'G',
        flags: { x: { type: 'boolean', description: 'X', short: 'h' } },
        commands: { ping },
      }),
    ).toThrow(/-h/);
  });

  it('parses its flags up to the command token and derives its commands context', async () => {
    const { defineCommand: define } = createCli<{ quiet: boolean }>();
    const group = defineGroup({
      summary: 'G',
      flags: { quiet: { type: 'boolean', description: 'Q', short: 'q' } },
      deriveContext: (flags) => ({ quiet: flags.quiet }),
      commands: { run: define({ summary: 'R', run: ({ context }) => (context.quiet ? 5 : 6) }) },
    });

    const entry = enter(group.bind(undefined), ['-q', 'run', '--x']);
    expect(entry.rest).toStrictEqual(['run', '--x']);
    await expect(invoke(asCommand(entry.bindCommand('run')), [])).resolves.toBe(5);
    expect(entry.bindCommand('missing')).toBeUndefined();
    expect(entry.bindCommand('toString')).toBeUndefined();
  });

  it('stops at the first unclaimed flag when it has a default command', () => {
    const group = defineGroup({
      summary: 'G',
      flags: { quiet: { type: 'boolean', description: 'Q', short: 'q' } },
      commands: { check: ping },
      defaultCommand: 'check',
    });

    expect(enter(group.bind(undefined), ['-q', '--json', 'x']).rest).toStrictEqual(['--json', 'x']);
    expect(enter(group.bind(undefined), ['-qj', 'x']).rest).toStrictEqual(['-j', 'x']);
    expect(enter(group.bind(undefined), ['-qFpkg', 'x']).rest).toStrictEqual(['-Fpkg', 'x']);
    expect(enter(group.bind(undefined), ['-jq', 'x']).rest).toStrictEqual(['-jq', 'x']);
  });
});

// region | Helpers

function enter(bound: BoundGroup, args: string[]) {
  return bound.enter(args, '/base');
}

function asCommand(bound: BoundCommand | BoundGroup | undefined): BoundCommand {
  if (bound === undefined || !('invoke' in bound)) throw new Error('Expected a command.');
  return bound;
}

async function invoke(bound: BoundCommand, args: string[]): Promise<unknown> {
  return bound.invoke({ args, stdout: silent, stderr: silent, baseDir: '/base' });
}

// endregion | Helpers
