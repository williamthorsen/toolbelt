import { pathToFileURL } from 'node:url';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/proposed';
import { describe, expect, it } from 'vitest';

import { resolveOwningManifest } from '../resolveOwningManifest.ts';

describe(resolveOwningManifest, () => {
  it('answers with the nearest manifest declaring a name', () => {
    using tree = createTempTree({
      'package.json': manifest({ name: 'outer', version: '1.0.0' }),
      'packages/app/package.json': manifest({ name: 'app', version: '2.0.0' }),
    });

    const result = resolveOwningManifest(moduleUrl(tree.resolve('packages/app/src/main.ts')));

    expect(result.packageDir).toBe(tree.resolve('packages/app'));
    expect(result.manifestPath).toBe(tree.resolve('packages/app/package.json'));
    expect(result.manifest.name).toBe('app');
  });

  it('passes over a manifest that declares no name', () => {
    using tree = createTempTree({
      'dist/cjs/package.json': manifest({ type: 'commonjs' }),
      'package.json': manifest({ name: 'demo', version: '1.0.0' }),
    });

    const result = resolveOwningManifest(moduleUrl(tree.resolve('dist/cjs/main.js')));

    expect(result.packageDir).toBe(tree.dir);
  });

  it('rejects a manifest whose name is not a string', () => {
    using tree = createTempTree({
      'inner/package.json': manifest({ name: 42, version: '2.0.0' }),
      'package.json': manifest({ name: 'outer', version: '1.0.0' }),
    });

    const result = resolveOwningManifest(moduleUrl(tree.resolve('inner/main.js')));

    expect(result.packageDir).toBe(tree.dir);
  });

  it('throws when no ancestor manifest declares a name', () => {
    using tree = createTempTree({ 'app/': '' });

    const resolve = () => resolveOwningManifest(moduleUrl(tree.resolve('app/main.js')));

    expect(resolve).toThrow(/No package\.json declaring a name was found/);
  });

  it('throws naming a manifest that is unreadable as JSON', () => {
    using tree = createTempTree({ 'package.json': '{ not json' });

    const resolve = () => resolveOwningManifest(moduleUrl(tree.resolve('main.js')));

    expect(resolve).toThrow(/is not readable as JSON/);
    expect(resolve).toThrow(tree.resolve('package.json'));
  });

  it('throws naming a manifest that parses to something other than an object', () => {
    using tree = createTempTree({ 'package.json': '"a string"' });

    const resolve = () => resolveOwningManifest(moduleUrl(tree.resolve('main.js')));

    expect(resolve).toThrow(/is not a JSON object/);
    expect(resolve).toThrow(tree.resolve('package.json'));
  });
});

/** Renders a `package.json` body. */
function manifest(fields: Record<string, unknown>): string {
  return `${JSON.stringify(fields, undefined, 2)}\n`;
}

/**
 * Renders the `import.meta.url` a module at `filePath` would carry. The file need not exist: the ascent
 * reads manifests alone, which is what lets a compiled layout be described without compiling one.
 */
function moduleUrl(filePath: string): string {
  return pathToFileURL(filePath).href;
}
