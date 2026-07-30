import fs from 'node:fs';
import path from 'node:path';

import { findMonorepoRoot } from '@williamthorsen/nmr/workspace';
import { describe, expect, it } from 'vitest';

const EXCLUDED_DIRS = new Set(['__tests__', 'dist', 'node_modules']);
const STAGE_TAG_PATTERN = /@stage\s+(\S+)/g;
const TIER_DIR_PATTERN = /^\d-(?<tier>[a-z]+)$/;

describe('Maturity stage tags', () => {
  it('every @stage tag matches the maturity tier of its directory', () => {
    const { misalignments, tagCount } = auditStageTags(findMonorepoRoot());

    expect(misalignments).toStrictEqual([]);
    // Guard against a vacuous pass: a broken walk would report no misalignments either.
    expect(tagCount).toBeGreaterThan(0);
  });
});

/**
 * Audits every `@stage` tag under a maturity tier directory, reporting those whose value disagrees
 * with the tier holding them. Files outside a `src/{n}-{tier}/` directory carry no tier and are skipped.
 */
function auditStageTags(monorepoRoot: string): { misalignments: string[]; tagCount: number } {
  const misalignments: string[] = [];
  let tagCount = 0;

  const sourceFiles = listSourceFiles(path.join(monorepoRoot, 'packages'));

  for (const filePath of sourceFiles) {
    const tier = extractTier(filePath);
    if (tier === undefined) continue;

    const contents = fs.readFileSync(filePath, 'utf8');
    for (const [, declaredStage] of contents.matchAll(STAGE_TAG_PATTERN)) {
      if (declaredStage === undefined) continue;
      tagCount += 1;

      if (declaredStage !== tier) {
        misalignments.push(`${path.relative(monorepoRoot, filePath)}: @stage ${declaredStage} under ${tier} tier`);
      }
    }
  }

  return { misalignments: misalignments.toSorted((a, b) => a.localeCompare(b)), tagCount };
}

/**
 * Returns the maturity tier name when the file sits directly under a `src/{n}-{tier}/` directory.
 */
function extractTier(filePath: string): string | undefined {
  const segments = filePath.split(path.sep);
  const srcIndex = segments.lastIndexOf('src');
  if (srcIndex === -1) return undefined;

  const tierSegment = segments[srcIndex + 1];
  if (tierSegment === undefined) return undefined;

  return TIER_DIR_PATTERN.exec(tierSegment)?.groups?.tier;
}

/**
 * Yields every TypeScript source file under the given directory, skipping tests and build output.
 */
function* listSourceFiles(rootDir: string): Generator<string> {
  const pendingDirs = [rootDir];

  while (pendingDirs.length > 0) {
    const dir = pendingDirs.pop();
    if (dir === undefined) continue;

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRS.has(entry.name)) pendingDirs.push(entryPath);
      } else if (entry.name.endsWith('.ts')) {
        yield entryPath;
      }
    }
  }
}
