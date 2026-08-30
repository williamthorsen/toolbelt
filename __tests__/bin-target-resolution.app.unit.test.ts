import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { listStringLeaves } from '../test-utils/listStringLeaves.ts';
import { readManifest } from '../test-utils/readManifest.ts';

// The build mirrors `src/` into `dist/esm/`, so a bin target names the module that emitted it.
const BIN_TARGET_PATTERN = /^\.\/dist\/esm\/(?<modulePath>.+)\.js$/;

describe('Declared bins', () => {
  it('every bin target resolves to a source module carrying a shebang', () => {
    const { binCount, danglingTargets } = auditBinTargets(findMonorepoRoot());

    expect(danglingTargets).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no dangling targets either.
    expect(binCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Audits every workspace's `bin` against the source it names, reporting a target that reaches no module and
 * a module that carries no shebang. Either ships a command the package cannot run, which no suite run from
 * source otherwise reaches.
 */
function auditBinTargets(monorepoRoot: string): { binCount: number; danglingTargets: string[] } {
  const danglingTargets: string[] = [];
  let binCount = 0;

  for (const packageDirectory of getWorkspacePackageDirs(monorepoRoot)) {
    const workspace = path.relative(monorepoRoot, packageDirectory);

    const targets = listStringLeaves(readManifest(packageDirectory)['bin']);

    for (const target of targets) {
      binCount += 1;

      const fault = findTargetFault(packageDirectory, target);
      if (fault !== undefined) danglingTargets.push(`${workspace}: ${target} ${fault}`);
    }
  }

  return { binCount, danglingTargets: danglingTargets.toSorted((a, b) => a.localeCompare(b)) };
}

/** Reports what disqualifies a bin target, or `undefined` where the source it names is fit to run. */
function findTargetFault(packageDirectory: string, target: string): string | undefined {
  const modulePath = BIN_TARGET_PATTERN.exec(target)?.groups?.['modulePath'];
  if (modulePath === undefined) return 'names no build output';

  const sourcePath = path.join(packageDirectory, 'src', `${modulePath}.ts`);
  if (!fs.existsSync(sourcePath)) return `reaches no source module at src/${modulePath}.ts`;

  return fs.readFileSync(sourcePath, 'utf8').startsWith('#!') ? undefined : 'reaches a source module with no shebang';
}

// endregion | Helpers
