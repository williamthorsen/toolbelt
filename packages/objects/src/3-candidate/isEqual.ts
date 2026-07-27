import { sortObjectKeys } from '../2-draft/index.ts';
import { deepSetsToArrays } from './deepSetsToArrays.ts';

export function isEqual(a: unknown, b: unknown): boolean {
  return JSON.stringify(sortObjectKeys(deepSetsToArrays(a))) === JSON.stringify(sortObjectKeys(deepSetsToArrays(b)));
}
