import fs from 'node:fs';
import path from 'node:path';

import { isJsTsSource } from '../../conventions/path-predicates.ts';

/**
 * Lists the paths of the JavaScript and TypeScript sources directly inside each directory, in the order given.
 * Subdirectories are not walked, so a caller that also passes a nested directory does not get its files twice.
 */
export function listJsTsSources(directories: readonly string[]): string[] {
  return directories.flatMap((directory) =>
    fs
      .readdirSync(directory)
      .filter((name) => isJsTsSource(name))
      .map((name) => path.join(directory, name)),
  );
}
