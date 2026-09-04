import { spawnSync } from 'node:child_process';

const TIMEOUT_MS = 30_000;

/**
 * Runs the configured token command and returns what it wrote to stdout, dropping one trailing newline, since
 * a command that prints a secret adds one. A command is written as a shell line, so it is run through a shell.
 *
 * @internal
 */
export function runTokenCommand(command: string): string {
  const { error, status, stderr, stdout } = spawnSync(command, {
    encoding: 'utf8',
    shell: true,
    timeout: TIMEOUT_MS,
  });

  if (error !== undefined) throw new Error(`Could not run the token command \`${command}\`: ${error.message}`);
  if (status === null) {
    throw new Error(`The token command \`${command}\` was killed before it exited. It may have been waiting on input.`);
  }
  if (status !== 0) {
    const detail = stderr.trim();

    throw new Error(`The token command \`${command}\` exited ${status}${detail === '' ? '' : `: ${detail}`}`);
  }

  return stdout.replace(/\n$/, '');
}

/** Runs a token command and returns what it printed. */
export type TokenCommandRunner = (command: string) => string;
