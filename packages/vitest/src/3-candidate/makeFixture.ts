/**
 * Adapts a `Disposable` factory into a Vitest fixture that disposes the value when its scope ends. Scope is
 * whichever one `test.extend` is given, so a fixture built here reaches all three of them.
 *
 * A fixture depending on another fixture cannot be built this way: Vitest discovers dependencies by reading the
 * fixture function's own source, so such a fixture names them in its parameter list and registers `onCleanup` itself.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * const it = test.extend('tree', { scope: 'file' }, makeFixture(() => createTempTree({ 'src/main.ts': '' })));
 *
 * it('resolves a path within the tree', ({ tree }) => {
 *   expect(tree.resolve('src/main.ts')).toBe(`${tree.dir}/src/main.ts`);
 * });
 */
export function makeFixture<T extends Disposable>(build: () => T) {
  // eslint-disable-next-line no-empty-pattern -- Vitest parses this pattern from the emitted function's source to find the fixture's dependencies; an empty one declares none, and dropping the parameter fails collection.
  return ({}, { onCleanup }: { onCleanup: (cleanup: () => void) => void }): T => {
    const resource = build();

    onCleanup(() => resource[Symbol.dispose]());

    return resource;
  };
}
