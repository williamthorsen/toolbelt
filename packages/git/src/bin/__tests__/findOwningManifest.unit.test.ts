import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it } from 'vitest';

import { findOwningManifest } from '../findOwningManifest.ts';

describe(findOwningManifest, () => {
  it('answers with the manifest of the package owning the directory', () => {
    using tree = createTempTree({ 'package.json': renderManifest({ name: 'owner', version: '1.2.3' }) });

    const owning = findOwningManifest(tree.dir);

    expect(owning.manifest.version).toBe('1.2.3');
    expect(owning.manifestPath).toBe(tree.resolve('package.json'));
  });

  it('ascends out of a subdirectory holding no manifest', () => {
    using tree = createTempTree({
      'dist/esm/bin/tb-git.js': '',
      'package.json': renderManifest({ name: 'owner', version: '1.2.3' }),
    });

    expect(findOwningManifest(tree.resolve('dist/esm/bin')).manifest.version).toBe('1.2.3');
  });

  it('passes over a marker manifest declaring no name', () => {
    using tree = createTempTree({
      'dist/package.json': renderManifest({ type: 'module' }),
      'package.json': renderManifest({ name: 'owner', version: '1.2.3' }),
    });

    expect(findOwningManifest(tree.resolve('dist')).manifestPath).toBe(tree.resolve('package.json'));
  });
});

// region | Helpers

/** Renders a `package.json` body. */
function renderManifest(fields: Record<string, unknown>): string {
  return `${JSON.stringify(fields, undefined, 2)}\n`;
}

// endregion | Helpers
