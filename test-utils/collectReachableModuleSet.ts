import fs from 'node:fs';

import { listResolvedImports } from './listResolvedImports.ts';

/**
 * Walks an entry file's relative imports transitively, collecting every module that they reach, the entry itself
 * included. An entry that does not exist reaches nothing.
 */
export function collectReachableModuleSet(entryFile: string): Set<string> {
  const reached = new Set<string>();
  const pendingFiles = [entryFile];

  while (pendingFiles.length > 0) {
    const filePath = pendingFiles.pop();
    if (filePath === undefined || reached.has(filePath) || !fs.existsSync(filePath)) continue;

    reached.add(filePath);
    pendingFiles.push(...listResolvedImports(filePath));
  }

  return reached;
}
