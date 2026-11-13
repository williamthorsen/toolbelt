import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { renderModuleUrl } from '../../test-utils/renderModuleUrl.ts';
import { resolveOwningManifest } from '../resolveOwningManifest.ts';

describe(resolveOwningManifest, () => {
  it('returns the nearest manifest declaring a name', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'outer', version: '1.0.0' });
    tree.writeJson('packages/app/package.json', { name: 'app', version: '2.0.0' });

    const result = resolveOwningManifest(renderModuleUrl(tree.resolve('packages/app/src/main.ts')));

    expect(result.packageDir).toBe(tree.resolve('packages/app'));
    expect(result.manifestPath).toBe(tree.resolve('packages/app/package.json'));
    expect(result.manifest.name).toBe('app');
  });

  it('passes over a manifest that declares no name', () => {
    using tree = createTempTree({});
    tree.writeJson('dist/cjs/package.json', { type: 'commonjs' });
    tree.writeJson('package.json', { name: 'demo', version: '1.0.0' });

    const result = resolveOwningManifest(renderModuleUrl(tree.resolve('dist/cjs/main.js')));

    expect(result.packageDir).toBe(tree.dir);
  });

  it('rejects a manifest whose name is not a string', () => {
    using tree = createTempTree({});
    tree.writeJson('inner/package.json', { name: 42, version: '2.0.0' });
    tree.writeJson('package.json', { name: 'outer', version: '1.0.0' });

    const result = resolveOwningManifest(renderModuleUrl(tree.resolve('inner/main.js')));

    expect(result.packageDir).toBe(tree.dir);
  });

  it('throws when no ancestor manifest declares a name', () => {
    using tree = createTempTree({ 'app/': '' });

    const resolve = () => resolveOwningManifest(renderModuleUrl(tree.resolve('app/main.js')));

    expect(resolve).toThrow(/No package\.json declaring a name was found/);
  });
});
