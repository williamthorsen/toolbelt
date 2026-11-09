import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import { createKitFixture } from '../createKitFixture.ts';
import { createTempDir } from '../createTempDir.ts';

const KIT = "export default { checklists: [{ name: 'adoption', checks: [{ name: 'first', check: () => true }] }] };\n";

describe(createKitFixture, () => {
  it("tracks the entries, points the working directory at them, and lists the kit's checks", async () => {
    using kitDir = createTempDir({ 'kit.js': KIT });

    using kit = await createKitFixture(pathToFileURL(path.join(kitDir.dir, 'kit.js')), { 'src/main.ts': '' });

    const tracked = execFileSync('git', ['-C', kit.dir, 'ls-files'], { encoding: 'utf8' }).trim();

    expect(tracked).toBe('src/main.ts');
    expect(process.cwd()).toBe(kit.dir);
    expect(kit.checks.map((check) => check.name)).toStrictEqual(['first']);
  });

  it('restores the working directory and removes the repo on disposal', async () => {
    using kitDir = createTempDir({ 'kit.js': KIT });
    const previousCwd = process.cwd();

    let dir: string;
    {
      using kit = await createKitFixture(pathToFileURL(path.join(kitDir.dir, 'kit.js')), {});
      dir = kit.dir;
    }

    expect(process.cwd()).toBe(previousCwd);
    expect(fs.existsSync(dir)).toBe(false);
  });

  it('undoes its setup when the kit fails to load', async () => {
    using kitDir = createTempDir({ 'kit.js': 'export const answer = 42;\n' });
    const previousCwd = process.cwd();
    // Spy on the creation call, which is the only way to find the root of a directory for which no handle was
    // returned.
    using mkdtempSyncSpy = vi.spyOn(fs, 'mkdtempSync');

    await expect(createKitFixture(pathToFileURL(path.join(kitDir.dir, 'kit.js')), {})).rejects.toThrow(
      'the module exports no kit',
    );
    expect(process.cwd()).toBe(previousCwd);
    expect(fs.existsSync(String(mkdtempSyncSpy.mock.results[0]?.value))).toBe(false);
  });
});
