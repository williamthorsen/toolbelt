type Integer = number;

/**
 * Implements a queue data structure.
 * The queue is a first-in-first-out data structure:
 * Items are added to the tail of the queue and removed from the head of the queue.
 */
export class Queue<T> {
  _items: T[] = []; // top of the array = head

  get head(): T | undefined {
    return this._items.length > 0 ? this._items[0] : undefined;
  }

  get isEmpty(): boolean {
    return this._items.length === 0;
  }

  get size(): Integer {
    return this._items.length;
  }

  [Symbol.iterator](): IterableIterator<T> {
    return this._items.values();
  }

  clear(): this {
    this._items = [];
    return this;
  }

  /**
   * Returns the item at the head of the queue, or `undefined` if there are no items
   */
  dequeue(): T | undefined {
    return this._items.length > 0 ? this._items.shift() : undefined;
  }

  /**
   * Returns nItems at the head of the queue, or as many as are available up to nItems
   */
  dequeueBatch(nItems: Integer): T[] {
    return this._items.splice(0, nItems);
  }

  /**
   * Adds the item to the tail of the queue
   */
  enqueue(item: T): this {
    this._items.push(item);
    return this;
  }

  /**
   * Adds the items to the tail of the queue
   */
  enqueueBatch(items: T[]): this {
    this._items.push(...items);
    return this;
  }
}
