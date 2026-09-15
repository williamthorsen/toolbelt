import { describe, expect, it } from 'vitest';

import { listStdioSpies } from '../listStdioSpies.ts';

const IMPLEMENTATIONS = [
  { label: 'a silencing implementation', tail: '.mockImplementation(() => true);' },
  { label: 'a return value', tail: '.mockReturnValue(true);' },
  {
    label: 'a capturing implementation',
    tail: '.mockImplementation((chunk: unknown) => {\n  chunks.push(String(chunk));\n  return true;\n});',
  },
  { label: 'no implementation', tail: ';' },
];

// Each source a use of a standard stream, or of a spy near one, that the detector reports as no site.
const UNCLAIMED = [
  {
    label: 'a bare stream reference, asserting what stdio a spawned child inherits',
    source: [
      "const child = spawn('rdy', args, { stdio: ['ignore', process.stdout, process.stderr] });",
      "expect(spawn).toHaveBeenCalledWith('rdy', args, { stdio: ['ignore', process.stdout, process.stderr] });",
    ],
  },
  {
    label: "reads of a spy's recorded calls",
    source: [
      "const output = stdoutSpy.mock.calls.map((call) => String(call[0])).join('');",
      "expect(process.stderr.write).toHaveBeenCalledWith(expect.stringContaining('manifest'));",
    ],
  },
  {
    label: 'a write to a stream',
    source: [String.raw`process.stdout.write('done\n');`, String.raw`process.stderr.write('failed\n');`],
  },
  {
    label: 'a spy on another member of a stream',
    source: ["vi.spyOn(process.stdout, 'isTTY', 'get').mockReturnValue(true);", "vi.spyOn(process.stderr, 'on');"],
  },
  {
    label: 'a spy on another stream',
    source: ["vi.spyOn(child.stdout, 'write');", "vi.spyOn(stdout, 'write').mockImplementation(() => true);"],
  },
  {
    label: 'a spy on the console or on process.exit',
    source: [
      "vi.spyOn(console, 'log').mockImplementation(() => {});",
      "vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);",
    ],
  },
  {
    label: 'an assignment to write, which reads the same as a restore',
    source: ['process.stdout.write = vi.fn();', 'process.stdout.write = originalWrite;'],
  },
];

describe(listStdioSpies, () => {
  it('reports nothing for a file holding no spy', () => {
    expect(listStdioSpies("it('works', () => {});")).toStrictEqual([]);
  });

  it('reports a spy on each stream, naming its line', () => {
    const source = [
      'beforeEach(() => {',
      "  stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);",
      "  stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);",
      '});',
    ].join('\n');

    expect(listStdioSpies(source)).toStrictEqual([
      { kind: 'hand-rolled-stdio-capture', line: 2 },
      { kind: 'hand-rolled-stdio-capture', line: 3 },
    ]);
  });

  it.each(IMPLEMENTATIONS)('reports a spy with $label', ({ tail }) => {
    expect(listStdioSpies(`vi.spyOn(process.stdout, 'write')${tail}`)).toStrictEqual([
      { kind: 'hand-rolled-stdio-capture', line: 1 },
    ]);
  });

  it('matches the spy however it is spaced or quoted', () => {
    const source = 'vi . spyOn( process . stderr , "write" ).mockReturnValue(true);';

    expect(listStdioSpies(source)).toStrictEqual([{ kind: 'hand-rolled-stdio-capture', line: 1 }]);
  });

  it('reads a spy that the formatter broke across lines', () => {
    const source = ['const spy = vi.spyOn(', '  process.stdout,', "  'write',", ');'].join('\n');

    expect(listStdioSpies(source)).toStrictEqual([{ kind: 'hand-rolled-stdio-capture', line: 1 }]);
  });

  it.each(UNCLAIMED)('claims nothing in $label', ({ source }) => {
    expect(listStdioSpies(source.join('\n'))).toStrictEqual([]);
  });

  it('finds no spy in prose about one', () => {
    const sources = [
      "// Replaces vi.spyOn(process.stdout, 'write') with captureStdio.\n",
      "/**\n * Replaces vi.spyOn(process.stderr, 'write') with captureStdio.\n */\n",
      'const fix = "replace vi.spyOn(process.stdout, \'write\')";\n',
      "const fix = `replace vi.spyOn(process.stdout, 'write') with captureStdio`;\n",
      "const pattern = /vi.spyOn(process.stdout, 'write')/;\n",
    ];

    expect(sources.map(listStdioSpies)).toStrictEqual(sources.map(() => []));
  });
});
