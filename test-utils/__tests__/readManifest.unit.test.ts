import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createTempDir } from '../createTempDir.ts';
import { readManifest } from '../readManifest.ts';

describe(readManifest, () => {
  it('returns the manifest fields for reading by name', () => {
    using tree = createTempDir({
      'package.json': '{ "name": "@scope/pkg", "dependencies": { "vitest": "catalog:" } }',
    });

    expect(readManifest(tree.dir)['name']).toBe('@scope/pkg');
  });

  it('throws for a manifest that is unreadable as JSON, naming its path', () => {
    using tree = createTempDir({ 'package.json': '{ "name": ' });

    expect(() => readManifest(tree.dir)).toThrow(
      `Manifest is not readable as JSON: ${path.join(tree.dir, 'package.json')}`,
    );
  });

  it('throws for a manifest holding JSON that is not an object, naming its path', () => {
    using tree = createTempDir({ 'package.json': '["@scope/pkg"]' });

    expect(() => readManifest(tree.dir)).toThrow(
      `Manifest is not a JSON object: ${path.join(tree.dir, 'package.json')}`,
    );
  });

  it('throws for a directory holding no manifest', () => {
    using tree = createTempDir({});

    expect(() => readManifest(tree.dir)).toThrow(
      `Manifest is not readable as JSON: ${path.join(tree.dir, 'package.json')}`,
    );
  });
});
