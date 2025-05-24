interface RangeInput {
  start: number;
  end: number;
}

export class Range {
  readonly start: number;
  readonly end: number;
  readonly ascending: boolean;

  constructor({ start, end }: RangeInput) {
    this.start = start;
    this.end = end;
    this.ascending = start <= end;
  }

  get length(): number {
    return Math.abs(this.end - this.start) + 1;
  }

  includes(value: number): boolean {
    return this.ascending ? value >= this.start && value <= this.end : value <= this.start && value >= this.end;
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
