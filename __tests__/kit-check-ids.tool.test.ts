import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

import { isRecord } from '../test-utils/isRecord.ts';
import { isUnknownArray } from '../test-utils/isUnknownArray.ts';

const BUNDLE_PATH = path.join('.readyup', 'kits', 'default.js');

describe('Compiled kit check ids', () => {
  it('every kit-bearing workspace assembles its kit and names every check', async () => {
    const { failures, workspaceCount } = await auditCompiledKits(findMonorepoRoot());

    expect(failures).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no failures either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/**
 * Assembles every kit-bearing workspace's compiled kit and reports those whose checks are not all named.
 *
 * Loading is half the assertion: `defineAdoptionKit` refuses a kit giving one id to two checks, and the
 * bundle inlines that guard, so an import is what runs it. Only `numbers` assembles a kit in its own suite,
 * and this is what reaches the rest. The bundle is loaded rather than the source, which needs no built tree
 * and is the artifact that a consumer runs.
 */
async function auditCompiledKits(monorepoRoot: string): Promise<{ failures: string[]; workspaceCount: number }> {
  const failures: string[] = [];
  const bundles = getWorkspacePackageDirs(monorepoRoot).filter((directory) =>
    fs.existsSync(path.join(directory, BUNDLE_PATH)),
  );

  for (const directory of bundles) {
    const reason = await findUnnamedChecks(path.join(directory, BUNDLE_PATH));
    if (reason !== undefined) failures.push(`${path.relative(monorepoRoot, directory)}: ${reason}`);
  }

  return { failures: failures.toSorted((a, b) => a.localeCompare(b)), workspaceCount: bundles.length };
}

/** Reports why a compiled kit's checks fail to name themselves, or nothing where every one of them does. */
async function findUnnamedChecks(bundlePath: string): Promise<string | undefined> {
  const ids = await listCheckIds(bundlePath);
  if (ids.length === 0) return 'the bundle exposes no adoption checks';

  const unnamed = ids.filter((id) => id === undefined).length;
  return unnamed === 0 ? undefined : `${String(unnamed)} of ${String(ids.length)} checks declare no id`;
}

/** Lists the id declared by each of a compiled kit's checks, in declaration order. */
async function listCheckIds(bundlePath: string): Promise<Array<string | undefined>> {
  const module: unknown = await import(pathToFileURL(bundlePath).href);
  const kit = isRecord(module) ? module['default'] : undefined;
  const checklists = isRecord(kit) ? kit['checklists'] : undefined;
  if (!isUnknownArray(checklists)) return [];

  return checklists
    .flatMap((checklist) => listChecklistChecks(checklist))
    .map((check) => (isRecord(check) && typeof check['id'] === 'string' ? check['id'] : undefined));
}

/** Lists one checklist's checks, or nothing where the value does not hold any. */
function listChecklistChecks(checklist: unknown): unknown[] {
  const checks = isRecord(checklist) ? checklist['checks'] : undefined;
  return isUnknownArray(checks) ? checks : [];
}

// endregion | Helpers
