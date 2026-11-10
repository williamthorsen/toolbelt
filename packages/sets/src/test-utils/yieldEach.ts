/** Yields each element, producing an iterable that is neither an array nor set-like. */
export function* yieldEach<T>(elements: readonly T[]): Generator<T> {
  yield* elements;
}
