import type { RdyCheck } from 'readyup';

import { listFreshKitChecks } from './check-outcomes.ts';
import type { TempDir } from './createTempDir.ts';
import { createTrackedRepo } from './createTrackedRepo.ts';
import { pointCwdAt } from './pointCwdAt.ts';

/**
 * Creates a tracked repo containing the given entries, points `process.cwd()` at it, and lists the checks of the kit
 * at `kitUrl`, imported afresh. Disposal restores `process.cwd` and removes the repo. A call that rejects undoes
 * whatever it had set up.
 */
export async function createKitFixture(kitUrl: URL, entries: Record<string, string>): Promise<KitFixture> {
  using stack = new DisposableStack();

  // Registration order sets disposal order: `process.cwd` is restored before the directory is removed.
  const tree = stack.use(createTrackedRepo(entries));
  stack.use(pointCwdAt(tree.dir));
  const checks = await listFreshKitChecks(kitUrl);

  const resources = stack.move();

  return {
    checks,
    dir: tree.dir,

    [Symbol.dispose](): void {
      resources.dispose();
    },
  };
}

/** A kit loaded against a throwaway repo, which stays the working directory until the scope exits. */
export interface KitFixture extends TempDir {
  /** The kit's checks, in declaration order. */
  readonly checks: readonly RdyCheck[];
}
