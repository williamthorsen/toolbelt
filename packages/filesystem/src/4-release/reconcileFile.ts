import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { describeError } from '@williamthorsen/toolbelt.errors';

/**
 * Writes `content` to `filePath`, reporting the outcome rather than throwing.
 *
 * Missing parent directories are created. `conflictPolicy` decides what becomes of an existing file whose content
 * differs, and it is consulted in that case alone:
 *
 * | exists | differs | `conflictPolicy` | outcome       |
 * | ------ | ------- | ---------------- | ------------- |
 * | no     | n/a     | n/a              | `created`     |
 * | yes    | no      | either           | `up-to-date`  |
 * | yes    | yes     | `replace`        | `overwritten` |
 * | yes    | yes     | `skip`           | `skipped`     |
 *
 * What counts as a difference follows the policy. `'replace'` promises that the file contains exactly `content`
 * afterwards, so the function reports `up-to-date` only for byte-identical content and rewrites a file that differs
 * only in trailing whitespace. Because `'skip'` modifies nothing either way, its comparison ignores trailing
 * whitespace per line and at end of file, which prevents formatter churn from counting as a conflict. `up-to-date`
 * therefore means the same thing under both policies: This one has no work to do.
 *
 * An I/O error is reported as `failed` rather than thrown, which lets a caller writing several files collect a result
 * for each instead of losing the rest to the first failure. A dry run, such as one behind a `--dry-run` flag, writes
 * nothing and creates no directory, returning the outcome that the real call would have produced, short of a write
 * failure, which only an attempted write can detect.
 *
 * The existence probe follows symlinks, so a dangling symlink counts as absent: The outcome is `created`, the result
 * names the link, and the bytes are written to the link's target. The probe and the write are separate calls, which
 * leaves a window in which another process can create or remove the file. The window stays open on purpose: The
 * callers are scaffolding commands that no other process writes against, and an exclusive-create flag would close
 * only the create half of it.
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

/**
 * The outcome of a reconciliation, discriminated on `outcome`, so that a failure always names its reason. A
 * `skipped` result with an `error` reports an existing file that could not be read for comparison and was left
 * alone, which is what `'skip'` promises: It is not a failure, and a command that exits non-zero on failures does
 * not count it as one.
 */
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
 * Reports whether the existing file already satisfies `conflictPolicy` and, when the file cannot be read, why.
 * An unreadable file is not up to date under either policy: `'replace'` overwrites it, and
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
