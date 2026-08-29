import fs from 'node:fs';
import path from 'node:path';

import { resolveSpecifier } from './resolveSpecifier.ts';

/** Matches a specifier naming a sibling file rather than a package. A bare side-effect import carries no `from`. */
export const RELATIVE_SPECIFIER_PATTERN = /from\s+'(\.[^']*)'/g;

/**
 * Walks an entry file's relative imports transitively, collecting every module they reach, the entry itself
 * included. An entry that does not exist reaches nothing.
 */
export function collectReachableModuleSet(entryFile: string): Set<string> {
  const reached = new Set<string>();
  const pendingFiles = [entryFile];

  while (pendingFiles.length > 0) {
    const filePath = pendingFiles.pop();
    if (filePath === undefined || reached.has(filePath) || !fs.existsSync(filePath)) continue;

    reached.add(filePath);

    for (const [, specifier] of fs.readFileSync(filePath, 'utf8').matchAll(RELATIVE_SPECIFIER_PATTERN)) {
      if (specifier === undefined) continue;

      const target = resolveSpecifier(path.dirname(filePath), specifier);
      if (target !== undefined) pendingFiles.push(target);
    }
  }

  return reached;
}
