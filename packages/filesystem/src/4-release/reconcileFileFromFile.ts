import { readFileSync } from 'node:fs';

import { describeError } from '@williamthorsen/toolbelt.errors';

import { type FileReconciliation, reconcileFile, type ReconcileFileOptions } from './reconcileFile.ts';

/**
 * Reconciles `filePath` against the utf8 text of `sourcePath`, reporting the outcome rather than throwing.
 *
 * Everything after the read is delegated to `reconcileFile`, which owns the comparison, the conflict policy, the
 * created parent directories, and the outcome vocabulary. For a source that it cannot read, the function reports
 * `failed`, and it does not distinguish a missing source from an unreadable one. The reason names `sourcePath` and
 * the cause:
 *
 * ```
 * Failed to read /pkg/cliff.toml.template: ENOENT: no such file or directory, open '/pkg/cliff.toml.template'
 * ```
 *
 * The path is interpolated because a read-stage failure has none of its own (`EISDIR: illegal operation on a
 * directory, read`), so under `ENOENT` it appears twice. The result's `filePath` is the destination, so a caller that
 * copies several templates keys its results by destination and still sees which source failed.
 *
 * The source is read even under `isDryRun`, because the outcome depends on comparing its content, so a dry run can
 * report `failed`, which a dry run of `reconcileFile` cannot. It still writes nothing.
 *
 * Because the source is read as utf8 text, a binary source is not supported: It would be decoded and re-encoded on
 * the way through.
 *
 * @example
 * reconcileFileFromFile('.config/git-cliff.toml', bundledTemplatePath);
 * // { filePath: '.config/git-cliff.toml', outcome: 'created' }
 *
 * @category Filesystem
 * @stage release
 */
export function reconcileFileFromFile(
  filePath: string,
  sourcePath: string,
  options: ReconcileFileOptions = {},
): FileReconciliation {
  let content: string;

  try {
    content = readFileSync(sourcePath, 'utf8');
  } catch (error: unknown) {
    return { filePath, outcome: 'failed', error: `Failed to read ${sourcePath}: ${describeError(error)}` };
  }

  return reconcileFile(filePath, content, options);
}
