type Integer = number;

/**
 * A first-in-first-out queue: Items are added to the tail and removed from the head.
 */
export class Queue<T> {
  #items: T[] = []; // top of the array = head

  /** Returns the item at the head without removing it. */
  get head(): T | undefined {
    return this.#items.length > 0 ? this.#items[0] : undefined;
  }

  /** Reports whether the queue holds no items. */
  get isEmpty(): boolean {
    return this.#items.length === 0;
  }

  /** Returns the number of items in the queue. */
  get size(): Integer {
    return this.#items.length;
  }

  /** Iterates over the items from head to tail. */
  [Symbol.iterator](): IterableIterator<T> {
    return this.#items.values();
  }

  /** Removes every item from the queue. */
  clear(): this {
    this.#items = [];
    return this;
  }

  /**
   * Removes and returns the item at the head of the queue, or `undefined` if there are no items
   */
  dequeue(): T | undefined {
    return this.#items.length > 0 ? this.#items.shift() : undefined;
  }

  /**
   * Removes and returns nItems at the head of the queue, or as many as are available up to nItems
   */
  dequeueBatch(nItems: Integer): T[] {
    return this.#items.splice(0, nItems);
  }

  /**
   * Adds the item to the tail of the queue
   */
  enqueue(item: T): this {
    this.#items.push(item);
    return this;
  }

  /**
   * Adds the items to the tail of the queue
   */
  enqueueBatch(items: T[]): this {
    this.#items.push(...items);
    return this;
  }
}
