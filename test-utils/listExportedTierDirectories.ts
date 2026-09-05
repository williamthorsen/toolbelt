import fs from 'node:fs';
import path from 'node:path';

import { listExportTargets } from './listExportTargets.ts';

/**
 * Lists the source directories of the maturity tiers exposed by a package's `exports` map, so a caller walks
 * the tiers that a consumer can import rather than every tier on disk. A workspace organized without maturity
 * tiers, and the strawman tier named by no subpath, both yield nothing.
 */
export function listExportedTierDirectories(packageDirectory: string): string[] {
  const tiers = new Set(
    listExportTargets(packageDirectory)
      .map(({ tier }) => tier)
      .filter((tier) => tier !== undefined),
  );

  return [...tiers]
    .map((tier) => path.join(packageDirectory, 'src', tier))
    .filter((tierDirectory) => fs.existsSync(tierDirectory))
    .toSorted((a, b) => a.localeCompare(b));
}
