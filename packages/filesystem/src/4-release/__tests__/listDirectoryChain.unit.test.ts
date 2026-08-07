import path from 'node:path';

import { expectTypeOf } from 'expect-type';
import { describe, expect, it } from 'vitest';

import { listDirectoryChain } from '../listDirectoryChain.ts';

/** The function reads nothing from disk, so the paths below are synthetic; only the platform's root is real. */
const FILESYSTEM_ROOT = path.parse(process.cwd()).root;

describe(listDirectoryChain, () => {
  it('returns the start directory, then each ancestor, ending at the filesystem root', () => {
    const result = listDirectoryChain(fromRoot('home/dev/app'));

    expect(result).toStrictEqual([fromRoot('home/dev/app'), fromRoot('home/dev'), fromRoot('home'), FILESYSTEM_ROOT]);
  });

  it('returns one element when the start directory is the filesystem root', () => {
    const result = listDirectoryChain(FILESYSTEM_ROOT);

    expect(result).toStrictEqual([FILESYSTEM_ROOT]);
  });

  it('types the result as non-empty', () => {
    const result = listDirectoryChain(fromRoot('home/dev'));

    expectTypeOf<[string, ...string[]]>(result);
  });

  it('resolves a relative start directory against the working directory', () => {
    const result = listDirectoryChain('.');

    expect(result[0]).toBe(process.cwd());
  });

  it('collapses `..` segments in the start directory', () => {
    const result = listDirectoryChain(fromRoot('home/dev/app/../lib'));

    expect(result[0]).toBe(fromRoot('home/dev/lib'));
  });

  it('given a stop directory, ends the chain there', () => {
    const result = listDirectoryChain(fromRoot('home/dev/app/src'), { stopAtDir: fromRoot('home/dev') });

    expect(result).toStrictEqual([fromRoot('home/dev/app/src'), fromRoot('home/dev/app'), fromRoot('home/dev')]);
  });

  it('given a stop directory equal to the start directory, returns one element', () => {
    const startDir = fromRoot('home/dev/app');

    const result = listDirectoryChain(startDir, { stopAtDir: startDir });

    expect(result).toStrictEqual([startDir]);
  });

  it('resolves a relative stop directory against the working directory', () => {
    const result = listDirectoryChain(path.join(process.cwd(), 'app/src'), { stopAtDir: '.' });

    expect(result).toStrictEqual([path.join(process.cwd(), 'app/src'), path.join(process.cwd(), 'app'), process.cwd()]);
  });

  it('rejects a stop directory that is not on the chain, naming both directories', () => {
    const startDir = fromRoot('home/dev/app');
    const stopAtDir = fromRoot('var/log');

    const listChain = () => listDirectoryChain(startDir, { stopAtDir });

    expect(listChain).toThrow(startDir);
    expect(listChain).toThrow(stopAtDir);
  });

  it('rejects a stop directory below the start directory', () => {
    const listChain = () => listDirectoryChain(fromRoot('home/dev'), { stopAtDir: fromRoot('home/dev/app') });

    expect(listChain).toThrow(/start directory or one of its ancestors/);
  });
});

// region | Helpers
/** Builds an absolute path from segments relative to the filesystem root. */
function fromRoot(relativePath: string): string {
  return path.join(FILESYSTEM_ROOT, relativePath);
}
// endregion | Helpers
