import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { glob } from 'glob';
import { load } from 'js-yaml';

/**
 * Reads `pnpm-workspace.yaml` and resolves its `packages` globs to discover workspace directories.
 *
 * Returns an array of workspace-relative directory paths (e.g., `['packages/arrays', 'packages/strings']`).
 * Only directories containing a `package.json` are included.
 *
 * Note: The returned paths are full relative paths from the repo root (e.g., `packages/arrays`),
 * not bare directory names. Callers that need bare names (e.g., for `component()`) should
 * use `path.basename()` to strip the prefix.
 *
 * @returns The discovered workspace paths, or `undefined` if no workspace config is found.
 */
export async function discoverWorkspaces(): Promise<string[] | undefined> {
  const workspaceFile = 'pnpm-workspace.yaml';

  if (!existsSync(workspaceFile)) {
    return undefined;
  }

  let content: string;
  try {
    content = readFileSync(workspaceFile, 'utf8');
  } catch {
    return undefined;
  }

  const parsed = load(content);
  if (!isRecord(parsed)) {
    return undefined;
  }

  const packagesField = parsed.packages;
  if (!Array.isArray(packagesField)) {
    return undefined;
  }

  const patterns = packagesField.filter((p): p is string => typeof p === 'string');
  if (patterns.length === 0) {
    return undefined;
  }

  // Resolve globs to find directories
  const directories: string[] = [];

  for (const pattern of patterns) {
    const matches = await glob(pattern, { posix: true });
    for (const match of matches) {
      if (existsSync(join(match, 'package.json'))) {
        directories.push(match);
      }
    }
  }

  // eslint-disable-next-line unicorn/no-array-sort -- toSorted requires Node 20+; engine target is >=18.17.0
  return directories.length > 0 ? [...directories].sort() : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
