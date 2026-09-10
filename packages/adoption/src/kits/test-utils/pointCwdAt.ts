import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Points `process.cwd()` at a directory for the enclosing scope and restores the previous `process.cwd` on disposal.
 * The real process stays where it is: A sweep reads `process.cwd()`, and the git calls take `-C`.
 *
 * Scaffolding for a kit test, held to node builtins because the adoption layer declares no workspace
 * dependency. Two conditions send a kit test here rather than to `toolbelt.testing`'s `pointCwdAt`: a devDep
 * on that package would close a dependency cycle, as it would for `errors`; or the test must run on an unbuilt
 * tree, which rules out `toolbelt.testing/candidate`, whose export maps to `dist/`.
 */
export function pointCwdAt(dir: string): Disposable {
  const resolvedDir = fs.realpathSync(path.resolve(dir));
  // eslint-disable-next-line @typescript-eslint/unbound-method -- the property is saved to be restored, never called.
  const previousCwd = process.cwd;

  process.cwd = () => resolvedDir;

  return {
    [Symbol.dispose](): void {
      process.cwd = previousCwd;
    },
  };
}
