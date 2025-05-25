export class Range {
  readonly ascending: boolean;

  constructor(
    public readonly start: number,
    public readonly end: number,
  ) {
    this.start = start;
    this.end = end;
    this.ascending = start <= end;
  }

  get length(): number {
    return Math.abs(this.end - this.start) + 1;
  }

  forEach(callback: ArrayPredicate<number, void>): void {
    const array = this.toArray();
    for (const [index, value] of array.entries()) {
      callback(value, index, array);
    }
  }

  includes(value: number): boolean {
    return this.ascending ? value >= this.start && value <= this.end : value <= this.start && value >= this.end;
  }

  map<R>(callback: ArrayPredicate<number, R>): R[] {
    return this.toArray().map((value, index, array) => callback(value, index, array));
  }

  toArray(): number[] {
    const { length, start, ascending } = this;
    return Array.from({ length }, (_, i) => (ascending ? start + i : start - i));
  }

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
