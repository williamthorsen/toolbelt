import { onTestFinished } from 'vitest';

/**
 * Registers a `Disposable`'s disposal with the current test and returns it unchanged, so that a builder can wrap the
 * construction in place and return a value derived from the resource rather than the resource itself.
 *
 * Disposal runs after the test, failure and a dynamic `ctx.skip()` included, in reverse registration order. It
 * registers against whichever test is running, so it works from the test body, `beforeEach`, and `afterEach`.
 * Outside a test -- at module scope, in a `describe` body, or in `beforeAll` or `afterAll` -- Vitest throws `Hook
 * onTestFinished() can only be called inside a test`; a resource wanted there is a fixture, for `makeFixture`.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * function buildSource(files: Record<string, string>, name = 'fixture'): SourceSpec {
 *   const tree = disposeOnTestFinished(createTempTree(files, { prefix: `compositor-${name}-` }));
 *
 *   return { id: name, name, origin: { kind: 'directory', location: tree.dir }, dir: tree.dir };
 * }
 */
export function disposeOnTestFinished<T extends Disposable>(resource: T): T {
  onTestFinished(() => resource[Symbol.dispose]());

  return resource;
}
