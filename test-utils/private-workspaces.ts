import path from 'node:path';

import { getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';

/**
 * The workspaces that publish nothing, declared rather than derived from each manifest's `private` field.
 * Deriving the set would let a scaffolded package that kept the template's `private: true` filter itself out of
 * the audits reading this set, which is one of the misses they exist to catch.
 *
 * `_template` is the scaffold that every package is cloned from, `adoption` the shared layer behind the ReadyUp
 * kits, and `tools` the repo's own tooling. A package that legitimately becomes private is added here, and
 * `__tests__/published-package-shape.app.unit.test.ts` fails until it is.
 */
export const PRIVATE_WORKSPACES: ReadonlySet<string> = new Set(['_template', 'adoption', 'tools']);

/** Lists the directory of every workspace outside `PRIVATE_WORKSPACES`, which is the set that npm publishes. */
export function listPublishedWorkspaceDirectories(monorepoRoot: string): string[] {
  return getWorkspacePackageDirs(monorepoRoot).filter((directory) => !PRIVATE_WORKSPACES.has(path.basename(directory)));
}
