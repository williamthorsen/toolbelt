# @williamthorsen/toolbelt.numbers changelog

## 4.0.1

### Tooling

- Renamed `publish` script to avoid recursion

## 4.0.0

### Breaking changes

- Migrated to staged distribution of library functions.
  For example, some functions have been moved to `/candidate` or `/draft`.

### Features

#### Stage 1: Proposed

- Added:
  - `makeRng`

#### Stage 2: Draft

- Added:
  - `clamp`

#### Stage 3: Candidate

- Added:
  - `generateRandom`
  - `IntSeededRng` and `SeededRng`
  - `isIntegerString`
  - `pickInteger`
  - `round`
  - `safeParseInteger`
  - `scale`

#### Internal

- Added:
  - `evaluate`
  - `evaluateSeed`
  - `getFakeMathRandom`
  - `IntegerSeed`
  - `wrapSum`

## 0.1.0

Copied from v0.1.0 of the `_template` workspace.
