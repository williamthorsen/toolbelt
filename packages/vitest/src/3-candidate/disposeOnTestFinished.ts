import { onTestFinished } from 'vitest';

/**
 * Registers a `Disposable`'s disposal with the current test and returns it unchanged, so a builder can wrap the
 * construction in place and hand back a value derived from the resource rather than the resource itself.
 *
 * Disposal runs after the test, failure included, and in reverse registration order.
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
  // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
  onTestFinished(() => resource[Symbol.dispose]());

  return resource;
}
