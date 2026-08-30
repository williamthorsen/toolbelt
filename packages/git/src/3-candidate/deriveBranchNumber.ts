import { hashString } from '@williamthorsen/toolbelt.strings/candidate';

import { type BranchTicketRefOptions, findBranchTicketRef } from './findBranchTicketRef.ts';

const MAX_UINT32 = 0xffff_ffff;

/**
 * Derives a number from a branch name: the number of the ticket encoded by the name, or a hash of the name
 * when it encodes none, so a branch always yields a stable number. `min` and `max` bound the result
 * inclusively, and `offset` rotates it, wrapping at the bounds. Throws a RangeError on a malformed `key`,
 * or on a bound or offset hashString rejects.
 *
 * @category Git
 * @experimental
 * @stage candidate
 */
export function deriveBranchNumber(branch: string, options: DeriveBranchNumberOptions = {}): number {
  // Hashing before the branch decision is what makes hashString validate the bounds on both paths.
  const digest = hashString(branch, options);
  const ref = findBranchTicketRef(branch, options);

  return ref === undefined ? digest : wrapIntoRange(ref.number, options);
}

export interface DeriveBranchNumberOptions extends BranchTicketRefOptions {
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  readonly offset?: number | undefined;
}

// region | Helpers

/** Wraps a value into the inclusive range and rotates it, mirroring the bounding hashString applies to its digest. */
function wrapIntoRange(value: number, options: DeriveBranchNumberOptions): number {
  const { max = MAX_UINT32, min = 0, offset = 0 } = options;

  const size = max - min + 1;
  const shift = ((offset % size) + size) % size;

  return min + ((value + shift) % size);
}

// endregion | Helpers
