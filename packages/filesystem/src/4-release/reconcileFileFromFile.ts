import { readFileSync } from 'node:fs';

import { describeError } from '@williamthorsen/toolbelt.errors';

import { type FileReconciliation, reconcileFile, type ReconcileFileOptions } from './reconcileFile.ts';

/**
 * Reconciles `filePath` against the utf8 text of `sourcePath`, reporting what the write took rather than throwing.
 *
 * Everything past the read is `reconcileFile`: The comparison, the conflict policy, the created parent directories,
 * and the outcome vocabulary are its. A source that cannot be read reports `failed`, and a missing source is not
 * distinguished from an unreadable one. The reason names `sourcePath` and the cause; the path is interpolated
 * because a read-stage failure carries none of its own (`EISDIR: illegal operation on a directory, read`) and the
 * result's `filePath` is the destination.
 *
 * The source is read even under `isDryRun`, because the outcome depends on comparing its content, so a dry run can
 * report `failed` where `reconcileFile` cannot. It still writes nothing.
 *
 * The read is utf8 text, so a binary source is not supported.
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
