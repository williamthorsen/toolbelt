import type { ParsedCommit, ReleaseType, WorkTypeConfig } from './types.ts';

/** Priority of release types, from highest to lowest. */
const RELEASE_PRIORITY: Record<ReleaseType, number> = {
  major: 3,
  minor: 2,
  patch: 1,
};

/**
 * Determines the overall bump type from a set of parsed commits.
 *
 * Breaking changes always result in a 'major' bump.
 * Otherwise, the highest-priority bump from the matched work types is used.
 *
 * @param commits - The parsed commits to analyze.
 * @param workTypes - The work type configurations to resolve bump types.
 * @returns The determined release type, or undefined if no commits match a known work type.
 */
export function determineBumpType(
  commits: readonly ParsedCommit[],
  workTypes: readonly WorkTypeConfig[],
): ReleaseType | undefined {
  // Build a lookup from work type to its bump type
  const typeToBump: Record<string, ReleaseType> = {};
  for (const config of workTypes) {
    typeToBump[config.type] = config.bump;
  }

  let highestPriority = 0;
  let result: ReleaseType | undefined;

  for (const commit of commits) {
    // Breaking changes always trigger a major bump
    if (commit.breaking) {
      return 'major';
    }

    const commitType = commit.type;
    if (!isKeyOf(commitType, typeToBump)) {
      continue;
    }

    const bump = typeToBump[commitType];
    if (bump === undefined) {
      continue;
    }
    const priority = RELEASE_PRIORITY[bump];

    if (priority > highestPriority) {
      highestPriority = priority;
      result = bump;
    }
  }

  return result;
}

/** Returns true if the object has the specified key. Narrows the type. */
function isKeyOf<T extends object>(key: PropertyKey, obj: T): key is keyof T {
  return Object.hasOwn(obj, key);
}
