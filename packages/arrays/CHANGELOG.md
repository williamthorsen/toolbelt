# @williamthorsen/toolbelt.arrays changelog

## 3.3.0

### Features

- Added `getUniqueItems`
- Renamed `getDuplicates` to `getDuplicateItems` for consistency with other function names

## 3.2.0

### Features

- Added `map` and `forEach` methods to `Range` class
- Simplified `Range` class to accept two arguments instead of object

## 3.1.0

### Features

- Added a `Range` class to generate and iterate over a range of numbers.

## 3.0.4

### Dependencies

- Updated internal dependencies:
  - @williamthorsen/toolbelt.numbers@4.2.0

## 3.0.3

### Dependencies

- Updated internal dependencies:
  - @williamthorsen/toolbelt.numbers@4.1.0

## 3.0.2

### Fixes

- Fixed the issue that code relies on Node.js `assert` but could be used in a browser environment

## 3.0.1

### Tooling

- Renamed `publish` script to avoid recursion

## 3.0.0

### Breaking changes

- Migrated to staged distribution of library functions.
  For example, some functions have been moved to `/candidate` or `/draft`.

### Features

#### Stage 1: Proposed

- Added:
  - `accumulateWeights`

#### Stage 3: Candidate

- Added:
  - `arraify`
  - `extractWeights`
  - `findOrThrow`
  - `getAtIndexOrThrow`
  - `getDuplicates`
  - `getWeightedIndex`
  - `includes`
  - `makeNullishCompare`
  - `makePickWeightedItemFromDistribution`
  - `nullishCompare`
  - `pickItem`
  - `pickItems`
  - `pickWeightedIndex`
  - `pickWeightedItem`
  - `shuffle`
  - `shuffleInPlace`
  - `toCumulativeValues`

### Dependencies

- Added dependencies:
  - @williamthorsen/toolbelt.numbers@3.0.0

## 0.1.0

Copied from v0.1.0 of the `_template` workspace.
