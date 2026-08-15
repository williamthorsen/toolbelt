import { assert } from '@williamthorsen/toolbelt.guards';
import { generateRandom, type Seed } from '@williamthorsen/toolbelt.numbers/candidate';

import { findWeightedIndex } from './findWeightedIndex.ts';
import { getItemAtIndexOrThrow } from './getItemAtIndexOrThrow.ts';

/**
 * Returns a pseudo-random item from the cumulative weights, with odds reflecting the cumulative weights.
 * If the array is empty, throws an error.
 *
 * @category Array
 * @experimental
 * @stage candidate
 */
export function pickWeightedIndex(cumulativeWeights: ReadonlyArray<number>, options: PickRandomOptions = {}): Integer {
  assertValidCumulativeWeights(cumulativeWeights);

  const cumulativeWeight = getItemAtIndexOrThrow(cumulativeWeights, cumulativeWeights.length - 1);
  const randomValue = generateRandom(options);
  const targetWeight = randomValue * cumulativeWeight;

  // Because the array is non-empty, the target weight is guaranteed to be within the range [0, cumulativeWeight).
  const pickedIndex = findWeightedIndex(cumulativeWeights, targetWeight);
  assert(pickedIndex !== undefined); // type guard only

  return pickedIndex;
}

/**
 * Verifies that the cumulative weights are valid.
 */
export function assertValidCumulativeWeights(weights: ReadonlyArray<number>, nItems = weights.length): void | never {
  if (weights.length !== nItems) {
    throw new Error('The number of weights must match the number of items.');
  }

  assertNonEmptyArray(weights);
  assertPositiveWeights(weights);
  assertAscendingWeights(weights);

  if (weights.at(-1) === 0) {
    throw new Error('Cannot pick an item from an array with total weight 0.');
  }
}

/**
 * Verifies that the values in the numeric series are in ascending order.
 */
function assertAscendingWeights(values: ReadonlyArray<number>): void | never {
  for (let i = 1; i < values.length; i++) {
    if (getItemAtIndexOrThrow(values, i) < getItemAtIndexOrThrow(values, i - 1)) {
      throw new Error('Cumulative weights must be in ascending order.');
    }
  }
}

function assertNonEmptyArray(array: ReadonlyArray<unknown>): void | never {
  if (array.length === 0) {
    throw new Error('Cannot pick an item from an empty array.');
  }
}

function assertPositiveWeights(weights: ReadonlyArray<number>): void | never {
  if (weights.some((weight) => weight < 0)) {
    throw new Error('Weights cannot be negative.');
  }
}

export interface PickRandomOptions {
  seed?: Seed | undefined;
}

type Integer = number;
