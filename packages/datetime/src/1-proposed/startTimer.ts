/**
 * Starts a timer on the monotonic clock and returns a function reporting the whole milliseconds
 * elapsed since this call. Because the clock is monotonic, an adjustment to the wall clock during
 * the span cannot shorten the reported duration or make it negative.
 *
 * The returned function reads the timer rather than stopping it: each call reports the time elapsed
 * at that moment, so a span can be sampled more than once.
 *
 * @category DateTime
 * @experimental
 * @stage proposed
 */
export function startTimer(): () => number {
  const startedAt = performance.now();

  return () => Math.round(performance.now() - startedAt);
}
