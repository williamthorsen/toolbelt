import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listChainWalkSites } from '../listChainWalkSites.ts';

describe(listChainWalkSites, () => {
  it('names a bare ascent as a walk of the chain', () => {
    const source = [
      'export function ascend(startDir) {',
      '  let dir = startDir;',
      '  let previous;',
      '  while (dir !== previous) {',
      '    previous = dir;',
      '    dir = path.dirname(dir);',
      '  }',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-walk', line: 4 }]);
  });

  it('names a probe for a repository marker as a search of the chain', () => {
    const source = [
      'let dir = start;',
      'while (true) {',
      "  if (fs.existsSync(path.join(dir, '.git'))) return dir;",
      '  const parent = path.dirname(dir);',
      '  if (parent === dir) break;',
      '  dir = parent;',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-probe', line: 2 }]);
  });

  it('names a read of the level itself as a search of the chain', () => {
    const source =
      'let dir = start;\nwhile (true) {\n  if (fs.readdirSync(dir).length > 0) break;\n  dir = path.dirname(dir);\n}\n';

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-probe', line: 2 }]);
  });

  // The site is `toolbelt.packaging`'s, whose kit recommends `findProjectRoot`.
  it('declines a probe for a manifest, regardless of how the path is built', () => {
    const probes = ["fs.existsSync(path.join(dir, 'package.json'))", 'fs.existsSync(`${dir}/package.json`)'].map(
      (probe) => `let dir = start;\nwhile (true) {\n  if (${probe}) break;\n  dir = path.dirname(dir);\n}\n`,
    );

    expect(probes.map((source) => listSites(source))).toStrictEqual([[], []]);
  });

  it('declines a probe for a manifest, regardless of how many markers sit beside it', () => {
    const source = [
      'let dir = start;',
      'while (true) {',
      "  if (fs.existsSync(path.join(dir, '.git'))) break;",
      "  if (fs.existsSync(path.join(dir, 'package.json'))) break;",
      '  dir = path.dirname(dir);',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([]);
  });
});

// region | Helpers

/** Blanks a source as the kit's detector does, then lists what the walk detector finds in it. */
function listSites(source: string) {
  return listChainWalkSites(blankNonCode(source), source);
}

// endregion | Helpers
