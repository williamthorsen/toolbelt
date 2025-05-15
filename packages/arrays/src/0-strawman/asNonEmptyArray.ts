// These functions were found in old code. I dont remember what purpose they served.

/**
 * Returns an immutable version of the array if the array is non-empty; otherwise, throws an error.
 * The output is guaranteed to be both immutable and non-empty.
 *
 * @category Array
 * @experimental
 * @stage strawman
 */
export function asNonEmptyArray<TItem>(items: AnyArray<TItem>): NonEmptyArray<TItem> {
  // Make a new copy only if the array is mutable.
  const frozenItems: readonly TItem[] = Object.isFrozen(items) ? items : Object.freeze([...items]);

  // Narrow the type and return
  assertNonEmptyArray(frozenItems);
  return frozenItems;
}

/**
 * Narrows the array's type to `ImmutableArray` or throws an error.
 * Cannot catch all cases at compile-time: Performs a runtime check to ensure that the array is frozen.
 * @params array A frozen array.
 */
export function assertFrozenArray<TItem>(array: ImmutableArray<TItem>): asserts array is ImmutableArray<TItem> {
  if (!Object.isFrozen(array)) throw new Error('Invalid input. Array cannot be mutable.');
}

/**
 * Narrows the array's type to `ImmutableArray` or throws an error.
 * @params array An immutable array.
 */
export function assertImmutableArray<TItem>(array: ReadonlyArray<TItem>): asserts array is ImmutableArray<TItem> {
  if ('push' in array) throw new Error('Invalid input. Array cannot be mutable.');
}

/**
 * Narrows the array's type to `NonEmptyArray` or throws an error.
 * Because the input must be read-only, the output array is guaranteed to be both non-empty and
 * (within the scope of the calling program) read-only.
 * @params array A read-only array.
 */
export function assertNonEmptyArray<TItem>(array: ImmutableArray<TItem>): asserts array is NonEmptyArray<TItem> {
  if (array.length === 0) throw new Error('Invalid input. Array cannot be empty.');
}

// region | Types
export type AnyArray<TItem> = Array<TItem> | ReadonlyArray<TItem>;

export type ImmutableArray<TItem> = Immutable<AnyArray<TItem>>;

export type NonEmptyArray<TItem> = Readonly<[TItem, ...TItem[]]>;

type Immutable<T> = T & { push?: never };
// endregion | Types
