import { spawnSync } from 'node:child_process';

const SECURITY_PATH = '/usr/bin/security';
const TIMEOUT_MS = 30_000;

/**
 * Runs macOS's `security` command and reports what it wrote and exited with. An exit code is data here, so only
 * a failure to launch the binary or a run that outlives the timeout throws. The path is absolute because `PATH`
 * must not decide which program receives a secret.
 *
 * @internal
 */
export function runSecurity(args: string[], input?: string): SecurityResult {
  const { error, status, stderr, stdout } = spawnSync(SECURITY_PATH, args, {
    encoding: 'utf8',
    input,
    timeout: TIMEOUT_MS,
  });

  if (error !== undefined) throw new Error(`Could not run ${SECURITY_PATH}: ${error.message}`);
  if (status === null) {
    throw new Error(`${SECURITY_PATH} was killed before it exited. It may have been waiting on a prompt.`);
  }

  return { exitCode: status, stderr, stdout };
}

/** Runs `security` with the given arguments, writing `input` to its stdin. */
export type SecurityRunner = (args: string[], input?: string) => SecurityResult;

/** What one `security` run wrote and exited with. */
export interface SecurityResult {
  readonly exitCode: number;
  readonly stderr: string;
  readonly stdout: string;
}
