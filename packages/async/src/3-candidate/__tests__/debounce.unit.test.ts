import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { debounce, type DebouncedFunction } from '../debounce.ts';

describe(debounce, () => {
  let fn: (id?: number) => void;
  let debouncedFn: DebouncedFunction<typeof fn>;

  beforeEach(() => {
    fn = vi.fn<() => void>();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('delays the execution of the function', () => {
    debouncedFn = debounce(fn, 1000);

    debouncedFn();

    expect(fn).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous timeout if called again', () => {
    debouncedFn = debounce(fn, 500);
    debouncedFn(1);
    debouncedFn(2);
    debouncedFn(3);

    expect(fn).not.toHaveBeenCalled();

    vi.runAllTimers();

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });

  it('cancels the function if cancel() is called', () => {
    debouncedFn = debounce(fn, 1000);
    debouncedFn();

    debouncedFn.cancel();

    vi.runAllTimers();

    expect(fn).not.toHaveBeenCalled();
  });

  it('executes the function immediately if noInitialDelay is true', () => {
    debouncedFn = debounce(fn, 1000, { noInitialDelay: true });

    debouncedFn(1);
    expect(fn).toHaveBeenCalledWith(1);

    debouncedFn(2);
    debouncedFn(3);
    vi.runAllTimers();

    expect(fn).not.toHaveBeenCalledWith(2);
    expect(fn).toHaveBeenCalledWith(3);

    debouncedFn(4);
    expect(fn).not.toHaveBeenCalledWith(4);
  });

  it('waits no more than maxWaitInMs to invoke the function', () => {
    debouncedFn = debounce(fn, 500, { maxWaitMs: 750 });

    debouncedFn(1);
    vi.advanceTimersByTime(250);

    debouncedFn(2);
    vi.advanceTimersByTime(250);

    expect(fn).not.toHaveBeenCalledWith(2);

    debouncedFn(3);
    vi.advanceTimersByTime(250);

    // called after 750 ms (maxWaitMs), even though the most recent call was only 250 ms ago
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(3);
  });
});
