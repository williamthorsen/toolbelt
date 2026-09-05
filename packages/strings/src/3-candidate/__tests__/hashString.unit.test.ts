import { describe, expect, it } from 'vitest';

import { hashString, type HashStringOptions } from '../hashString.ts';

const MAX_UINT32 = 0xffff_ffff;
const UINT32_SIZE = 2 ** 32;
const N_BUCKETS = 1_000;
const BUCKETED: HashStringOptions = { max: N_BUCKETS - 1 };

describe(hashString, () => {
  // The digest is a published contract, so a change to the algorithm is a breaking change.
  const digestCases: ReadonlyArray<{ expected: number; scenario: string; str: string }> = [
    { scenario: 'an empty string', str: '', expected: 2_872_998_923 },
    { scenario: 'a single character', str: 'a', expected: 2_448_022_055 },
    { scenario: 'two characters', str: 'ab', expected: 4_121_897_818 },
    { scenario: 'a sentence', str: 'The quick brown fox jumps over the lazy dog', expected: 112_255_153 },
    { scenario: 'an astral character', str: '\u{1D11E}', expected: 763_714_609 },
    { scenario: 'a lone high surrogate', str: '\u{D800}', expected: 1_077_169_969 },
    { scenario: 'a lone low surrogate', str: '\u{DFFF}', expected: 1_709_237_870 },
  ];

  it.each(digestCases)('returns the locked digest for $scenario', ({ expected, str }) => {
    expect(hashString(str)).toBe(expected);
  });

  it('distinguishes lone surrogates, which a UTF-8 encoding would conflate', () => {
    expect(hashString('\u{D800}')).not.toBe(hashString('\u{DFFF}'));
  });

  it('confines every result to the full 32-bit range by default', () => {
    const results = listResults();

    expect(results.filter((result) => result < 0 || result > MAX_UINT32)).toStrictEqual([]);
    expect(results.filter((result) => !Number.isSafeInteger(result))).toStrictEqual([]);
  });

  const rangeCases: ReadonlyArray<{ max: number; min: number; scenario: string }> = [
    { scenario: 'a zero-based range', min: 0, max: N_BUCKETS - 1 },
    { scenario: 'a range spanning zero', min: -50, max: 50 },
    { scenario: 'a range above zero', min: 1_000, max: 1_099 },
    { scenario: 'the widest permitted range', min: 0, max: MAX_UINT32 },
  ];

  it.each(rangeCases)('confines every result to $scenario', ({ max, min }) => {
    const results = listResults({ max, min });

    expect(results.filter((result) => result < min || result > max)).toStrictEqual([]);
  });

  it('returns the single point when min equals max', () => {
    expect(hashString('sample', { min: 42, max: 42 })).toBe(42);
  });

  it.each([0, 7, -7, 3_001, -3_001, N_BUCKETS])('rotates a bounded result by an offset of %i', (offset) => {
    const base = hashString('sample', BUCKETED);
    const expected = (((base + offset) % N_BUCKETS) + N_BUCKETS) % N_BUCKETS;

    expect(hashString('sample', { ...BUCKETED, offset })).toBe(expected);
  });

  it('rotates exactly for an offset near the safe-integer ceiling', () => {
    const offset = Number.MAX_SAFE_INTEGER;
    const expected = (hashString('sample') + (offset % UINT32_SIZE)) % UINT32_SIZE;

    expect(hashString('sample', { offset })).toBe(expected);
  });

  const throwCases: ReadonlyArray<{ options: HashStringOptions; scenario: string }> = [
    { scenario: 'a non-integer min', options: { min: 1.5 } },
    { scenario: 'a non-integer max', options: { max: 1.5 } },
    { scenario: 'a NaN min', options: { min: NaN } },
    { scenario: 'an infinite max', options: { max: Infinity } },
    { scenario: 'a min beyond the safe integers', options: { min: 2 ** 53 } },
    { scenario: 'a reversed range', options: { min: 10, max: 0 } },
    { scenario: 'a non-integer offset', options: { offset: 1.5 } },
    { scenario: 'a NaN offset', options: { offset: NaN } },
    { scenario: 'a range wider than the digest', options: { min: 0, max: UINT32_SIZE } },
  ];

  it.each(throwCases)('throws a RangeError for $scenario', ({ options }) => {
    const throwingFn = () => hashString('sample', options);

    expect(throwingFn).toThrow(RangeError);
  });

  it('names the width that the range may not exceed', () => {
    const throwingFn = () => hashString('sample', { max: UINT32_SIZE });

    expect(throwingFn).toThrow(`cannot span more than ${UINT32_SIZE} values`);
  });

  it('spreads a bounded range evenly enough to pass a chi-square test', () => {
    const nInputs = 20_000;
    const expectedPerBucket = nInputs / N_BUCKETS;
    const chiSquare = countBuckets(nInputs).reduce(
      (sum, count) => sum + (count - expectedPerBucket) ** 2 / expectedPerBucket,
      0,
    );

    // At 999 degrees of freedom the p = 0.001 critical value is about 1156.
    expect(chiSquare).toBeLessThan(1_200);
  });

  it('leaves no bucket of a bounded range empty', () => {
    expect(countBuckets(20_000).filter((count) => count === 0)).toStrictEqual([]);
  });

  it('scatters sequential inputs, which an unfinalized digest would clump', () => {
    const buckets = new Set(listResults(BUCKETED, N_BUCKETS));

    // Drawing 1000 inputs into 1000 buckets has a birthday expectation of about 632 distinct.
    expect(buckets.size).toBeGreaterThan(580);
  });
});

// region | Helpers

/**
 * Tallies how many of the corpus's hashes land in each bucket of the default bounded range.
 */
function countBuckets(nInputs: number): number[] {
  const counts: number[] = Array.from({ length: N_BUCKETS }, () => 0);

  for (const bucket of listResults(BUCKETED, nInputs)) {
    counts[bucket] = (counts[bucket] ?? 0) + 1;
  }

  return counts;
}

/**
 * Hashes a corpus of distinct sequential strings under the given options.
 */
function listResults(options: HashStringOptions = {}, nInputs = 500): number[] {
  return Array.from({ length: nInputs }, (_, i) => hashString(`user-${i}`, options));
}

// endregion | Helpers
