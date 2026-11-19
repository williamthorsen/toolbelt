import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { renderModuleUrl } from '../../test-utils/renderModuleUrl.ts';
import { resolveSelfVersion } from '../resolveSelfVersion.ts';

describe(resolveSelfVersion, () => {
  it('returns the version declared by the owning package', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo', version: '1.4.2' });

    expect(resolveSelfVersion(renderModuleUrl(tree.resolve('src/main.ts')))).toBe('1.4.2');
  });

  it('reports the same version from source and compiled layouts at differing depths', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo', version: '1.4.2' });

    const fromUrls = [
      tree.resolve('src/main.ts'),
      tree.resolve('src/3-candidate/deep/nested/helper.ts'),
      tree.resolve('dist/esm/4-release/index.js'),
    ].map(renderModuleUrl);

    expect(fromUrls.map(resolveSelfVersion)).toStrictEqual(['1.4.2', '1.4.2', '1.4.2']);
  });

  it('skips the marker manifest left in `dist` by a dual-format build', () => {
    using tree = createTempTree({});
    tree.writeJson('dist/cjs/package.json', { type: 'commonjs' });
    tree.writeJson('package.json', { name: 'demo', version: '1.4.2' });

    expect(resolveSelfVersion(renderModuleUrl(tree.resolve('dist/cjs/deep/main.js')))).toBe('1.4.2');
  });

  it('throws naming the manifest when it declares no version', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo' });

    const read = () => resolveSelfVersion(renderModuleUrl(tree.resolve('src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('package.json'));
  });

  it('throws naming the manifest when the version is not a string', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo', version: 2 });

    const read = () => resolveSelfVersion(renderModuleUrl(tree.resolve('src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('package.json'));
  });

  it('never reports an ancestor’s version for a named package that declares none', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'outer', version: '9.9.9' });
    tree.writeJson('packages/app/package.json', { name: 'app' });

    const read = () => resolveSelfVersion(renderModuleUrl(tree.resolve('packages/app/src/main.ts')));

    expect(read).toThrow(/declares no string version/);
    expect(read).toThrow(tree.resolve('packages/app/package.json'));
  });
});
