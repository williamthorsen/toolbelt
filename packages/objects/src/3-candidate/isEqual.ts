import { sortObjectKeys } from '../2-draft/index.ts';
import { deepSetsToArrays } from './deepSetsToArrays.ts';

/** Returns true if two values serialize identically once object keys are sorted and Sets become sorted arrays. */
export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortObjectKeys(deepSetsToArrays(a))) === JSON.stringify(sortObjectKeys(deepSetsToArrays(b)));
}
