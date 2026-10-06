import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { listStringLeaves } from '../test-utils/listStringLeaves.ts';
import { readManifest } from '../test-utils/readManifest.ts';
import { resolveBinSourceModule } from '../test-utils/resolveBinSourceModule.ts';

describe('Declared bins', () => {
  it('every bin target resolves to a committed wrapper reaching a source module', () => {
    const { binCount, danglingTargets } = auditBinTargets(findMonorepoRoot());

    expect(danglingTargets).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no dangling targets either.
    expect(binCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace's `bin` against the wrapper that it names, reporting a target that pnpm cannot link
 * at install time and a wrapper that reaches no source module. Either publishes a command that the package
 * cannot run, a fault that a suite run from source does not otherwise detect.
 */
function auditBinTargets(monorepoRoot: string): { binCount: number; danglingTargets: string[] } {
  const danglingTargets: string[] = [];
  let binCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const workspace = path.relative(monorepoRoot, packageDirectory);

    const targets = listStringLeaves(readManifest(packageDirectory)['bin']);

    for (const target of targets) {
      binCount += 1;

      const resolution = resolveBinSourceModule(packageDirectory, target);
      if ('fault' in resolution) danglingTargets.push(`${workspace}: ${target} ${resolution.fault}`);
    }
  }

  return { binCount, danglingTargets: danglingTargets.toSorted((a, b) => a.localeCompare(b)) };
}

// endregion | Helpers
