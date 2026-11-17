import { blankNonCode } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

import { readImportBindings } from '../readImportBindings.ts';

const TARGET = { exportName: 'parseArgs', specifiers: ['node:util', 'util'] };

describe(readImportBindings, () => {
  it('reads a named import under its own name', () => {
    expect(summarize("import { parseArgs } from 'node:util';")).toStrictEqual({
      functions: ['parseArgs'],
      namespaces: [],
    });
  });

  it('reads a renamed import under its local name', () => {
    expect(summarize("import { inspect, parseArgs as parseNodeArgs } from 'node:util';")).toStrictEqual({
      functions: ['parseNodeArgs'],
      namespaces: [],
    });
  });

  it('reads a namespace import', () => {
    expect(summarize("import * as util from 'node:util';")).toStrictEqual({ functions: [], namespaces: ['util'] });
  });

  it('reads a default import as a namespace', () => {
    expect(summarize("import util from 'node:util';")).toStrictEqual({ functions: [], namespaces: ['util'] });
  });

  it('reads a default import alongside named imports', () => {
    expect(summarize('import util, { parseArgs } from "util";')).toStrictEqual({
      functions: ['parseArgs'],
      namespaces: ['util'],
    });
  });

  it('reads an import from each listed specifier', () => {
    const source = "import { parseArgs } from 'node:util';\nimport { parseArgs as parse } from 'util';";

    expect(summarize(source).functions).toStrictEqual(['parseArgs', 'parse']);
  });

  it('does not read an import from an unlisted specifier', () => {
    expect(summarize("import { parseArgs } from '@williamthorsen/toolbelt.cli/candidate';")).toStrictEqual({
      functions: [],
      namespaces: [],
    });
  });

  it('does not read a named import of another export', () => {
    expect(summarize("import { inspect } from 'node:util';").functions).toStrictEqual([]);
  });

  it('does not read a type-only import', () => {
    expect(summarize("import type { parseArgs } from 'node:util';").functions).toStrictEqual([]);
  });

  it('does not read an import written in a comment or a literal', () => {
    // rdy-ignore-next-line toolbelt.strings/no-joined-line-array -- toolbelt.strings depends on adoption, so adoption cannot import dedent without a cycle
    const source = [
      "// import { parseArgs } from 'node:util';",
      'const text = "import { parseArgs } from \'node:util\'";',
    ].join('\n');

    expect(summarize(source)).toStrictEqual({ functions: [], namespaces: [] });
  });
});

// region | Helpers

/** Reads a source's bindings to `TARGET` as arrays, in the order in which they were read. */
function summarize(source: string): { functions: string[]; namespaces: string[] } {
  const { functions, namespaces } = readImportBindings(blankNonCode(source), source, TARGET);
  return { functions: [...functions], namespaces: [...namespaces] };
}

// endregion | Helpers
