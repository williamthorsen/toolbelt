import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

import { createTrackedRepo } from '../createTrackedRepo.ts';

describe(createTrackedRepo, () => {
  it('tracks every entry passed in', () => {
    const entries = { '.gitignore': 'dist/\n', 'package.json': '{}', 'src/nested/main.ts': 'export {};\n' };

    using tree = createTrackedRepo(entries);

    const tracked = execFileSync('git', ['-C', tree.dir, 'ls-files'], { encoding: 'utf8' }).trim().split('\n');

    expect(tracked.toSorted()).toStrictEqual(Object.keys(entries).toSorted());
  });

  it('rethrows a git failure with git’s reason, leaving nothing on disk', () => {
    // Spy on the creation call, which is the only way to find the root of a directory for which no handle was
    // returned.
    using mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    // A `.git` file that is not a valid gitfile makes `git init` fail.
    const create = () => createTrackedRepo({ '.git': 'x' });

    expect(create).toThrow(/invalid gitfile format/);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
  });
});
