import fs from 'node:fs';
import path from 'node:path';

import { resolveSpecifier } from './resolveSpecifier.ts';

/** Matches the relative specifier of a static `from` clause, a side-effect import, or a dynamic import. */
const RELATIVE_SPECIFIER_PATTERN = /\b(?:from|import)\s*\(?\s*['"](\.\.?\/[^'"]*)['"]/gu;

/**
 * Lists the files named by a file's relative imports, in source order and once per import. A specifier that does not
 * resolve to a file is dropped.
 */
export function listResolvedImports(filePath: string): string[] {
  const targets: string[] = [];

  for (const [, specifier] of fs.readFileSync(filePath, 'utf8').matchAll(RELATIVE_SPECIFIER_PATTERN)) {
    if (specifier === undefined) continue;

    const target = resolveSpecifier(path.dirname(filePath), specifier);
    if (target !== undefined) targets.push(target);
  }

  return targets;
}
