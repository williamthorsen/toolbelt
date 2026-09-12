import { blankNonCode } from '@williamthorsen/toolbelt.adoption';
import { describe, expect, it } from 'vitest';

import { listChainWalkSites } from '../listChainWalkSites.ts';

// The saved-parent ascent, which compares each level against its parent to find the filesystem root.
const SAVED_PARENT_WALK = [
  'export function ascend(startDir) {',
  '  let dir = startDir;',
  '  while (true) {',
  '    const parent = path.dirname(dir);',
  '    if (parent === dir) break;',
  '    dir = parent;',
  '  }',
  '}',
  '',
].join('\n');

// The saved-previous ascent, which assigns the parent in place and compares against the level it left.
const SAVED_PREVIOUS_WALK = [
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

describe(listChainWalkSites, () => {
  it('claims an ascent that carries the parent back through an intermediate binding', () => {
    expect(listSites(SAVED_PARENT_WALK)).toStrictEqual([{ kind: 'chain-walk', line: 3 }]);
  });

  it('claims an ascent that assigns the parent in place', () => {
    expect(listSites(SAVED_PREVIOUS_WALK)).toStrictEqual([{ kind: 'chain-walk', line: 4 }]);
  });

  it('claims an ascent however the call is reached', () => {
    const receivers = ['path.dirname(dir)', 'nodePath.dirname(dir)', 'dirname(dir)'].map(
      (call) => `let dir = start;\nwhile (dir !== root) {\n  dir = ${call};\n}\n`,
    );

    expect(receivers.filter((source) => listSites(source).length === 0)).toStrictEqual([]);
  });

  it('claims an ascent written in a for loop or a do loop', () => {
    const loops = [
      'for (let dir = start; dir !== root; ) {\n  dir = path.dirname(dir);\n}\n',
      'let dir = start;\ndo {\n  dir = path.dirname(dir);\n} while (dir !== root);\n',
    ];

    expect(loops.map((source) => listSites(source))).toStrictEqual([
      [{ kind: 'chain-walk', line: 1 }],
      [{ kind: 'chain-walk', line: 2 }],
    ]);
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

  it('names a probe built by interpolation as a search of the chain', () => {
    const source =
      'let dir = start;\nwhile (true) {\n  if (fs.existsSync(`${dir}/.git`)) break;\n  dir = path.dirname(dir);\n}\n';

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-probe', line: 2 }]);
  });

  it('names a read of the level itself as a search of the chain', () => {
    const source =
      'let dir = start;\nwhile (true) {\n  if (fs.readdirSync(dir).length > 0) break;\n  dir = path.dirname(dir);\n}\n';

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-probe', line: 2 }]);
  });

  // The site is `toolbelt.packaging`'s, whose kit recommends `findProjectRoot`.
  it('declines a probe for a manifest, however the path is built', () => {
    const probes = ["fs.existsSync(path.join(dir, 'package.json'))", 'fs.existsSync(`${dir}/package.json`)'].map(
      (probe) => `let dir = start;\nwhile (true) {\n  if (${probe}) break;\n  dir = path.dirname(dir);\n}\n`,
    );

    expect(probes.map((source) => listSites(source))).toStrictEqual([[], []]);
  });

  it('claims a probe for a manifest beside a marker nowhere, the manifest deciding', () => {
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

  it('declines a loop that computes a parent per item without assigning it back', () => {
    const source = [
      'for (const file of files) {',
      '  const parent = path.dirname(file);',
      '  record(parent);',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([]);
  });

  it('declines a recursive walk-up function, which is no loop', () => {
    const source = [
      'function findUp(dir) {',
      "  if (fs.existsSync(path.join(dir, '.git'))) return dir;",
      '  const parent = path.dirname(dir);',
      '  return parent === dir ? undefined : findUp(parent);',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([]);
  });

  it('declines an ascent written with resolve, whose anchor it does not read', () => {
    const source = "let dir = start;\nwhile (dir !== root) {\n  dir = path.resolve(dir, '..');\n}\n";

    expect(listSites(source)).toStrictEqual([]);
  });

  it('declines a lone dirname call outside any loop', () => {
    expect(listSites('const parent = path.dirname(filePath);\n')).toStrictEqual([]);
  });

  it('declines a dirname call on an expression rather than a binding', () => {
    const source = 'while (true) {\n  dir = path.dirname(path.join(dir, name));\n}\n';

    expect(listSites(source)).toStrictEqual([]);
  });

  // A loop around an ascent holds every line the ascent holds, and only the innermost names the site.
  it('names the innermost loop around an ascent, reporting the site once', () => {
    const source = [
      'for (const name of names) {',
      '  let dir = start;',
      '  while (dir !== root) {',
      '    dir = path.dirname(dir);',
      '  }',
      '}',
      '',
    ].join('\n');

    expect(listSites(source)).toStrictEqual([{ kind: 'chain-walk', line: 3 }]);
  });

  it('claims each of two ascents that sit side by side', () => {
    const source = `${SAVED_PREVIOUS_WALK}${SAVED_PREVIOUS_WALK}`;

    expect(listSites(source)).toStrictEqual([
      { kind: 'chain-walk', line: 4 },
      { kind: 'chain-walk', line: 12 },
    ]);
  });

  it('finds nothing in prose about an ascent', () => {
    const sources = [
      '// while (true) { dir = path.dirname(dir); }\n',
      "const fix = 'while (true) { dir = path.dirname(dir); }';\n",
    ];

    expect(sources.map((source) => listSites(source))).toStrictEqual([[], []]);
  });
});

// region | Helpers

/** Blanks a source as the kit's detector does, then lists what the walk detector finds in it. */
function listSites(source: string) {
  return listChainWalkSites(blankNonCode(source), source);
}

// endregion | Helpers
