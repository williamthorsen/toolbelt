import { execFileSync } from 'node:child_process';
import process from 'node:process';

import { createTempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { describe, expect, it } from 'vitest';

import { pointCwdAt } from '../pointCwdAt.ts';

// Bound before any scope replaces `process.cwd`, so a test can read where the process actually is.
const nativeCwd = process.cwd.bind(process);

describe(pointCwdAt, () => {
  it('moves a spawned child along with the process', () => {
    using tree = createTempTree({ 'src/': '' });

    using _cwd = pointCwdAt(tree.dir, { chdir: true });

    expect(readChildDir()).toBe(tree.dir);
  });

  it('leaves a spawned child where it was when it replaces `process.cwd`', () => {
    using tree = createTempTree({ 'src/': '' });
    const startDir = nativeCwd();

    using _cwd = pointCwdAt(tree.dir);

    expect(readChildDir()).toBe(startDir);
  });
});

// region | Helpers

/** Reports the directory in which a spawned child starts, which it takes from the OS rather than from Node. */
function readChildDir(): string {
  return execFileSync(process.execPath, ['--print', 'process.cwd()'], { encoding: 'utf8' }).trim();
}

// endregion | Helpers
