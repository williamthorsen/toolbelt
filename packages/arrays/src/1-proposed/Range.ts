/**
 * An inclusive range of numbers that steps by one from `start` to `end`, ascending or descending.
 *
 * @category Array
 * @experimental
 * @stage proposed
 */
export class Range {
  readonly ascending: boolean;

  /** Creates a range that descends when `start` is greater than `end`. */
  constructor(
    public readonly start: number,
    public readonly end: number,
  ) {
    this.start = start;
    this.end = end;
    this.ascending = start <= end;
  }

  /** Returns the number of values in the range. */
  get length(): number {
    return Math.abs(this.end - this.start) + 1;
  }

  /** Calls the callback on each value in order. */
  forEach(callback: ArrayPredicate<number, void>): void {
    const array = this.toArray();
    for (const [index, value] of array.entries()) {
      callback(value, index, array);
    }
  }

  /** Reports whether the value lies between the bounds, inclusive. */
  includes(value: number): boolean {
    return this.ascending ? value >= this.start && value <= this.end : value <= this.start && value >= this.end;
  }

  /** Returns the callback's result for each value in order. */
  map<R>(callback: ArrayPredicate<number, R>): R[] {
    return this.toArray().map((value, index, array) => callback(value, index, array));
  }

  /** Returns the values in order. */
  toArray(): number[] {
    const { length, start, ascending } = this;
    return Array.from({ length }, (_, i) => (ascending ? start + i : start - i));
  }

  /** Yields the values in order. */
  *[Symbol.iterator](): IterableIterator<number> {
    const { start, end, ascending } = this;
    if (ascending) {
      for (let i = start; i <= end; i++) yield i;
    } else {
      for (let i = start; i >= end; i--) yield i;
    }
  }
}

type ArrayPredicate<T, R> = (value: T, index: number, array: ReadonlyArray<T>) => R;
