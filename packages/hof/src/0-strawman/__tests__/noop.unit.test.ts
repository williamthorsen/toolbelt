import { describe, expect, it } from 'vitest';

import { noop } from '../noop.ts';

describe(noop, () => {
  it('can be invoked without arguments', () => {
    expect(() => {
      noop();
    }).not.toThrow();
  });

  it('can be invoked with arguments', () => {
    expect(() => {
      noop(1);
      noop(1, 2);
      noop(1, 2, 3);
    }).not.toThrow();
  });
});
