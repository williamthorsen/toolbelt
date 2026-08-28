import fs from 'node:fs';
import path from 'node:path';

import { listExportTargets } from './listExportTargets.ts';

/**
 * Lists the source directories of the maturity tiers a package's `exports` map exposes, so a caller walks the
 * tiers a consumer can import rather than every tier on disk. A workspace organized without maturity tiers, and
 * the strawman tier no subpath names, both yield nothing.
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
