import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { findNearestManifest, type PackageManifest } from '../findNearestManifest.ts';

describe(findNearestManifest, () => {
  it('returns the nearest accepted manifest with its location', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { private: true });
    tree.writeJson('packages/app/package.json', { private: true, name: 'app' });

    const result = findNearestManifest(tree.resolve('packages/app/src'), (manifest) => manifest['private'] === true);

    expect(result).toStrictEqual({
      manifest: { private: true, name: 'app' },
      manifestPath: tree.resolve('packages/app/package.json'),
      packageDir: tree.resolve('packages/app'),
    });
  });

  it('passes over a manifest that the predicate rejects', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { workspaces: ['packages/*'] });
    tree.writeJson('packages/app/package.json', { name: 'app' });

    const result = findNearestManifest(tree.resolve('packages/app'), (manifest) => 'workspaces' in manifest);

    expect(result?.packageDir).toBe(tree.dir);
  });

  it('returns undefined when no manifest is accepted', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { name: 'demo' });

    expect(findNearestManifest(tree.dir, () => false)).toBeUndefined();
  });

  it('narrows the manifest through a type-guard predicate', () => {
    using tree = createTempTree({});
    tree.writeJson('package.json', { packageManager: 'pnpm@12.4.0' });

    const result = findNearestManifest(tree.dir, hasPackageManager);

    expectTypeOf(result?.manifest.packageManager).toEqualTypeOf<string | undefined>();
    expect(result?.manifest.packageManager).toBe('pnpm@12.4.0');
  });

  it('throws naming a manifest that is unreadable as JSON', () => {
    using tree = createTempTree({ 'package.json': '{ not json' });

    const find = () => findNearestManifest(tree.dir, () => true);

    expect(find).toThrow(`Package manifest is not readable as JSON: ${tree.resolve('package.json')}`);
  });

  it('throws naming a manifest that parses to something other than an object', () => {
    using tree = createTempTree({ 'package.json': '"a string"' });

    const find = () => findNearestManifest(tree.dir, () => true);

    expect(find).toThrow(`Package manifest is not a JSON object: ${tree.resolve('package.json')}`);
  });

  it('throws on an array manifest rather than ascending past it', () => {
    using tree = createTempTree({ 'inner/package.json': '[]' });
    tree.writeJson('package.json', { name: 'outer' });

    const find = () => findNearestManifest(tree.resolve('inner'), () => true);

    expect(find).toThrow(`Package manifest is not a JSON object: ${tree.resolve('inner/package.json')}`);
  });

  it('throws on a malformed manifest below one that the predicate would accept', () => {
    // The predicate never sees the malformed manifest, so a skip would return the ancestor.
    using tree = createTempTree({ 'inner/package.json': '{' });
    tree.writeJson('package.json', { name: 'outer' });

    const find = () => findNearestManifest(tree.resolve('inner'), (manifest) => manifest['name'] === 'outer');

    expect(find).toThrow(`Package manifest is not readable as JSON: ${tree.resolve('inner/package.json')}`);
  });
});

// region | Helpers
function hasPackageManager(manifest: PackageManifest): manifest is PackageManifest & { packageManager: string } {
  return typeof manifest['packageManager'] === 'string';
}
// endregion | Helpers
