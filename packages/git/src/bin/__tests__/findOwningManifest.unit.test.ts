import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { findOwningManifest } from '../findOwningManifest.ts';

const createdDirs: string[] = [];

describe(findOwningManifest, () => {
  afterEach(() => {
    for (const dir of createdDirs) fs.rmSync(dir, { force: true, recursive: true });
    createdDirs.length = 0;
  });

  it('answers with the nearest manifest declaring a name', () => {
    const root = createTree({ 'package.json': { name: 'owner', version: '1.2.3' } });

    const { manifest, manifestPath } = findOwningManifest(root);

    expect(manifest.version).toBe('1.2.3');
    expect(manifestPath).toBe(path.join(root, 'package.json'));
  });

  it('ascends out of a subdirectory holding no manifest', () => {
    const root = createTree({ 'dist/esm/bin/.keep': '', 'package.json': { name: 'owner', version: '1.2.3' } });

    expect(findOwningManifest(path.join(root, 'dist/esm/bin')).manifest.version).toBe('1.2.3');
  });

  it('passes over a marker manifest declaring no name', () => {
    const root = createTree({
      'dist/package.json': { type: 'commonjs' },
      'package.json': { name: 'owner', version: '1.2.3' },
    });

    expect(findOwningManifest(path.join(root, 'dist')).manifestPath).toBe(path.join(root, 'package.json'));
  });

  it('throws where no ancestor declares a name', () => {
    // The temp directory's own ancestors hold no manifest, so the ascent runs to the filesystem root.
    const root = createTree({ 'package.json': { type: 'commonjs' } });

    expect(() => findOwningManifest(root)).toThrow(/No package manifest declaring a name/);
  });
});

// region | Helpers

/** Writes a throwaway directory tree, JSON-encoding an object entry and writing a string entry verbatim. */
function createTree(entries: Record<string, unknown>): string {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'tb-git-'));
  createdDirs.push(root);

  for (const [relativePath, content] of Object.entries(entries)) {
    const filePath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, typeof content === 'string' ? content : JSON.stringify(content));
  }

  return root;
}

// endregion | Helpers
