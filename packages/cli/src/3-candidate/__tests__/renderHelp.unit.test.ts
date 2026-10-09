import { describe, expect, it } from 'vitest';

import type { Command, Group } from '../nodes.ts';
import { renderHelp } from '../renderHelp.ts';

describe(renderHelp, () => {
  it('renders the usage line, then the description, separated by a blank line', () => {
    const page = renderHelp(makeCommand({ description: 'Long description.' }), 'tool run');

    expect(page.split('\n', 3)).toStrictEqual(['Usage: tool run [options]', '', 'Long description.']);
  });

  it('falls back to the summary when the description is absent', () => {
    expect(renderHelp(makeCommand({ summary: 'Short summary' }), 'tool').split('\n', 3)[2]).toBe('Short summary');
  });

  it('aligns every description in one column across blocks', () => {
    const page = renderHelp(
      makeCommand({
        flags: { key: { type: 'string', description: 'Key description', valueHint: 'K' } },
        operands: [{ name: 'branch', description: 'Branch description', optional: true }],
      }),
      'tool',
    );

    const columns = ['Key description', 'Branch description', 'Print this help'].map((text) =>
      findLine(page, text).indexOf(text),
    );
    expect(new Set(columns).size).toBe(1);
    expect(columns[0]).toBe('  '.length + '    --key <K>'.length + '  '.length);
  });

  it('renders a short alias before the long name and lines a long-only name up under it', () => {
    const page = renderHelp(
      makeCommand({
        flags: {
          quiet: { type: 'boolean', description: 'Quiet', short: 'q' },
          noVerify: { type: 'boolean', description: 'Skip' },
        },
      }),
      'tool',
    );

    expect(findLine(page, 'Quiet')).toMatch(/^ {2}-q, --quiet /);
    expect(findLine(page, 'Skip')).toMatch(/^ {6}--no-verify /);
  });

  it('labels a value by its hint, else its choices, else value', () => {
    const page = renderHelp(
      makeCommand({
        flags: {
          hinted: { type: 'string', description: 'Hinted', valueHint: 'N', choices: ['a', 'b'] },
          chosen: { type: 'string', description: 'Chosen', choices: ['a', 'b'] },
          plain: { type: 'path', description: 'Plain' },
        },
      }),
      'tool',
    );

    expect(findLine(page, 'Hinted')).toContain('--hinted <N> ');
    expect(findLine(page, 'Chosen')).toContain('--chosen <a|b> ');
    expect(findLine(page, 'Plain')).toContain('--plain <value> ');
  });

  it('appends a default to the description', () => {
    const page = renderHelp(
      makeCommand({ flags: { level: { type: 'string', description: 'The level', default: 'low' } } }),
      'tool',
    );

    expect(findLine(page, 'The level')).toMatch(/The level \(default: low\)$/);
  });

  it('marks a multiple flag as repeatable, and only that flag', () => {
    const page = renderHelp(
      makeCommand({
        flags: {
          name: { type: 'string', description: 'The name' },
          tag: { type: 'string', description: 'The tag', valueHint: 'name', multiple: true },
        },
      }),
      'tool',
    );

    expect(findLine(page, 'The tag')).toMatch(/--tag <name> +The tag \(repeatable\)$/);
    expect(findLine(page, 'The name')).toMatch(/The name$/);
  });

  it('labels optional and variadic operands in the usage line and the arguments block', () => {
    const page = renderHelp(
      makeCommand({
        operands: [
          { name: 'target', description: 'Target' },
          { name: 'files', description: 'Files', optional: true, variadic: true },
        ],
      }),
      'tool',
    );

    expect(page.split('\n', 1)[0]).toBe('Usage: tool [options] <target> [<files>...]');
    expect(findLine(page, 'Target').trim()).toMatch(/^<target> /);
    expect(findLine(page, 'Files').trim()).toMatch(/^\[<files>\.\.\.\] /);
  });

  it("renders a group's usage and its commands block, marking the default command", () => {
    const page = renderHelp(
      makeGroup({ commands: { check: makeCommand({ summary: 'Check' }), fix: makeCommand({ summary: 'Fix' }) } }),
      'v11y',
    );

    expect(page.split('\n', 1)[0]).toBe('Usage: v11y [options] [<command>]');
    expect(page).toMatch(/\n\nCommands:\n {2}check +Check \(default\)\n {2}fix +Fix\n\n/);
  });

  it('marks the command as required in the usage line of a group without a default command', () => {
    const page = renderHelp(
      makeGroup({ defaultCommand: undefined, commands: { fix: makeCommand({ summary: 'Fix' }) } }),
      'v11y',
    );

    expect(page.split('\n', 1)[0]).toBe('Usage: v11y [options] <command>');
  });

  it('lists help last, then the version line only when requested', () => {
    const node = makeCommand({ flags: { quiet: { type: 'boolean', description: 'Quiet' } } });

    expect(renderHelp(node, 'tool').split('\n').at(-1)).toMatch(/^ {2}-h, --help {2}/);
    expect(renderHelp(node, 'tool')).not.toContain('--version');
    expect(renderHelp(node, 'tool', { version: true }).split('\n').slice(-2)).toStrictEqual([
      '  -h, --help     Print this help',
      '  -V, --version  Print the version',
    ]);
  });

  it('appends the epilog verbatim after a blank line, without a trailing newline', () => {
    const epilog = 'Exit codes:\n  0  Success\n  1  Failure';

    expect(renderHelp(makeCommand({ epilog }), 'tool')).toMatch(
      /Print this help\n\nExit codes:\n {2}0 {2}Success\n {2}1 {2}Failure$/,
    );
  });

  it('renders a passthrough command without the argument and option blocks', () => {
    expect(renderHelp(makeCommand({ passthrough: true, summary: 'Pass' }), 'tool exec')).toBe(
      'Usage: tool exec [<args>...]\n\nPass',
    );
  });
});

// region | Helpers

function findLine(page: string, text: string): string {
  const line = page.split('\n').find((candidate) => candidate.includes(text));
  if (line === undefined) throw new Error(`No line contains '${text}'.`);
  return line;
}

function makeCommand(fields: Partial<Command<unknown>>): Command<unknown> {
  const command: Command<unknown> = {
    kind: 'command',
    summary: 'Summary',
    description: undefined,
    epilog: undefined,
    flags: {},
    operands: [],
    passthrough: false,
    bind: () => ({ node: command, invoke: () => 0 }),
    ...fields,
  };
  return command;
}

function makeGroup(fields: Partial<Group<unknown>>): Group<unknown> {
  const group: Group<unknown> = {
    kind: 'group',
    summary: 'Summary',
    description: undefined,
    epilog: undefined,
    flags: {},
    commands: {},
    defaultCommand: 'check',
    bind: () => ({ node: group, enter: () => ({ rest: [], bindCommand: () => undefined }) }),
    ...fields,
  };
  return group;
}

// endregion | Helpers
