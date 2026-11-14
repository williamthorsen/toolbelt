import { spawnSync, type SpawnSyncReturns } from 'node:child_process';

import { describe, expect, it, vi } from 'vitest';

import { runTokenCommand } from '../runTokenCommand.ts';

vi.mock(import('node:child_process'), async (importOriginal) => ({ ...(await importOriginal()), spawnSync: vi.fn() }));

describe(runTokenCommand, () => {
  it('keeps the launch error as the cause when the command cannot be run', () => {
    const launchError = Object.assign(new Error('spawnSync /bin/sh ETIMEDOUT'), { code: 'ETIMEDOUT' });
    mockSpawnResult({ error: launchError, status: null });

    expect(() => runTokenCommand('op read token')).toThrow(
      expect.objectContaining({
        cause: launchError,
        message: 'Could not run the token command `op read token`: spawnSync /bin/sh ETIMEDOUT',
      }),
    );
  });

  it('throws when the command was killed before it exited', () => {
    mockSpawnResult({ signal: 'SIGKILL', status: null });

    expect(() => runTokenCommand('op read token')).toThrow(/killed before it exited/);
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
