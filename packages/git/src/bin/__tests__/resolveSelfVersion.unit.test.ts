import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { resolveSelfVersion } from '../resolveSelfVersion.ts';

describe(resolveSelfVersion, () => {
  it('reports the version this package declares, not an ancestor manifest', () => {
    const packageRoot = path.resolve(import.meta.dirname, '../../..');
    const declared: unknown = JSON.parse(fs.readFileSync(path.join(packageRoot, 'package.json'), 'utf8'));

    expect(resolveSelfVersion()).toBe(isVersioned(declared) ? declared.version : undefined);
  });
});

// region | Helpers

/** Narrows a parsed manifest to one carrying a string version, so a malformed one fails the assertion. */
function isVersioned(value: unknown): value is { version: string } {
  return typeof value === 'object' && value !== null && 'version' in value && typeof value.version === 'string';
}

// endregion | Helpers
