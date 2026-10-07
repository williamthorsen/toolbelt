import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import readyupConfig from '../.config/readyup.config.ts';
import { readManifest } from '../test-utils/readManifest.ts';

const BUNDLE_PATH = path.join('.readyup', 'kits', 'default.js');

describe('The readyup config', () => {
  it('lists every workspace with a kit among the sources that it runs', () => {
    const { unlisted, workspaceCount } = auditConfiguredPackages(findMonorepoRoot());

    expect(unlisted).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report nothing unlisted either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Reports every workspace that contains a kit and is absent from the config's `sources` as an `npm:` entry,
 * which is the authoritative list for `rdy run --sources`.
 *
 * A kit published by a workspace missing from that list never runs over this repo, and the run says so
 * nowhere: It prints what it was configured to run, so an unlisted kit looks exactly like one that had
 * nothing to report. Because this check discovers workspaces rather than listing them, it covers a package as
 * soon as the package gains a kit.
 */
function auditConfiguredPackages(monorepoRoot: string): { unlisted: string[]; workspaceCount: number } {
  const configured = new Set<string>(readyupConfig.sources);
  const kitDirectories = getWorkspacePackageDirs(monorepoRoot).filter((directory) =>
    fs.existsSync(path.join(directory, BUNDLE_PATH)),
  );

  const unlisted = kitDirectories
    .map((directory) => readWorkspaceName(directory, monorepoRoot))
    .filter((name) => !configured.has(`npm:${name}`));

  return { unlisted: unlisted.toSorted((a, b) => a.localeCompare(b)), workspaceCount: kitDirectories.length };
}

/** Reads a workspace's published name, by which the config names it. */
function readWorkspaceName(directory: string, monorepoRoot: string): string {
  const name = readManifest(directory)['name'];
  if (typeof name !== 'string') {
    throw new TypeError(`Workspace manifest declares no name: ${path.relative(monorepoRoot, directory)}`);
  }
  return name;
}

// endregion | Helpers
