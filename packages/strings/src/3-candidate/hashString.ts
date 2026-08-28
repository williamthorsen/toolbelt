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
export function hashString(str: string, options: HashStringOptions = {}): number {
  const { max = MAX_UINT32, min = 0, offset = 0 } = options;

  // Validate the bounds and the offset
  if (!Number.isSafeInteger(min) || !Number.isSafeInteger(max)) {
    throw new RangeError(`Invalid range: min and max must be safe integers. Received min=${min}, max=${max}.`);
  }
  if (min > max) {
    throw new RangeError(`Invalid range: min must be less than or equal to max. Received min=${min}, max=${max}.`);
  }
  if (!Number.isSafeInteger(offset)) {
    throw new RangeError(`Invalid offset: offset must be a safe integer. Received ${offset}.`);
  }

  const size = max - min + 1;
  if (size > UINT32_SIZE) {
    const received = `Received min=${min}, max=${max}.`;
    throw new RangeError(`Invalid range: the range cannot span more than ${UINT32_SIZE} values. ${received}`);
  }

  // Reduce the offset before adding it, so the sum stays within the exactly-representable integers.
  const shift = ((offset % size) + size) % size;

  return min + ((computeDigest(str) + shift) % size);
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
function computeDigest(str: string): number {
  let hash = FNV_OFFSET_BASIS;

  for (let i = 0; i < str.length; i++) {
    // eslint-disable-next-line unicorn/prefer-code-point -- the digest is defined over UTF-16 code units.
    const unit = str.charCodeAt(i);
    hash = Math.imul(hash ^ (unit & 0xff), FNV_PRIME);
    hash = Math.imul(hash ^ (unit >>> 8), FNV_PRIME);
  }

  // Avalanche the accumulated bits, so the low ones carry as much entropy as the high ones.
  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x85eb_ca6b);
  hash ^= hash >>> 13;
  hash = Math.imul(hash, 0xc2b2_ae35);
  hash ^= hash >>> 16;

  return hash >>> 0;
}

// endregion | Helpers
