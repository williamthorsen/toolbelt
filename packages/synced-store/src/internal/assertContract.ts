import { isEqual } from '@williamthorsen/toolbelt.objects';

import { formatUnitKey } from '../1-proposed/mergeVersion.ts';
import type { Version } from '../1-proposed/types.ts';

/**
 * Throws an `Error` stating the check, the expected value, and the actual one, unless the two values are equal.
 *
 * @internal
 */
export function assertContractEqual(actual: unknown, expected: unknown, check: string): void {
  if (!isEqual(actual, expected)) {
    throw new Error(`${check}: expected ${JSON.stringify(expected)}, received ${JSON.stringify(actual)}`);
  }
}

/**
 * Throws an `Error` naming the check unless the promise rejects.
 *
 * @internal
 */
export async function assertContractRejects(promise: Promise<unknown>, check: string): Promise<void> {
  try {
    await promise;
  } catch {
    return;
  }
  throw new Error(`${check}: expected the call to reject, but it resolved`);
}

/**
 * Throws an `Error` unless the loaded versions are the expected ones, one per unit, in any order.
 *
 * @internal
 */
export function assertSameVersions(actual: readonly Version[], expected: readonly Version[], check: string): void {
  const keys = actual.map((version) => formatUnitKey(version));
  if (new Set(keys).size !== keys.length) {
    throw new Error(`${check}: the load returned more than one version of a unit: ${JSON.stringify(actual)}`);
  }
  assertContractEqual(sortByUnit(actual), sortByUnit(expected), check);
}

// region | Helpers
function sortByUnit(versions: readonly Version[]): Version[] {
  return versions.toSorted((a, b) => {
    const aKey = formatUnitKey(a);
    const bKey = formatUnitKey(b);
    if (aKey < bKey) return -1;
    return aKey > bKey ? 1 : 0;
  });
}
// endregion | Helpers
