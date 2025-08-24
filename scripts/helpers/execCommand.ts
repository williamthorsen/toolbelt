import { execSync } from 'node:child_process';

import { unindent } from '~/packages/strings/src/3-candidate/index.ts';

/**
 * Wrapped version of `execSync`.
 */
export function execCommand(command: string): string {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (error) {
    throw new Error(unindent`
      Command failed: ${command}
      ${error instanceof Error ? error.message : String(error)}
    `);
  }
}
