import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

import { captureError } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it, vi } from 'vitest';

import { SecretStoreError } from '../../3-candidate/SecretStoreError.ts';
import { runSecurity } from '../runSecurity.ts';

vi.mock(import('node:child_process'), async (importOriginal) => ({ ...(await importOriginal()), spawnSync: vi.fn() }));

describe(runSecurity, () => {
  it('returns what the run wrote and exited with', () => {
    mockSpawnResult({ status: 44, stderr: 'not found', stdout: 'out' });

    expect(runSecurity(['find-generic-password'])).toStrictEqual({ exitCode: 44, stderr: 'not found', stdout: 'out' });
  });

  it('keeps the launch error as the cause when the binary cannot be run', async () => {
    const launchError = Object.assign(new Error('spawnSync /usr/bin/security ENOENT'), { code: 'ENOENT' });
    mockSpawnResult({ error: launchError, status: null });

    const error = await captureError(SecretStoreError, () => runSecurity([]));

    expect(error).toStrictEqual(
      expect.objectContaining({
        cause: launchError,
        message: 'Could not run /usr/bin/security: spawnSync /usr/bin/security ENOENT',
      }),
    );
  });

  it('throws when the run was killed before it exited', async () => {
    mockSpawnResult({ signal: 'SIGKILL', status: null });

    const { message } = await captureError(SecretStoreError, () => runSecurity([]));

    expect(message).toMatch(/killed before it exited/);
  });
});

// region | Helpers
function mockSpawnResult(result: Partial<SpawnSyncReturns<string>>): void {
  vi.mocked(spawnSync).mockReturnValue({
    output: [],
    pid: 0,
    signal: null,
    status: 0,
    stderr: '',
    stdout: '',
    ...result,
  });
}
// endregion | Helpers
