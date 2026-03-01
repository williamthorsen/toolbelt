import { execSync } from 'node:child_process';

import type { Commit } from './types.ts';

/** Null-byte separator that cannot appear in commit subject lines. */
const FIELD_SEPARATOR = '\u0000';

/**
 * Checks whether an error is the expected "no matching tag" failure from `git describe`.
 *
 * `git describe` exits with code 128 when no tag matches the given pattern.
 */
function isNoTagError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'status' in err && err.status === 128;
}

/** Returns the error message from an unknown error value. */
function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Finds the latest git tag matching the given prefix.
 *
 * @returns The tag string, or undefined if no matching tag exists.
 * @throws If `git describe` fails for a reason other than "no matching tag".
 */
function findLatestTag(tagPrefix: string): string | undefined {
  try {
    const tagResult = execSync(`git describe --tags --abbrev=0 --match="${tagPrefix}*"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    return tagResult || undefined;
  } catch (error: unknown) {
    if (isNoTagError(error)) {
      return undefined;
    }
    throw new Error(`Failed to run 'git describe': ${errorMessage(error)}`);
  }
}

/** Parses the raw `git log` output into an array of commits. */
function parseLogOutput(logOutput: string): Commit[] {
  const commits: Commit[] = [];

  for (const line of logOutput.split('\n')) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      continue;
    }

    const parts = trimmedLine.split(FIELD_SEPARATOR);
    const message = parts[0];
    const hash = parts[1];

    if (message !== undefined && hash !== undefined) {
      commits.push({ message, hash });
    }
  }

  return commits;
}

/**
 * Gets commits since the specified git ref (tag or commit hash).
 *
 * Uses `git log` to retrieve commit messages and hashes between the target ref and HEAD.
 * If no target is found, returns all commits.
 *
 * @param tagPrefix - The tag prefix to search for (e.g., 'v').
 * @returns An object with the found tag (if any) and the list of commits.
 */
export function getCommitsSinceTarget(tagPrefix: string): { tag: string | undefined; commits: Commit[] } {
  const tag = findLatestTag(tagPrefix);
  const range = tag === undefined ? 'HEAD' : `${tag}..HEAD`;
  const format = `%s${FIELD_SEPARATOR}%H`;

  let logOutput: string;
  try {
    logOutput = execSync(`git log ${range} --pretty=format:"${format}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (error: unknown) {
    console.error(`git log failed for range '${range}':`, errorMessage(error));
    return { tag, commits: [] };
  }

  if (logOutput === '') {
    return { tag, commits: [] };
  }

  return { tag, commits: parseLogOutput(logOutput) };
}
