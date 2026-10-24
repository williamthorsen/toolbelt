import { dedent } from '@williamthorsen/toolbelt.strings';
import { describe, expect, it } from 'vitest';

import { listAtomicWriteSites } from '../listAtomicWriteSites.ts';

const PROMISE_FORM = dedent`
  export async function save(filePath, content) {
    const tempPath = \`\${filePath}.tmp\`;
    await fs.writeFile(tempPath, content);
    await fs.rename(tempPath, filePath);
  }

`;

describe(listAtomicWriteSites, () => {
  it('claims a body that writes a path and renames it, naming the rename and the function', () => {
    expect(listAtomicWriteSites(PROMISE_FORM)).toStrictEqual([{ kind: 'temp-write-rename', line: 4, symbol: 'save' }]);
  });

  it('claims the pair however the call is reached', () => {
    const receivers = [
      'fs.writeFileSync(tempPath, content); fs.renameSync(tempPath, filePath);',
      'await fsp.writeFile(tempPath, content); await fsp.rename(tempPath, filePath);',
      'await fs.promises.writeFile(tempPath, content); await fs.promises.rename(tempPath, filePath);',
      'writeFile(tempPath, content); rename(tempPath, filePath);',
    ].map((calls) => `function save(filePath, content) {\n  ${calls}\n}\n`);

    expect(receivers.filter((source) => listAtomicWriteSites(source).length === 0)).toStrictEqual([]);
  });

  it('claims each pair in a body that writes two files', () => {
    const source = dedent`
      function saveBoth(dataPath, metaPath) {
        fs.writeFileSync(dataTemp, data);
        fs.renameSync(dataTemp, dataPath);
        fs.writeFileSync(metaTemp, meta);
        fs.renameSync(metaTemp, metaPath);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([
      { kind: 'temp-write-rename', line: 3, symbol: 'saveBoth' },
      { kind: 'temp-write-rename', line: 5, symbol: 'saveBoth' },
    ]);
  });

  // A closure and every function around it contain the same rename, and only the innermost names the site usefully.
  it('names the innermost function around a rename, reporting the site once', () => {
    const source = dedent`
      export function makeWriter(dir) {
        const write = async (target, content) => {
          await fs.writeFile(tempPath, content);
          await fs.rename(tempPath, target);
        };
        return write;
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([{ kind: 'temp-write-rename', line: 4, symbol: 'write' }]);
  });

  it('declines a body that writes without renaming', () => {
    const source = 'function save(filePath, content) {\n  fs.writeFileSync(filePath, content);\n}\n';

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines a body that renames without writing', () => {
    const source = 'function promote(oldPath, newPath) {\n  fs.renameSync(oldPath, newPath);\n}\n';

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  // Copying and renaming is a move, which `writeAtomic` does not perform.
  it('declines a copy followed by a rename', () => {
    const source = dedent`
      function move(sourcePath, filePath) {
        fs.copyFileSync(sourcePath, tempPath);
        fs.renameSync(tempPath, filePath);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines a rename of a path that the body wrote under another name', () => {
    const source = dedent`
      function save(filePath, content) {
        fs.writeFileSync(logPath, content);
        fs.renameSync(tempPath, filePath);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines a rename that precedes the write of its source', () => {
    const source = dedent`
      function restore(filePath, content) {
        fs.renameSync(tempPath, filePath);
        fs.writeFileSync(tempPath, content);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  // The pairing depends on one binding named twice, and the detector cannot follow a computed argument.
  it('declines a pair whose paths are computed at the call', () => {
    const source = dedent`
      function save(dir, content) {
        fs.writeFileSync(path.join(dir, 'x.tmp'), content);
        fs.renameSync(path.join(dir, 'x.tmp'), path.join(dir, 'x'));
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines calls whose names merely end in the anchors', () => {
    const source = dedent`
      function save(filePath, content) {
        safeWriteFile(tempPath, content);
        safeRename(tempPath, filePath);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines a write and a rename outside any function body', () => {
    const source = 'fs.writeFileSync(tempPath, content);\nfs.renameSync(tempPath, filePath);\n';

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });

  it('declines a write and a rename that are in separate bodies', () => {
    const source = dedent`
      function stage(content) {
        fs.writeFileSync(tempPath, content);
      }
      function publish(filePath) {
        fs.renameSync(tempPath, filePath);
      }

    `;

    expect(listAtomicWriteSites(source)).toStrictEqual([]);
  });
});
