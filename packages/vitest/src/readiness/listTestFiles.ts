const TEST_FILE = /\.(?:spec|test)\.[cm]?[jt]sx?$/;
const EXCLUDED = [/(?:^|\/)node_modules\//, /(?:^|\/)\.readyup\/kits\/.+\.js$/];

/**
 * Narrows a project's file list to the test files these checks read.
 *
 * The selection inverts the one `toolbelt.errors` makes, which exempts tests because a test constructs error
 * shapes deliberately. A `process.exit` mock exists only in a test, so a sweep that skipped tests would report
 * nothing and say so as a pass.
 *
 * @internal
 */
export function listTestFiles(paths: readonly string[]): string[] {
  return paths.filter((path) => TEST_FILE.test(path) && EXCLUDED.every((pattern) => !pattern.test(path)));
}
