import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

/**
 * Points `process.cwd()` at a directory for the enclosing scope and restores the previous `process.cwd` on disposal.
 * The real process stays where it is: A sweep reads `process.cwd()`, and the git calls take `-C`.
 *
 * Scaffolding for a kit test, held to node builtins because the adoption layer declares no workspace
 * dependency. A package whose own devDep on `toolbelt.testing` would close a dependency cycle reaches
 * cwd-pointing here rather than through that package's `pointCwdAt`.
 */
export function pointCwdAt(dir: string): Disposable {
  const resolvedDir = fs.realpathSync(path.resolve(dir));
  // eslint-disable-next-line @typescript-eslint/unbound-method -- the property is saved to be restored, never called.
  const previousCwd = process.cwd;

  process.cwd = () => resolvedDir;

  return {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's `Symbol` list omits `dispose`, standard since ES2026.
    [Symbol.dispose](): void {
      process.cwd = previousCwd;
    },
  };
}
