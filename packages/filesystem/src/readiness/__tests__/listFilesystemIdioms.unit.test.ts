import { describe, expect, it } from 'vitest';

import { listFilesystemIdioms } from '../listFilesystemIdioms.ts';

describe(listFilesystemIdioms, () => {
  it('names each idiom that it finds and orders the sites by line', () => {
    const source = [
      'export function ascend(startDir) {',
      '  let dir = startDir;',
      '  while (dir !== root) {',
      '    dir = path.dirname(dir);',
      '  }',
      '}',
      'export function save(filePath, content) {',
      '  fs.writeFileSync(tempPath, content);',
      '  fs.renameSync(tempPath, filePath);',
      '}',
      '',
    ].join('\n');

    expect(listFilesystemIdioms(source)).toStrictEqual([
      { kind: 'chain-walk', line: 3 },
      { kind: 'temp-write-rename', line: 9, symbol: 'save' },
    ]);
  });

  it('finds nothing in a source holding neither idiom', () => {
    expect(listFilesystemIdioms('export const dir = path.dirname(filePath);\n')).toStrictEqual([]);
  });

  it('finds nothing in prose about the idioms', () => {
    const sources = [
      '// while (dir !== root) { dir = path.dirname(dir); }\n',
      '/**\n * Writes through fs.writeFileSync(tempPath, content) and fs.renameSync(tempPath, filePath).\n */\n',
      "const fix = 'while (true) { dir = path.dirname(dir); }';\n",
      'const pattern = /dirname\\(dir\\)/;\n',
    ];

    expect(sources.map((source) => listFilesystemIdioms(source))).toStrictEqual(sources.map(() => []));
  });
});
