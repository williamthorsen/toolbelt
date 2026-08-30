import fs from 'node:fs';
import path from 'node:path';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it } from 'vitest';

import { resolveSelfVersion } from '../resolveSelfVersion.ts';

describe(resolveSelfVersion, () => {
  it('reports the version this package declares, not an ancestor manifest', () => {
    expect(resolveSelfVersion()).toBe(readDeclaredVersion());
  });

  it.each([{ name: 'owner' }, { name: 'owner', version: 2 }])(
    'throws naming the manifest that declares no string version: %o',
    (fields) => {
      using tree = createTempTree({ 'package.json': `${JSON.stringify(fields)}\n` });

      const read = () => resolveSelfVersion(tree.dir);

      expect(read).toThrow(TypeError);
      expect(read).toThrow(tree.resolve('package.json'));
    },
  );
});

// region | Helpers

/** Reads the version this package's own manifest declares, throwing where the manifest is malformed. */
function readDeclaredVersion(): string {
  const manifestPath = path.resolve(import.meta.dirname, '../../..', 'package.json');
  const parsed: unknown = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || typeof parsed.version !== 'string') {
    throw new TypeError(`No string version declared at ${manifestPath}.`);
  }

  return parsed.version;
}

// endregion | Helpers
