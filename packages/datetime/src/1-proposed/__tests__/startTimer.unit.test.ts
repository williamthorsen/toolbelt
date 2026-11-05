import { afterEach, describe, expect, it, vi } from 'vitest';

import { startTimer } from '../startTimer.ts';

describe(startTimer, () => {
  // Drive both clocks from variables rather than a queue of one-shot values, so that a call made by
  // anything other than the subject cannot shift the readings under test.
  const performanceNowSpy = vi.spyOn(performance, 'now');
  const dateNowSpy = vi.spyOn(Date, 'now');

  afterEach(() => {
    performanceNowSpy.mockReset();
    dateNowSpy.mockReset();
  });

  it('reports the milliseconds elapsed since the timer started', () => {
    let monotonicNow = 1000;
    performanceNowSpy.mockImplementation(() => monotonicNow);

    const readElapsed = startTimer();
    monotonicNow = 1250;

    expect(readElapsed()).toBe(250);
  });

  it('rounds a fractional elapsed time to whole milliseconds', () => {
    let monotonicNow = 1000;
    performanceNowSpy.mockImplementation(() => monotonicNow);

    const readElapsed = startTimer();
    monotonicNow = 1250.6;

    expect(readElapsed()).toBe(251);
  });

  it('reads the elapsed time at each call rather than stopping the timer', () => {
    let monotonicNow = 1000;
    performanceNowSpy.mockImplementation(() => monotonicNow);

    const readElapsed = startTimer();
    monotonicNow = 1100;
    const firstReading = readElapsed();
    monotonicNow = 1400;

    expect(firstReading).toBe(100);
    expect(readElapsed()).toBe(400);
  });

  it('if the wall clock steps backwards mid-span, reports a positive duration', () => {
    let monotonicNow = 1000;
    let wallClockNow = 10_000;
    performanceNowSpy.mockImplementation(() => monotonicNow);
    dateNowSpy.mockImplementation(() => wallClockNow);

    const readElapsed = startTimer();
    // Advance the monotonic clock while the wall clock steps back past the start of the span. An
    // implementation reading Date.now() would report -4000.
    monotonicNow = 1500;
    wallClockNow = 6000;

    expect(readElapsed()).toBe(500);
  });
});
