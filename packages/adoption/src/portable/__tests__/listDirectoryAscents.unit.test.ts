import { blankNonCode } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

import { listDirectoryAscents } from '../listDirectoryAscents.ts';

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

describe(listDirectoryAscents, () => {
  it('reports an ascent that carries the parent back through an intermediate binding', () => {
    expect(listAscents(SAVED_PARENT_WALK)).toStrictEqual([{ line: 3, probedNames: undefined }]);
  });

  it('reports an ascent that assigns the parent in place', () => {
    expect(listAscents(SAVED_PREVIOUS_WALK)).toStrictEqual([{ line: 4, probedNames: undefined }]);
  });

  it('reports an ascent however the call is reached', () => {
    const receivers = ['path.dirname(dir)', 'nodePath.dirname(dir)', 'dirname(dir)'].map(
      (call) => `let dir = start;\nwhile (dir !== root) {\n  dir = ${call};\n}\n`,
    );

    expect(receivers.filter((source) => listAscents(source).length === 0)).toStrictEqual([]);
  });

  it('reports an ascent written in a for loop or a do loop', () => {
    const loops = [
      'for (let dir = start; dir !== root; ) {\n  dir = path.dirname(dir);\n}\n',
      'let dir = start;\ndo {\n  dir = path.dirname(dir);\n} while (dir !== root);\n',
    ];

    expect(loops.map((source) => listAscents(source))).toStrictEqual([
      [{ line: 1, probedNames: undefined }],
      [{ line: 2, probedNames: undefined }],
    ]);
  });

  it('reads the name that a probe for a repository marker looks for', () => {
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

    expect(listAscents(source)).toStrictEqual([{ line: 2, probedNames: ['.git'] }]);
  });

  it('reads the name that a probe built by interpolation looks for', () => {
    const source =
      'let dir = start;\nwhile (true) {\n  if (fs.existsSync(`${dir}/.git`)) break;\n  dir = path.dirname(dir);\n}\n';

    expect(listAscents(source)).toStrictEqual([{ line: 2, probedNames: ['.git'] }]);
  });

  it('reads one name from a path however its literal segments are joined', () => {
    const probes = [
      "fs.existsSync(path.join(dir, 'node_modules', 'x', 'package.json'))",
      "fs.existsSync(dir + '/node_modules/x' + '/package.json')",
      'fs.existsSync(`${dir}/node_modules/x/package.json`)',
    ].map((probe) => `let dir = start;\nwhile (true) {\n  if (${probe}) break;\n  dir = path.dirname(dir);\n}\n`);

    expect(probes.map((source) => listAscents(source))).toStrictEqual(
      Array.from({ length: 3 }, () => [{ line: 2, probedNames: ['node_modules/x/package.json'] }]),
    );
  });

  // Reading the literals alone would name `package.json`, which is a different probe.
  it('reads no name from a path holding another binding past the level', () => {
    const probes = [
      "fs.existsSync(path.join(dir, 'node_modules', name, 'package.json'))",
      "fs.existsSync(path.join(dir, name, 'package.json'))",
      'fs.existsSync(`${dir}/${name}/package.json`)',
    ].map((probe) => `let dir = start;\nwhile (true) {\n  if (${probe}) break;\n  dir = path.dirname(dir);\n}\n`);

    expect(probes.map((source) => listAscents(source))).toStrictEqual(
      Array.from({ length: 3 }, () => [{ line: 2, probedNames: [] }]),
    );
  });

  it('reads the name from the path alone, passing over an argument beside it', () => {
    const source =
      "let dir = start;\nwhile (true) {\n  const text = fs.readFileSync(path.join(dir, 'package.json'), 'utf8');\n  dir = path.dirname(dir);\n}\n";

    expect(listAscents(source)).toStrictEqual([{ line: 2, probedNames: ['package.json'] }]);
  });

  it('reads no name from a read of the level itself', () => {
    const source =
      'let dir = start;\nwhile (true) {\n  if (fs.readdirSync(dir).length > 0) break;\n  dir = path.dirname(dir);\n}\n';

    expect(listAscents(source)).toStrictEqual([{ line: 2, probedNames: [] }]);
  });

  it('reads every name that the loop probes for, in source order', () => {
    const source = [
      'let dir = start;',
      'while (true) {',
      "  if (fs.existsSync(path.join(dir, '.git'))) break;",
      "  if (fs.existsSync(path.join(dir, 'package.json'))) break;",
      '  dir = path.dirname(dir);',
      '}',
      '',
    ].join('\n');

    expect(listAscents(source)).toStrictEqual([{ line: 2, probedNames: ['.git', 'package.json'] }]);
  });

  it('reports nothing for a loop that computes a parent per item without assigning it back', () => {
    const source = [
      'for (const file of files) {',
      '  const parent = path.dirname(file);',
      '  record(parent);',
      '}',
      '',
    ].join('\n');

    expect(listAscents(source)).toStrictEqual([]);
  });

  it('reports nothing for a recursive walk-up function, which is no loop', () => {
    const source = [
      'function findUp(dir) {',
      "  if (fs.existsSync(path.join(dir, '.git'))) return dir;",
      '  const parent = path.dirname(dir);',
      '  return parent === dir ? undefined : findUp(parent);',
      '}',
      '',
    ].join('\n');

    expect(listAscents(source)).toStrictEqual([]);
  });

  it('reports nothing for an ascent written with resolve, whose anchor it does not read', () => {
    const source = "let dir = start;\nwhile (dir !== root) {\n  dir = path.resolve(dir, '..');\n}\n";

    expect(listAscents(source)).toStrictEqual([]);
  });

  it('reports nothing for a lone dirname call outside any loop', () => {
    expect(listAscents('const parent = path.dirname(filePath);\n')).toStrictEqual([]);
  });

  it('reports nothing for a dirname call on an expression rather than a binding', () => {
    const source = 'while (true) {\n  dir = path.dirname(path.join(dir, name));\n}\n';

    expect(listAscents(source)).toStrictEqual([]);
  });

  // A loop around an ascent holds every line the ascent holds, and only the innermost names the site.
  it('reports an ascent once, on the innermost loop around it', () => {
    const source = [
      'for (const name of names) {',
      '  let dir = start;',
      '  while (dir !== root) {',
      '    dir = path.dirname(dir);',
      '  }',
      '}',
      '',
    ].join('\n');

    expect(listAscents(source)).toStrictEqual([{ line: 3, probedNames: undefined }]);
  });

  it('reports each of two ascents that sit side by side', () => {
    const source = `${SAVED_PREVIOUS_WALK}${SAVED_PREVIOUS_WALK}`;

    expect(listAscents(source)).toStrictEqual([
      { line: 4, probedNames: undefined },
      { line: 12, probedNames: undefined },
    ]);
  });

  it('finds nothing in prose about an ascent', () => {
    const sources = [
      '// while (true) { dir = path.dirname(dir); }\n',
      "const fix = 'while (true) { dir = path.dirname(dir); }';\n",
    ];

    expect(sources.map((source) => listAscents(source))).toStrictEqual([[], []]);
  });
});

// region | Helpers

/** Blanks a source as a kit's detector does, then lists the ascents that the scanner finds in it. */
function listAscents(source: string) {
  return listDirectoryAscents(blankNonCode(source), source);
}

// endregion | Helpers
