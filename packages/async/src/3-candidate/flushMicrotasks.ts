/**
 * Yields to the microtask queue, so that callbacks already queued run before the caller resumes.
 *
 * @category Async
 * @experimental
 * @stage candidate
 */
export async function flushMicrotasks(): Promise<void> {
  // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
  return Promise.resolve();
}
