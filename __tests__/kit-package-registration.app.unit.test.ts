import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import readyupConfig from '../.config/readyup.config.ts';
import { readManifest } from '../test-utils/readManifest.ts';

const BUNDLE_PATH = path.join('.readyup', 'kits', 'default.js');

describe('The readyup config', () => {
  it('lists every kit-bearing workspace among the packages that it runs', () => {
    const { unlisted, workspaceCount } = auditConfiguredPackages(findMonorepoRoot());

    expect(unlisted).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report nothing unlisted either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Reports every kit-bearing workspace absent from the config's `packages`, which is the authoritative list
 * for `rdy run --packages`.
 *
 * A workspace publishing a kit and missing from that list never runs over this repo, and the run says so
 * nowhere: it prints what it was configured to run, so an unlisted kit reads exactly like one that had
 * nothing to report. Workspaces are discovered rather than listed, so a package that gains a kit is covered
 * on arrival.
 */
function auditConfiguredPackages(monorepoRoot: string): { unlisted: string[]; workspaceCount: number } {
  const configured = new Set<string>(readyupConfig.packages);
  const kitDirectories = getWorkspacePackageDirs(monorepoRoot).filter((directory) =>
    fs.existsSync(path.join(directory, BUNDLE_PATH)),
  );

  const unlisted = kitDirectories
    .map((directory) => readWorkspaceName(directory, monorepoRoot))
    .filter((name) => !configured.has(name));

  return { unlisted: unlisted.toSorted((a, b) => a.localeCompare(b)), workspaceCount: kitDirectories.length };
}

/** Reads a workspace's published name, which is what the config names it by. */
function readWorkspaceName(directory: string, monorepoRoot: string): string {
  const name = readManifest(directory)['name'];
  if (typeof name !== 'string') {
    throw new TypeError(`Workspace manifest declares no name: ${path.relative(monorepoRoot, directory)}`);
  }
  return name;
}

// endregion | Helpers
