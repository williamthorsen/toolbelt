import { describe, expect, it } from 'vitest';

import { Queue } from '../Queue.ts';

describe(Queue, () => {
  describe('get head', () => {
    it('if the queue is not empty, returns the first item', () => {
      const queue = new Queue<number>();
      queue.enqueue(1);
      queue.enqueue(2);

      expect(queue.head).toBe(1);
    });

    it('if the queue is empty, returns undefined', () => {
      const queue = new Queue<number>();

      expect(queue.head).toBeUndefined();
    });
  });

  describe('get isEmpty', () => {
    it('returns true if the queue is empty', () => {
      const queue = new Queue<number>();

      expect(queue.isEmpty).toBe(true);
    });

    it('returns false if the queue is not empty', () => {
      const queue = new Queue<number>().enqueue(1);

      expect(queue.isEmpty).toBe(false);
    });
  });

  describe('get size', () => {
    it('returns the number of items in the queue', () => {
      const queue = new Queue<number>().enqueue(1).enqueue(2);

      expect(queue.size).toBe(2);
    });
  });

  describe('clear', () => {
    it('removes all items from the queue', () => {
      const queue = new Queue<number>().enqueue(1).enqueue(2);

      queue.clear();

      expect(queue.isEmpty).toBe(true);
    });
  });

  describe('dequeue', () => {
    it('removes the head of the queue and returns it', () => {
      const queue = new Queue<number>().enqueue(1).enqueue(2);

      const dequeuedValue = queue.dequeue();

      expect(dequeuedValue).toBe(1);
      expect(queue.head).toBe(2);
    });

    it('if the queue is empty, returns undefined', () => {
      const queue = new Queue<number>();

      expect(queue.dequeue()).toBeUndefined();
    });
  });

  describe('dequeueBatch', () => {
    it('removes nItems from the head of the queue and returns them', () => {
      const queue = new Queue<number>().enqueue(1).enqueue(2).enqueue(3);

      const dequeuedValues = queue.dequeueBatch(2);

      expect(dequeuedValues).toStrictEqual([1, 2]);
      expect(queue.head).toBe(3);
    });

    it('if the queue is empty, returns an empty array', () => {
      const queue = new Queue<number>();

      expect(queue.dequeueBatch(1)).toStrictEqual([]);
    });

    it('if the queue contains fewer than nItems, returns all items in the queue', () => {
      const queue = new Queue<number>().enqueue(1);

      expect(queue.dequeueBatch(5)).toStrictEqual([1]);
      expect(queue.size).toBe(0);
    });
  });

  describe('enqueue', () => {
    it('adds an item to the tail of the queue', () => {
      const queue = new Queue<number>();

      queue.enqueue(1).enqueue(2);

      expect(queue.head).toBe(1);
      expect(queue.size).toBe(2);
    });
  });

  describe('enqueueBatch', () => {
    it('adds the items to the tail of the queue in order', () => {
      const queue = new Queue<number>().enqueue(1);

      queue.enqueueBatch([2, 3]);

      expect(Array.from(queue)).toStrictEqual([1, 2, 3]);
    });
  });
});
