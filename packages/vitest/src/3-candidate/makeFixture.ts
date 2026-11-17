/**
 * Adapts a `Disposable` factory into a Vitest fixture that disposes the value when its scope ends. Scope is
 * whichever one `test.extend` is given, so a fixture built here supports all three of them.
 *
 * The fixture builds only for a test that names it, unless `test.extend` is given `{ auto: true }`. Under Vitest's
 * default isolation each file takes its own worker, so a `worker`-scoped fixture builds once per file. Under
 * `restoreMocks: true`, a `silenceConsole` fixture has to be test-scoped: At `file` or `worker` scope, its spies are
 * restored from the second test onward.
 *
 * A fixture depending on another fixture cannot be built this way: Vitest discovers dependencies by reading the
 * fixture function's own source. Such a fixture names them in its parameter list and registers `onCleanup` itself,
 * and a wrapper taking the context opaquely fails collection with `FixtureParseError`.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * import { it as baseIt } from 'vitest';
 *
 * const it = baseIt.extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': '' })));
 *
 * it('resolves a path within the tree', ({ tree }) => {
 *   expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
 * });
 */
export function makeFixture<T extends Disposable>(build: () => T) {
  // eslint-disable-next-line no-empty-pattern -- Vitest parses this pattern from the emitted function's source to find the fixture's dependencies; an empty one declares none, and dropping the parameter fails collection.
  return ({}: object, { onCleanup }: { onCleanup: (cleanup: () => void) => void }): T => {
    const resource = build();

    onCleanup(() => resource[Symbol.dispose]());

    return resource;
  };
}
