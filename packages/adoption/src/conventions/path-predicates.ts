const BIN_DIRECTORY = /(?:^|\/)bin\//;
const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const TEST_DIRECTORY = /(?:^|\/)__tests__\//;
const TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;

/**
 * Reports whether a path names a source an adoption sweep reads.
 *
 * The selection every kit sweeping a project's own sources wants: a JavaScript or TypeScript file that is
 * neither a bootstrap wrapper nor a test. A kit sweeping tests instead, as `toolbelt.vitest` does, inverts the
 * last of those and reaches for `isTestFile` directly.
 *
 * @internal
 */
export function isAdoptableSource(path: string): boolean {
  return isJsTsSource(path) && !isBinWrapper(path) && !isTestFile(path) && !isInTestDirectory(path);
}

/**
 * Reports whether a path is a bootstrap wrapper.
 *
 * Such a wrapper imports nothing, so its build-first message survives an incomplete install. The hand-rolled
 * handling that buys it is deliberate, not unadopted.
 *
 * @internal
 */
export function isBinWrapper(path: string): boolean {
  return BIN_DIRECTORY.test(path);
}

/**
 * Reports whether a path sits inside a test directory.
 *
 * Separate from `isTestFile` because the two select different sets: a helper module beside a suite is in a test
 * directory without being a test, and a sweep excluding tests must drop it while a sweep of tests must not
 * claim it.
 *
 * @internal
 */
export function isInTestDirectory(path: string): boolean {
  return TEST_DIRECTORY.test(path);
}

/**
 * Reports whether a path names a JavaScript or TypeScript source.
 *
 * @internal
 */
export function isJsTsSource(path: string): boolean {
  return JS_TS_EXTENSION.test(path);
}

/**
 * Reports whether a path names a test file by its suffix.
 *
 * @internal
 */
export function isTestFile(path: string): boolean {
  return TEST_SUFFIX.test(path);
}
