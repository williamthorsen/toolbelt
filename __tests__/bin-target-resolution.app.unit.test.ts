import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { listStringLeaves } from '../test-utils/listStringLeaves.ts';
import { readManifest } from '../test-utils/readManifest.ts';

// A bin target names a committed wrapper, which exists when pnpm links bins during an install that
// precedes the build. A target naming build output fails the link, and pnpm never retries it.
const BIN_TARGET_PATTERN = /^\.\/bin\/(?<wrapperName>[^/]+\.js)$/;

// The build mirrors `src/` into `dist/esm/`, so the wrapper's build-output reference names the module
// that emitted it.
const BUILD_OUTPUT_PATTERN = /new URL\(['"]\.\.\/dist\/esm\/(?<modulePath>.+?)\.js['"]/;

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
 * at install time and a wrapper that reaches no source module. Either ships a command that the package cannot
 * run, which no suite run from source otherwise reaches.
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

/** Reports what disqualifies a bin target, or `undefined` where the wrapper that it names is fit to run. */
function findTargetFault(packageDirectory: string, target: string): string | undefined {
  const wrapperName = BIN_TARGET_PATTERN.exec(target)?.groups?.['wrapperName'];
  if (wrapperName === undefined) return 'names no committed wrapper under bin/';

  const wrapperPath = path.join(packageDirectory, 'bin', wrapperName);
  if (!fs.existsSync(wrapperPath)) return `reaches no wrapper at bin/${wrapperName}`;

  const wrapper = fs.readFileSync(wrapperPath, 'utf8');
  if (!wrapper.startsWith('#!')) return 'reaches a wrapper with no shebang';

  const modulePath = BUILD_OUTPUT_PATTERN.exec(wrapper)?.groups?.['modulePath'];
  if (modulePath === undefined) return 'reaches a wrapper naming no build output';

  const sourcePath = path.join(packageDirectory, 'src', `${modulePath}.ts`);
  if (!fs.existsSync(sourcePath)) return `names a build output reaching no source module at src/${modulePath}.ts`;

  return undefined;
}

// endregion | Helpers
