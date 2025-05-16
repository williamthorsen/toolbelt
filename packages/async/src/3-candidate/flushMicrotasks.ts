export async function flushMicrotasks(): Promise<void> {
  // eslint-disable-next-line unicorn/no-useless-promise-resolve-reject
  return Promise.resolve();
}
