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

  it('throws naming a manifest that is unreadable as JSON', () => {
    using tree = createTempTree({ 'package.json': '{ not json' });

    const resolve = () => resolveOwningManifest(renderModuleUrl(tree.resolve('main.js')));

    expect(resolve).toThrow(/is not readable as JSON/);
    expect(resolve).toThrow(tree.resolve('package.json'));
  });

  it('throws naming a manifest that parses to something other than an object', () => {
    using tree = createTempTree({ 'package.json': '"a string"' });

    const resolve = () => resolveOwningManifest(renderModuleUrl(tree.resolve('main.js')));

    expect(resolve).toThrow(/is not a JSON object/);
    expect(resolve).toThrow(tree.resolve('package.json'));
  });

  it('throws on an array manifest rather than ascending past it', () => {
    // The ancestor is named and versioned, so a skipped array would resolve here instead of raising.
    using tree = createTempTree({ 'inner/package.json': '[]' });
    tree.writeJson('package.json', { name: 'outer', version: '1.0.0' });

    const resolve = () => resolveOwningManifest(renderModuleUrl(tree.resolve('inner/main.js')));

    expect(resolve).toThrow(/is not a JSON object/);
    expect(resolve).toThrow(tree.resolve('inner/package.json'));
  });
});
