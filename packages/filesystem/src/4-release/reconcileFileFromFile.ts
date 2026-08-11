import { readFileSync } from 'node:fs';

import { describeError } from '@williamthorsen/toolbelt.errors';

import { type FileReconciliation, reconcileFile, type ReconcileFileOptions } from './reconcileFile.ts';

/**
 * Reconciles `filePath` against the utf8 text of `sourcePath`, reporting what the write took rather than throwing.
 *
 * Everything past the read is `reconcileFile`: the comparison, the conflict policy, the created parent directories,
 * and the outcome vocabulary are its. A source that cannot be read reports `failed` carrying the reason, and a
 * missing source is not distinguished from an unreadable one, because the reason names both the path and the cause.
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
    return { filePath, outcome: 'failed', error: describeError(error) };
  }

  return reconcileFile(filePath, content, options);
}
