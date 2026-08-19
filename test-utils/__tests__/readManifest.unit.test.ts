import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { readManifest } from '../readManifest.ts';

const createdDirs: string[] = [];

describe(readManifest, () => {
  afterEach(() => {
    for (const dir of createdDirs) fs.rmSync(dir, { force: true, recursive: true });
    createdDirs.length = 0;
  });

  it('returns the manifest fields for reading by name', () => {
    const packageDirectory = writeManifest('{ "name": "@scope/pkg", "dependencies": { "vitest": "catalog:" } }');

    expect(readManifest(packageDirectory)['name']).toBe('@scope/pkg');
  });

  it('throws for a manifest that is unreadable as JSON, naming its path', () => {
    const packageDirectory = writeManifest('{ "name": ');

    expect(() => readManifest(packageDirectory)).toThrow(
      `Manifest is not readable as JSON: ${path.join(packageDirectory, 'package.json')}`,
    );
  });

  it('throws for a manifest holding JSON that is not an object, naming its path', () => {
    const packageDirectory = writeManifest('["@scope/pkg"]');

    expect(() => readManifest(packageDirectory)).toThrow(
      `Manifest is not a JSON object: ${path.join(packageDirectory, 'package.json')}`,
    );
  });

  it('throws for a directory holding no manifest', () => {
    const packageDirectory = createPackageDirectory();

    expect(() => readManifest(packageDirectory)).toThrow(
      `Manifest is not readable as JSON: ${path.join(packageDirectory, 'package.json')}`,
    );
  });
});

// region | Helpers

/** Builds a throwaway directory that the calling test fills. */
function createPackageDirectory(): string {
  const packageDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'toolbelt-manifest-'));
  createdDirs.push(packageDirectory);

  return packageDirectory;
}

/** Builds a throwaway package directory holding the given manifest contents. */
function writeManifest(contents: string): string {
  const packageDirectory = createPackageDirectory();
  fs.writeFileSync(path.join(packageDirectory, 'package.json'), contents);

  return packageDirectory;
}

// endregion | Helpers
