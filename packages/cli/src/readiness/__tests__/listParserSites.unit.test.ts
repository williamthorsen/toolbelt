import { describe, expect, it } from 'vitest';

import { listParserSites } from '../listParserSites.ts';

// A dispatcher of the shape that the toolbelt bins used before they adopted `runCli`.
const DISPATCHER = [
  "import { parseArgs } from 'node:util';",
  '',
  'export function dispatch(args: string[]): string {',
  '  const [command, ...rest] = args;',
  "  if (command === '--help' || command === '-h') return HELP;",
  "  if (command === '--version') return VERSION;",
  "  const { values } = parseArgs({ args: rest, options: { force: { type: 'boolean' } } });",
  '  return run(values);',
  '}',
  '',
].join('\n');

describe(listParserSites, () => {
  it('reports a dispatcher once for its flag comparisons and once for its parseArgs call', () => {
    expect(listParserSites(DISPATCHER)).toStrictEqual([
      { kind: 'flag-scan', line: 5, symbol: 'dispatch' },
      { kind: 'node-parse-args', line: 7 },
    ]);
  });

  describe('node-parse-args', () => {
    it.each([
      ["import { parseArgs } from 'node:util';", 'parseArgs({ args })'],
      ['import { parseArgs } from "util";', 'parseArgs({ args })'],
      ["import { inspect, parseArgs as parseNodeArgs } from 'node:util';", 'parseNodeArgs({ args })'],
      ["import * as util from 'node:util';", 'util.parseArgs({ args })'],
      ["import util from 'node:util';", 'util.parseArgs({ args })'],
      ["import util, { inspect } from 'util';", 'util . parseArgs({ args })'],
    ])('reports a call through %s', (importLine, call) => {
      const sites = listParserSites(`${importLine}\n\nconst parsed = ${call};\n`);

      expect(sites).toStrictEqual([{ kind: 'node-parse-args', line: 3 }]);
    });

    it("reports each call, and none through toolbelt.cli's own parseArgs", () => {
      const source = [
        "import { parseArgs as parseNodeArgs } from 'node:util';",
        "import { parseArgs } from '@williamthorsen/toolbelt.cli/candidate';",
        'const first = parseNodeArgs({ args });',
        'const second = parseNodeArgs({ args });',
        'const schemaTyped = parseArgs(args, spec);',
        '',
      ].join('\n');

      expect(listParserSites(source)).toStrictEqual([
        { kind: 'node-parse-args', line: 3 },
        { kind: 'node-parse-args', line: 4 },
      ]);
    });

    it('does not report a parseArgs that the source never imports from node:util', () => {
      const source = 'function parseArgs(args) {\n  return args;\n}\nparseArgs([]);\nother.parseArgs([]);\n';

      expect(listParserSites(source)).toStrictEqual([]);
    });

    it('does not report a type-only import or an import written in a comment or a literal', () => {
      const source = [
        "import type { parseArgs } from 'node:util';",
        "// import { parseArgs } from 'node:util';",
        'const text = "import { parseArgs } from \'node:util\'";',
        'parseArgs({ args });',
        '',
      ].join('\n');

      expect(listParserSites(source)).toStrictEqual([]);
    });
  });

  describe('flag-scan', () => {
    it.each([
      "if (arg === '--verbose') verbose = true;",
      "if (arg !== '-v') continue;",
      "if ('--verbose' === arg) verbose = true;",
      "while ('-v' !== arg) arg = next();",
      'if (arg === "--dry-run") dryRun = true;',
      "switch (arg) { case '--verbose': verbose = true; }",
      "if (process.argv.includes('--verbose')) verbose = true;",
      "const at = args.indexOf('-o');",
    ])('reports %s', (line) => {
      expect(listParserSites(`${line}\n`)).toStrictEqual([{ kind: 'flag-scan', line: 1 }]);
    });

    it.each(["'--'", "'-'", "'---'", "'-12'", "'--9'", "'-ab'", "'help'"])(
      'does not report a comparison against %s',
      (literal) => {
        expect(listParserSites(`if (arg === ${literal}) stop();\n`)).toStrictEqual([]);
      },
    );

    it('reports each function once, at its first comparison', () => {
      const source = [
        'function parseRoot(arg) {',
        "  if (arg === '--help') return 'help';",
        "  if (arg === '--version') return 'version';",
        '}',
        'const parseIssue = (arg) => {',
        "  switch (arg) { case '--all': return 'all'; case '-q': return 'quiet'; }",
        '};',
        '',
      ].join('\n');

      expect(listParserSites(source)).toStrictEqual([
        { kind: 'flag-scan', line: 2, symbol: 'parseRoot' },
        { kind: 'flag-scan', line: 6, symbol: 'parseIssue' },
      ]);
    });

    it("reports a file's top-level comparisons once", () => {
      const source =
        "const args = process.argv.slice(2);\nif (args.includes('--help')) help();\nif (args[0] === '-v') verbose();\n";

      expect(listParserSites(source)).toStrictEqual([{ kind: 'flag-scan', line: 2 }]);
    });

    it('attributes a comparison to the innermost named function', () => {
      const source = [
        'function outer() {',
        '  function inner(arg) {',
        "    return arg === '--force';",
        '  }',
        '  return inner;',
        '}',
        '',
      ].join('\n');

      expect(listParserSites(source)).toStrictEqual([{ kind: 'flag-scan', line: 3, symbol: 'inner' }]);
    });

    it('does not report a comparison written in a comment or a template literal', () => {
      const source = "// if (arg === '--help') help();\nconst doc = `if (arg === '--help') help();`;\n";

      expect(listParserSites(source)).toStrictEqual([]);
    });
  });
});
