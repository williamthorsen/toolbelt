import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { installCrashHandler } from '../installCrashHandler.ts';

const FIXTURE_DIR = fileURLToPath(new URL('fixtures/installCrashHandler/', import.meta.url));

describe(installCrashHandler, () => {
  it('reports a rejected top-level await and exits 1', () => {
    const run = runFixture('top-level-await');

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^demo: internal error: top-level rejection\n\s+at /u);
  });

  it('reports a throw from an event listener and exits 1 while a server keeps the loop alive', () => {
    const run = runFixture('listener');

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/^demo: internal error: listener failure\n\s+at /u);
  });

  it('delivers a report larger than a pipe buffer to a piped stderr in full', () => {
    const run = runFixture('large');

    expect(run.status).toBe(1);
    expect(run.stderr).toMatch(/END-OF-MESSAGE\n\s+at /u);
    expect(run.stderr).toMatch(/\s+at .+\n$/u);
  });

  it('reports a thrown value that is not an `Error` without frames', () => {
    const run = runFixture('non-error');

    expect(run.status).toBe(1);
    expect(run.stderr).toBe('demo: internal error: { code: 7 }\n');
  });
});

// region | Helpers

/** Runs a fixture in a child process whose stderr is a pipe. */
function runFixture(name: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [path.join(FIXTURE_DIR, `${name}.ts`)], { encoding: 'utf8' });
}

// endregion | Helpers
