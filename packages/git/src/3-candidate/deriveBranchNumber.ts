import { indexIntoRange } from '@williamthorsen/toolbelt.numbers/candidate';
import { hashString } from '@williamthorsen/toolbelt.strings/candidate';

import { type BranchTicketRefOptions, findBranchTicketRef } from './findBranchTicketRef.ts';

const MAX_UINT32 = 0xffff_ffff;

// The ticket path takes hashString's 32-bit cap, so that both paths accept the same options.
const UINT32_SIZE = 2 ** 32;

/**
 * Derives a number from a branch name: the number of the ticket encoded by the name, or a hash of the name
 * when it encodes none, so a branch always yields a stable number. `min` and `max` bound the result
 * inclusively, and `offset` rotates it, wrapping at the bounds. Throws a RangeError on a malformed `key`, if a
 * bound or the offset is not a safe integer, if min exceeds max, if the range spans more than 2^32 values, or if
 * the ticket number is too large to be finite.
 *
 * @category Git
 * @experimental
 * @stage candidate
 */
export function deriveBranchNumber(branch: string, options: DeriveBranchNumberOptions = {}): number {
  const ref = findBranchTicketRef(branch, options);
  if (ref === undefined) {
    return hashString(branch, options);
  }

  const { max = MAX_UINT32, min = 0, offset = 0 } = options;

  return indexIntoRange(ref.number, { max, maxSpan: UINT32_SIZE, min, offset });
}

export interface DeriveBranchNumberOptions extends BranchTicketRefOptions {
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  readonly offset?: number | undefined;
}
