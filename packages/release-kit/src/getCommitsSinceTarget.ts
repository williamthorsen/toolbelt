import { execSync } from 'node:child_process';

import type { Commit } from './types.ts';

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
  // Find the latest tag matching the prefix
  let tag: string | undefined;
  try {
    const tagResult = execSync(`git describe --tags --abbrev=0 --match="${tagPrefix}*"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
    tag = tagResult || undefined;
  } catch {
    // No matching tag found; will return all commits
    tag = undefined;
  }

  // Get commits since the tag (or all commits if no tag)
  const range = tag === undefined ? 'HEAD' : `${tag}..HEAD`;
  const separator = '---COMMIT_SEPARATOR---';
  const format = `%s${separator}%H`;

  let logOutput: string;
  try {
    logOutput = execSync(`git log ${range} --pretty=format:"${format}"`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return { tag, commits: [] };
  }

  if (logOutput === '') {
    return { tag, commits: [] };
  }

  const commits: Commit[] = [];
  const lines = logOutput.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (trimmedLine === '') {
      continue;
    }

    const parts = trimmedLine.split(separator);
    const message = parts[0];
    const hash = parts[1];

    if (message !== undefined && hash !== undefined) {
      commits.push({ message, hash });
    }
  }

  return { tag, commits };
}
