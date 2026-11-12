/**
 * Reports whether a value is a filesystem error meaning that a path is not there, narrowing its `code` if so.
 *
 * `ENOTDIR` counts as well as `ENOENT`: A probe below a path segment that is a regular file fails with
 * `ENOTDIR`, and the path that it names is just as absent. Every other code, `EACCES` above all, is a failure
 * to surface rather than an absence, and returns false.
 *
 * The test reads `code` structurally: It holds for any thrown value and does not depend on a host's error
 * types.
 *
 * @example
 * try { fs.readFileSync(configPath, 'utf8'); } catch (error) { if (!isMissingPathError(error)) throw error; }
 *
 * @category Errors
 * @experimental
 * @stage candidate
 */
export function isMissingPathError(error: unknown): error is { readonly code: 'ENOENT' | 'ENOTDIR' } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error.code === 'ENOENT' || error.code === 'ENOTDIR')
  );
}
