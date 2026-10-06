const BIN_DIRECTORY = /(?:^|\/)bin\//;
const JS_TS_EXTENSION = /\.[cm]?[jt]sx?$/;
const TEST_DIRECTORY = /(?:^|\/)__tests__\//;
const TEST_SUFFIX = /\.(?:spec|test)\.[cm]?[jt]sx?$/;

/**
 * Reports whether a path names a source read by an adoption sweep.
 *
 * The selection wanted by every kit sweeping a project's own sources: a JavaScript or TypeScript file that is
 * neither a bootstrap wrapper nor a test. A kit sweeping tests instead inverts the last of those and calls
 * `isTestFile` directly, one sweeping both takes `isAdoptableSourceOrTest`, and one sweeping `bin/` too takes
 * `isAdoptableSourceOrBin`.
 *
 * @internal
 */
export function isAdoptableSource(path: string): boolean {
  return isJsTsSource(path) && !isBinWrapper(path) && !isTestFile(path) && !isInTestDirectory(path);
}

/**
 * Reports whether a path names a source or a test read by an adoption sweep.
 *
 * The selection wanted by a kit whose idiom appears in a project's tests as much as in its other sources. A bootstrap
 * wrapper is exempt, its hand-rolled handling being deliberate; a test covering one is swept, since the constraint
 * behind that handling does not bind it.
 *
 * @internal
 */
export function isAdoptableSourceOrTest(path: string): boolean {
  return isJsTsSource(path) && (!isBinWrapper(path) || isTestFile(path) || isInTestDirectory(path));
}

/**
 * Reports whether a path names a source read by an adoption sweep that includes `bin/` directories.
 *
 * The selection wanted by a kit whose idiom lives in a command-line runner, which commonly sits under `bin/` or
 * `src/bin/`. A bootstrap wrapper that only forwards its arguments contains no such idiom, so sweeping it costs
 * nothing. Tests stay exempt.
 *
 * @internal
 */
export function isAdoptableSourceOrBin(path: string): boolean {
  return isJsTsSource(path) && !isTestFile(path) && !isInTestDirectory(path);
}

/**
 * Reports whether a path is a bootstrap wrapper.
 *
 * Such a wrapper imports nothing, so its build-first message survives an incomplete install. The hand-rolled
 * handling that achieves it is deliberate, not unadopted.
 *
 * @internal
 */
export function isBinWrapper(path: string): boolean {
  return BIN_DIRECTORY.test(path);
}

/**
 * Reports whether a path is inside a test directory.
 *
 * Separate from `isTestFile` because the two select different sets: A helper module beside a suite is in a test
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
