import fs from 'node:fs';
import path from 'node:path';

const SPEC_FILENAME = 'jira-project-spec.json';

/**
 * Finds the project spec that the consuming repo owns, ascending from a directory to the filesystem root and
 * answering the first one it reaches. Throws naming the directory it searched from where no ancestor holds one.
 *
 * @internal
 */
export function findSpecPath(startDir: string): string {
  let dir = path.resolve(startDir);

  for (;;) {
    const specPath = path.join(dir, SPEC_FILENAME);
    if (fs.existsSync(specPath)) return specPath;

    const parent = path.dirname(dir);
    if (parent === dir) throw new Error(`No ${SPEC_FILENAME} at or above ${startDir}. Name one with --spec.`);

    dir = parent;
  }
}
