import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { renderModuleUrl } from '../../test-utils/renderModuleUrl.ts';
import { findPackageRoot } from '../findPackageRoot.ts';

describe(findPackageRoot, () => {
  it('returns the directory of the package that owns the module', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'workspace-root', version: '1.0.0' });
    tree.writeJson('packages/app/package.json', { name: 'app', version: '2.0.0' });

    const result = findPackageRoot(renderModuleUrl(tree.resolve('packages/app/src/deep/main.ts')));

    expect(result).toBe(tree.resolve('packages/app'));
  });

  it('skips the marker manifest left in `dist` by a dual-format build', () => {
    using tree = createTempTree({});
    tree.writeJson('dist/cjs/package.json', { type: 'commonjs' });
    tree.writeJson('package.json', { name: 'demo', version: '1.0.0' });

    const result = findPackageRoot(renderModuleUrl(tree.resolve('dist/cjs/deep/main.js')));

    expect(result).toBe(tree.dir);
  });

  it('returns the same directory from source and compiled layouts', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo', version: '1.0.0' });

    const fromSource = findPackageRoot(renderModuleUrl(tree.resolve('src/3-candidate/resolveSelfVersion.ts')));
    const fromCompiled = findPackageRoot(renderModuleUrl(tree.resolve('dist/esm/3-candidate/resolveSelfVersion.js')));

    expect(fromSource).toBe(tree.dir);
    expect(fromCompiled).toBe(tree.dir);
  });

  it('throws when the module belongs to no named package', () => {
    using tree = createTempTree({ 'app/': '' });

    const find = () => findPackageRoot(renderModuleUrl(tree.resolve('app/main.js')));

    expect(find).toThrow(/No package\.json declaring a name was found/);
  });
});
