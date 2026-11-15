import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot, getWorkspacePackageDirs } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

// The README conventions record a README's type on its first line, with a slug from their type table. The table
// lives in the conventions rather than in the repo, so the pattern checks the marker's form alone.
const README_TYPE_MARKER = /^<!-- readme-type: [a-z-]+ -->$/;

describe('README type marker', () => {
  it('every workspace README opens with a readme-type marker', () => {
    const { defects, workspaceCount } = auditReadmeTypeMarkers(findMonorepoRoot());

    expect(defects).toStrictEqual([]);
    // Guard against a vacuous pass: A broken walk would report no defects either.
    expect(workspaceCount).toBeGreaterThan(0);
  });
});

// region | Helpers

/** Audits every workspace's README, private workspaces included, for a readme-type marker on its first line. */
function auditReadmeTypeMarkers(monorepoRoot: string): { defects: string[]; workspaceCount: number } {
  const defects: string[] = [];
  const packageDirectories = getWorkspacePackageDirs(monorepoRoot);

  for (const packageDirectory of packageDirectories) {
    const workspace = path.basename(packageDirectory);
    const readmePath = path.join(packageDirectory, 'README.md');

    if (!fs.existsSync(readmePath)) {
      defects.push(`${workspace}: README.md is missing`);
    } else if (!opensWithReadmeTypeMarker(readmePath)) {
      defects.push(`${workspace}: README.md does not open with <!-- readme-type: <slug> -->`);
    }
  }

  return { defects: defects.toSorted((a, b) => a.localeCompare(b)), workspaceCount: packageDirectories.length };
}

/** Reports whether a file's first line is a readme-type marker. */
function opensWithReadmeTypeMarker(filePath: string): boolean {
  const firstLine = fs.readFileSync(filePath, 'utf8').split('\n', 1)[0] ?? '';

  return README_TYPE_MARKER.test(firstLine);
}

// endregion | Helpers
