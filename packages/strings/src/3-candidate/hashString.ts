import { indexIntoRange } from '@williamthorsen/toolbelt.numbers/candidate';

const FNV_OFFSET_BASIS = 0x811c_9dc5;
const FNV_PRIME = 0x0100_0193;
const MAX_UINT32 = 0xffff_ffff;

// The digest is 32 bits wide, so it cannot fill a wider range.
const UINT32_SIZE = 2 ** 32;

/**
 * Deterministically derives an integer from a string, by default across the full 32-bit range.
 * `min` and `max` bound the result inclusively, and `offset` rotates it, wrapping at the bounds.
 * Throws a RangeError if a bound or the offset is not a safe integer, if min exceeds max, or if
 * the range spans more than 2^32 values.
 *
 * @category String
 * @experimental
 * @stage candidate
 */
export function hashString(text: string, options: HashStringOptions = {}): number {
  const { max = MAX_UINT32, min = 0, offset = 0 } = options;

  return indexIntoRange(computeDigest(text), { max, maxSpan: UINT32_SIZE, min, offset });
}

export interface HashStringOptions {
  readonly max?: number | undefined;
  readonly min?: number | undefined;
  readonly offset?: number | undefined;
}

// region | Helpers

/**
 * Computes the FNV-1a digest of the string's UTF-16 code units, avalanched through MurmurHash3's fmix32 finalizer.
 * Each code unit contributes its low and high byte separately, so the digest is not byte-identical to FNV-1a over
 * the same text encoded as UTF-8.
 */
function computeDigest(text: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < text.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point -- the digest is defined over UTF-16 code units.
    const unit = text.charCodeAt(i);
    hash = Math.imul(hash ^ (unit & 0xff), FNV_PRIME);
    hash = Math.imul(hash ^ (unit >>> 8), FNV_PRIME);
  }

  // Avalanche the accumulated bits, so that the low ones have as much entropy as the high ones.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85eb_ca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2_ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

// endregion | Helpers
