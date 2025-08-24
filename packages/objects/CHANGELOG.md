# @williamthorsen/toolbelt.arrays changelog

## 3.2.1

### Patch Changes

- ## @williamthorsen/toolbelt.objects

  ### Tooling
  - Fix export of isKeyOf

## 3.2.0

### Minor Changes

- ## @williamthorsen/toolbelt.objects

  ### Features
  - Added `isKeyOf` function

## 3.1.0

### Minor Changes

- Added getValueAtPathOrThrow to draft functions

## 3.0.2

### Tooling

- Make package public

## 3.0.1

### Tooling

- Renamed `publish` script to avoid recursion

## 3.0.0

### Breaking changes

- Migrated to staged distribution of library functions.
  For example, some functions have been moved to `/candidate` or `/draft`.

### Features

#### Stage 0: For discussion

- Added:
  - `get`
  - `hasKey`

#### Stage 1: Proposed

- Added:
  - `hasKeyAtPath`

#### Stage 2: Draft

- Added:
  - `mapToObject`
  - `sortKeys`
  - `sortObjectKeys`

#### Stage 3: Candidate

- Added:
  - `hasOwnProperty`
  - `isEqual`
  - `isScalar`
  - `objectFromKeys`
  - `objectSize`
  - `omitNullish`
  - `omitUndefined`
  - `preciseTypeOf`

#### Stage 4: Release

- Added:
  - `isObject`
  - `isPlainObject`

## 0.1.0

Added from `_workspace` template v1.2.3.
