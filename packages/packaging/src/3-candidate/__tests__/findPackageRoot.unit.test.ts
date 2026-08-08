import { pathToFileURL } from 'node:url';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/proposed';
import { describe, expect, it } from 'vitest';

import { findPackageRoot } from '../findPackageRoot.ts';

describe(findPackageRoot, () => {
  it('returns the directory of the package that owns the module', () => {
    using tree = createTempTree({
      'package.json': manifest({ name: 'workspace-root', version: '1.0.0' }),
      'packages/app/package.json': manifest({ name: 'app', version: '2.0.0' }),
    });

    const result = findPackageRoot(moduleUrl(tree.resolve('packages/app/src/deep/main.ts')));

    expect(result).toBe(tree.resolve('packages/app'));
  });

  it('skips the marker manifest a dual-format build leaves in `dist`', () => {
    using tree = createTempTree({
      'dist/cjs/package.json': manifest({ type: 'commonjs' }),
      'package.json': manifest({ name: 'demo', version: '1.0.0' }),
    });

    const result = findPackageRoot(moduleUrl(tree.resolve('dist/cjs/deep/main.js')));

    expect(result).toBe(tree.dir);
  });

  it('returns the same directory from source and compiled layouts', () => {
    using tree = createTempTree({ 'package.json': manifest({ name: 'demo', version: '1.0.0' }) });

    const fromSource = findPackageRoot(moduleUrl(tree.resolve('src/3-candidate/getSelfVersion.ts')));
    const fromCompiled = findPackageRoot(moduleUrl(tree.resolve('dist/esm/3-candidate/getSelfVersion.js')));

    expect(fromSource).toBe(tree.dir);
    expect(fromCompiled).toBe(tree.dir);
  });

  it('throws when the module belongs to no named package', () => {
    using tree = createTempTree({ 'app/': '' });

    const find = () => findPackageRoot(moduleUrl(tree.resolve('app/main.js')));

    expect(find).toThrow(/No package\.json declaring a name was found/);
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
