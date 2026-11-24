import { compareStamps } from './compareStamps.ts';
import type { Version } from './types.ts';

/**
 * Returns the key that identifies the unit to which a version belongs: a part by its name, an item by its collection
 * and id.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function formatUnitKey(version: Version): string {
  return version.kind === 'part'
    ? ['part', version.name].join('\0')
    : ['item', version.collection, version.id].join('\0');
}

/**
 * Returns the version of one unit that the merge rule keeps. A tombstone beats any value; otherwise the greater stamp
 * wins, and equal stamps keep `current`. While each stamp identifies one version, the rule is commutative,
 * associative, and idempotent, so that every replica that receives the same versions, in any order and any number of
 * times, keeps the same one; two different versions of a unit with one stamp make the result depend on their order.
 * Throws a `TypeError` when the two versions belong to different units.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function mergeVersion(current: Version | undefined, incoming: Version): Version {
  if (current === undefined) return incoming;
  if (formatUnitKey(current) !== formatUnitKey(incoming)) {
    throw new TypeError('Cannot merge versions of different units');
  }
  const isCurrentDeleted = 'deleted' in current;
  const isIncomingDeleted = 'deleted' in incoming;
  if (isCurrentDeleted !== isIncomingDeleted) return isCurrentDeleted ? current : incoming;
  return compareStamps(incoming.stamp, current.stamp) > 0 ? incoming : current;
}

/**
 * Merges two snapshots of a document unit by unit, under the rule of `mergeVersion`, and returns one version per
 * unit.
 *
 * @category Sync
 * @experimental
 * @stage proposed
 */
export function mergeVersions(current: readonly Version[], incoming: readonly Version[]): Version[] {
  const merged = new Map<string, Version>();
  for (const version of [...current, ...incoming]) {
    const key = formatUnitKey(version);
    merged.set(key, mergeVersion(merged.get(key), version));
  }
  return Array.from(merged.values());
}
