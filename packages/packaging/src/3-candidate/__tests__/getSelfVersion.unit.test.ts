import { pathToFileURL } from 'node:url';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/proposed';
import { describe, expect, it } from 'vitest';

import { getSelfVersion } from '../getSelfVersion.ts';

describe(getSelfVersion, () => {
  it('returns the version the owning package declares', () => {
    using tree = createTempTree({ 'package.json': manifest({ name: 'demo', version: '1.4.2' }) });

    expect(getSelfVersion(moduleUrl(tree.resolve('src/main.ts')))).toBe('1.4.2');
  });

  it('reports the same version from source and compiled layouts at differing depths', () => {
    using tree = createTempTree({ 'package.json': manifest({ name: 'demo', version: '1.4.2' }) });

    const fromUrls = [
      tree.resolve('src/main.ts'),
      tree.resolve('src/3-candidate/deep/nested/helper.ts'),
      tree.resolve('dist/esm/4-release/index.js'),
    ].map(moduleUrl);

    expect(fromUrls.map(getSelfVersion)).toStrictEqual(['1.4.2', '1.4.2', '1.4.2']);
  });

  it('skips the marker manifest a dual-format build leaves in `dist`', () => {
    using tree = createTempTree({
      'dist/cjs/package.json': manifest({ type: 'commonjs' }),
      'package.json': manifest({ name: 'demo', version: '1.4.2' }),
    });

    expect(getSelfVersion(moduleUrl(tree.resolve('dist/cjs/deep/main.js')))).toBe('1.4.2');
  });

  it('throws naming the manifest when it declares no version', () => {
    using tree = createTempTree({ 'package.json': manifest({ name: 'demo' }) });

    const read = () => getSelfVersion(moduleUrl(tree.resolve('src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('package.json'));
  });

  it('throws naming the manifest when the version is not a string', () => {
    using tree = createTempTree({ 'package.json': manifest({ name: 'demo', version: 2 }) });

    const read = () => getSelfVersion(moduleUrl(tree.resolve('src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('package.json'));
  });

  it('never reports an ancestor’s version for a named package that declares none', () => {
    using tree = createTempTree({
      'package.json': manifest({ name: 'outer', version: '9.9.9' }),
      'packages/app/package.json': manifest({ name: 'app' }),
    });

    const read = () => getSelfVersion(moduleUrl(tree.resolve('packages/app/src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('packages/app/package.json'));
  });
});

/** Renders a `package.json` body. */
function manifest(fields: Record<string, unknown>): string {
  return `${JSON.stringify(fields, undefined, 2)}\n`;
}

/** Renders the `import.meta.url` a module at `filePath` would carry. The file need not exist. */
function moduleUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
