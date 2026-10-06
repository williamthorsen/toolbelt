import process from 'node:process';

import { afterEach, describe, expect, it, vi } from 'vitest';

import { createCli, defineCommand, defineGroup } from '../createCli.ts';
import type { CommandNode, Writer } from '../nodes.ts';
import { runCli } from '../runCli.ts';
import { UsageError } from '../UsageError.ts';

interface RootContext {
  env: string;
}

interface ToolContext extends RootContext {
  quiet: boolean;
  filter: string | undefined;
}

const rootCli = createCli<RootContext>();
const toolCli = createCli<ToolContext>();

/** Records what each command received, newest last. */
const received: unknown[] = [];

const tool = rootCli.defineGroup({
  summary: 'A tool',
  flags: {
    quiet: { type: 'boolean', description: 'Quiet', short: 'q' },
    filter: { type: 'string', description: 'Filter', short: 'F' },
  },
  deriveContext: (flags, context) => ({ ...context, ...flags }),
  commands: {
    issue: toolCli.defineGroup({
      summary: 'Issues',
      commands: {
        list: toolCli.defineCommand({
          summary: 'List issues',
          flags: { all: { type: 'boolean', description: 'All', short: 'a' } },
          run: ({ context, flags }) => {
            received.push({ context, flags });
          },
        }),
      },
    }),
    exec: defineCommand({
      summary: 'Run a program',
      passthrough: true,
      run: ({ args }) => {
        received.push(args);
      },
    }),
    fail: defineCommand({
      summary: 'Fail',
      run: () => {
        throw new UsageError('Bad input');
      },
    }),
    crash: defineCommand({
      summary: 'Crash',
      run: () => {
        throw new Error('boom');
      },
    }),
    later: defineCommand({ summary: 'Async', run: () => Promise.resolve(3) }),
    invalid: defineCommand({ summary: 'Invalid', run: () => 300 }),
  },
});

const v11y = defineGroup({
  summary: 'Audit',
  flags: { quiet: { type: 'boolean', description: 'Quiet', short: 'q' } },
  commands: {
    check: defineCommand({
      summary: 'Check',
      flags: { json: { type: 'boolean', description: 'JSON' } },
      operands: [{ name: 'paths', description: 'Paths', optional: true, variadic: true }],
      run: ({ flags, operands }) => {
        received.push({ command: 'check', flags, operands });
      },
    }),
    fix: defineCommand({
      summary: 'Fix',
      run: () => {
        received.push({ command: 'fix' });
      },
    }),
  },
  defaultCommand: 'check',
});

describe(runCli, () => {
  afterEach(() => {
    received.length = 0;
    vi.restoreAllMocks();
  });

  describe('help', () => {
    it.each([
      [['--help'], 'Usage: tool [options] <command>'],
      [['-q', '-h'], 'Usage: tool [options] <command>'],
      [['-qh'], 'Usage: tool [options] <command>'],
      [['--filter', '--help'], 'Usage: tool [options] <command>'],
      [['issue', '-h'], 'Usage: tool issue [options] <command>'],
      [['-q', 'issue', 'list', '--help'], 'Usage: tool issue list [options]'],
      [['issue', 'list', '-ah'], 'Usage: tool issue list [options]'],
    ])('prints help for %j and returns 0', async (argv, usage) => {
      const result = await run(argv, tool);

      expect(result.code).toBe(0);
      expect(result.stdout.startsWith(`${usage}\n\n`)).toBe(true);
      expect(result.stdout).toMatch(/[^\n]\n$/);
      expect(result.stderr).toBe('');
    });

    it('wins over a parse error at the same level', async () => {
      await expect(run(['--bogus', '--help'], tool)).resolves.toMatchObject({ code: 0, stderr: '' });
      await expect(run(['issue', 'list', '--bogus', '--help'], tool)).resolves.toMatchObject({ code: 0, stderr: '' });
    });

    it('loses to a parse error at an earlier level', async () => {
      await expect(run(['--bogus', 'issue', '--help'], tool)).resolves.toStrictEqual({
        code: 2,
        stdout: '',
        stderr: "Error: Unknown option: --bogus\nTry 'tool --help'.\n",
      });
    });

    it('ignores a help flag after --', async () => {
      await expect(run(['--', '--help'], v11y)).resolves.toMatchObject({ code: 0 });
      expect(received).toStrictEqual([{ command: 'check', flags: { json: false }, operands: { paths: ['--help'] } }]);
    });

    it('is not intercepted after a passthrough command token', async () => {
      await expect(run(['exec', '--help', 'x'], tool)).resolves.toMatchObject({ code: 0, stdout: '' });
      expect(received).toStrictEqual([['--help', 'x']]);
    });

    it('lists the version line at the root only', async () => {
      const version = () => '1.2.3';

      expect((await run(['-h'], tool, { version })).stdout).toContain('-V, --version');
      expect((await run(['issue', '-h'], tool, { version })).stdout).not.toContain('--version');
    });
  });

  describe('version', () => {
    const version = vi.fn(() => '1.2.3');

    it('prints the version at the root and returns 0', async () => {
      await expect(run(['-V'], tool, { version })).resolves.toStrictEqual({ code: 0, stdout: '1.2.3\n', stderr: '' });
      await expect(run(['-q', '--version'], tool, { version })).resolves.toMatchObject({ stdout: '1.2.3\n' });
    });

    it('is called only when requested', async () => {
      version.mockClear();
      await run(['later'], tool, { version });

      expect(version).not.toHaveBeenCalled();
    });

    it('loses to help', async () => {
      expect((await run(['-V', '-h'], tool, { version })).stdout).toMatch(/^Usage: /);
    });

    it('is not reserved below the root', async () => {
      await expect(run(['issue', '--version'], tool, { version })).resolves.toMatchObject({
        code: 2,
        stderr: "Error: Unknown option: --version\nTry 'tool issue --help'.\n",
      });
    });

    it('is not reserved without a version', async () => {
      await expect(run(['-V'], tool)).resolves.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/^Error: Unknown option: -V\n/),
      });
    });

    it('works on a root command', async () => {
      const command = defineCommand({ summary: 'S', run: () => 0 });

      await expect(run(['--version'], command, { version })).resolves.toMatchObject({ stdout: '1.2.3\n' });
    });

    it('throws when the root declares a flag that collides with it', async () => {
      const root = defineCommand({
        summary: 'S',
        flags: { verbose: { type: 'boolean', description: 'V', short: 'V' } },
        run: () => 0,
      });

      await expect(run([], root, { version })).rejects.toThrow(/collides with -V, --version/);
    });
  });

  describe('context', () => {
    it.each([
      [['-q', '-F', 'pkg', 'issue', 'list', '-a']],
      [['-qF', 'pkg', 'issue', 'list', '-a']],
      [['-q', '-Fpkg', 'issue', 'list', '-a']],
    ])('derives the context from the group flags in %j and supplies it to run', async (argv) => {
      await expect(run(argv, tool)).resolves.toMatchObject({ code: 0 });
      expect(received).toStrictEqual([{ context: { env: 'test', quiet: true, filter: 'pkg' }, flags: { all: true } }]);
    });

    it('reports a UsageError from deriveContext with its group scope', async () => {
      const root = rootCli.defineGroup({
        summary: 'S',
        flags: { style: { type: 'string', description: 'Style' } },
        deriveContext: (flags, context) => {
          if (flags.style === 'loud') throw new UsageError('Unsupported style: loud');
          return context;
        },
        commands: { ping: rootCli.defineCommand({ summary: 'Ping', run: () => 0 }) },
      });

      await expect(run(['--style', 'loud', 'ping'], root)).resolves.toStrictEqual({
        code: 2,
        stdout: '',
        stderr: "Error: Unsupported style: loud\nTry 'tool --help'.\n",
      });
    });
  });

  describe('default command', () => {
    it('runs when the level has no command token', async () => {
      await expect(run([], v11y)).resolves.toMatchObject({ code: 0 });
      await expect(run(['--json'], v11y)).resolves.toMatchObject({ code: 0 });
      await expect(run(['-q', '--json'], v11y)).resolves.toMatchObject({ code: 0 });

      expect(received).toStrictEqual([
        { command: 'check', flags: { json: false }, operands: { paths: [] } },
        { command: 'check', flags: { json: true }, operands: { paths: [] } },
        { command: 'check', flags: { json: true }, operands: { paths: [] } },
      ]);
    });

    it('receives -- and what follows it as operands', async () => {
      await run(['--', '--json'], v11y);

      expect(received).toStrictEqual([{ command: 'check', flags: { json: false }, operands: { paths: ['--json'] } }]);
    });

    it('does not run when the level names a command', async () => {
      await run(['fix'], v11y);

      expect(received).toStrictEqual([{ command: 'fix' }]);
    });

    it('treats an unrecognized word as an unknown command', async () => {
      await expect(run(['fux'], v11y)).resolves.toMatchObject({
        code: 2,
        stderr: expect.stringMatching(/^Error: Unknown command: fux\n/),
      });
      expect(received).toStrictEqual([]);
    });

    it('reports its own usage errors with its scope', async () => {
      await expect(run(['--bogus'], v11y)).resolves.toMatchObject({
        code: 2,
        stderr: "Error: Unknown option: --bogus\nTry 'tool check --help'.\n",
      });
    });

    it('prints its own help for a help flag after a flag that the group does not claim', async () => {
      expect((await run(['--json', '--help'], v11y)).stdout).toMatch(
        /^Usage: tool check \[options\] \[<paths>\.\.\.\]\n/,
      );
    });
  });

  describe('usage errors', () => {
    it('reports an unknown command', async () => {
      await expect(run(['nope'], tool)).resolves.toStrictEqual({
        code: 2,
        stdout: '',
        stderr: "Error: Unknown command: nope\nTry 'tool --help'.\n",
      });
    });

    it.each([[[]], [['-q']], [['--', 'issue']]])('reports a missing command for %j', async (argv) => {
      await expect(run(argv, tool)).resolves.toStrictEqual({
        code: 2,
        stdout: '',
        stderr: "Error: A command is required.\nTry 'tool --help'.\n",
      });
    });

    it('reports a parse error with the scope of the command reached', async () => {
      await expect(run(['issue', 'list', '--bogus'], tool)).resolves.toMatchObject({
        code: 2,
        stderr: "Error: Unknown option: --bogus\nTry 'tool issue list --help'.\n",
      });
    });

    it('reports a UsageError thrown by run with that command scope', async () => {
      await expect(run(['fail'], tool)).resolves.toStrictEqual({
        code: 2,
        stdout: '',
        stderr: "Error: Bad input\nTry 'tool fail --help'.\n",
      });
    });

    it('propagates any other error', async () => {
      await expect(run(['crash'], tool)).rejects.toThrow('boom');
    });
  });

  describe('exit codes', () => {
    it('maps a run that returns nothing to 0, and resolves an async run', async () => {
      await expect(run(['issue', 'list'], tool)).resolves.toMatchObject({ code: 0 });
      await expect(run(['later'], tool)).resolves.toMatchObject({ code: 3 });
    });

    it('throws on an exit code outside 0 to 255', async () => {
      await expect(run(['invalid'], tool)).rejects.toThrow('A command returned an invalid exit code: 300');
    });
  });

  it('routes a tree built at runtime from a record like a literal one', async () => {
    const codes: Record<string, number> = { alpha: 4, beta: 5 };
    const root = defineGroup({
      summary: 'Runtime',
      commands: Object.fromEntries(
        Object.entries(codes).map(([name, code]) => [name, defineCommand({ summary: name, run: () => code })]),
      ),
    });

    await expect(run(['beta'], root)).resolves.toMatchObject({ code: 5 });
    expect((await run(['--help'], root)).stdout).toContain('Commands:\n  alpha');
  });

  it('writes only to the injected writers and never exits', async () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit was called');
    });
    const stdoutWrite = vi.spyOn(process.stdout, 'write');
    const stderrWrite = vi.spyOn(process.stderr, 'write');

    for (const argv of [['--help'], ['nope'], ['issue', 'list'], ['fail'], ['exec', 'x']]) {
      await run(argv, tool, { version: () => '1' });
    }

    expect(exit).not.toHaveBeenCalled();
    expect(stdoutWrite).not.toHaveBeenCalled();
    expect(stderrWrite).not.toHaveBeenCalled();
  });

  it('runs a context-free root without a context', async () => {
    const stdout = makeWriter();
    const root = defineCommand({ summary: 'S', run: () => 0 });

    await expect(runCli([], root, { name: 'tool', stdout, stderr: makeWriter() })).resolves.toBe(0);
  });
});

// region | Helpers

/** A writer that records what it is given. */
interface RecordingWriter extends Writer {
  text: string;
}

function makeWriter(): RecordingWriter {
  const writer = {
    text: '',
    write: (chunk: string) => {
      writer.text += chunk;
      return true;
    },
  };
  return writer;
}

/** Runs a tree whose root context is `RootContext`, recording both streams. */
async function run(
  argv: string[],
  root: CommandNode<RootContext>,
  options: { version?: () => string } = {},
): Promise<{ code: number; stdout: string; stderr: string }> {
  const stdout = makeWriter();
  const stderr = makeWriter();
  const code = await runCli(argv, root, { name: 'tool', context: { env: 'test' }, stdout, stderr, ...options });
  return { code, stdout: stdout.text, stderr: stderr.text };
}

// endregion | Helpers
