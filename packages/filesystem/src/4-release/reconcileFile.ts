import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describeError } from '@williamthorsen/toolbelt.errors';

/**
 * Writes `content` to `filePath`, reporting what the write took rather than throwing.
 *
 * Missing parent directories are created. An existing file is compared against `content` first, and what counts
 * as a difference follows `conflictPolicy`: `'replace'` promises the file holds exactly `content` afterwards, so
 * only byte-identical content reports `up-to-date`; `'skip'` modifies nothing either way, so its comparison
 * ignores trailing whitespace per line and at end of file, which keeps formatter churn from reading as a
 * conflict. `up-to-date` therefore means the same thing under both policies: This one has no work to do.
 *
 * An I/O error is reported as `failed` rather than thrown, which is what lets a caller writing several files
 * collect a result for each instead of losing the rest to the first failure. A dry run writes nothing and
 * creates no directory, returning the outcome that the real call would have produced, short of a write failure,
 * which nothing detects without attempting the write.
 *
 * @example
 * reconcileFile('.config/tool.config.ts', template, { conflictPolicy: 'replace' });
 * // { filePath: '.config/tool.config.ts', outcome: 'overwritten' }
 *
 * @category Filesystem
 * @stage release
 */
export function reconcileFile(
  filePath: string,
  content: string,
  options: ReconcileFileOptions = {},
): FileReconciliation {
  const { conflictPolicy = 'skip', isDryRun = false } = options;

  const doesFileExist = existsSync(filePath);

  if (doesFileExist) {
    const comparison = compareWithExisting(filePath, content, conflictPolicy);

    if (comparison.isUpToDate) return { filePath, outcome: 'up-to-date' };

    if (conflictPolicy === 'skip') {
      return comparison.error === undefined
        ? { filePath, outcome: 'skipped' }
        : { filePath, outcome: 'skipped', error: comparison.error };
    }
  }

  const outcome = doesFileExist ? 'overwritten' : 'created';

  if (isDryRun) return { filePath, outcome };

  try {
    mkdirSync(path.dirname(filePath), { recursive: true });
    writeFileSync(filePath, content, 'utf8');
  } catch (error: unknown) {
    return { filePath, outcome: 'failed', error: describeError(error) };
  }

  return { filePath, outcome };
}

export type FileReconciliation =
  | { filePath: string; outcome: 'created' | 'overwritten' | 'up-to-date' }
  | { filePath: string; outcome: 'skipped'; error?: string | undefined }
  | { filePath: string; outcome: 'failed'; error: string };

export interface ReconcileFileOptions {
  /** What to do with an existing file whose content differs. Defaults to `'skip'`, which never destroys one. */
  conflictPolicy?: 'replace' | 'skip' | undefined;
  isDryRun?: boolean | undefined;
}

export type ReconciliationOutcome = FileReconciliation['outcome'];

// region | Helpers
/**
 * Reports whether the existing file already satisfies `conflictPolicy`, and why it could not be read where
 * reading fails. An unreadable file is not up to date under either policy: `'replace'` overwrites it, and
 * `'skip'` reports the reason alongside the file that it left alone.
 */
function compareWithExisting(
  filePath: string,
  content: string,
  conflictPolicy: 'replace' | 'skip',
): { isUpToDate: boolean; error?: string } {
  let existingContent: string;

  try {
    existingContent = readFileSync(filePath, 'utf8');
  } catch (error: unknown) {
    return { isUpToDate: false, error: describeError(error) };
  }

  if (conflictPolicy === 'replace') {
    return { isUpToDate: existingContent === content };
  }

  return { isUpToDate: normalizeTrailingWhitespace(existingContent) === normalizeTrailingWhitespace(content) };
}

/** Strips trailing whitespace from each line and from the end of the string. */
function normalizeTrailingWhitespace(content: string): string {
  return content
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .trimEnd();
}
// endregion | Helpers
