import { sortObjectKeys } from '../3-candidate/sortObjectKeys.ts';
import { deepSetsToArrays } from './deepSetsToArrays.ts';

/**
 * Returns true if two values serialize identically once object keys are sorted and Sets become sorted arrays.
 *
 * @category Object
 * @stage release
 */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortObjectKeys(deepSetsToArrays(a))) === JSON.stringify(sortObjectKeys(deepSetsToArrays(b)));
}
