import { listTopLevelSpans } from './listTopLevelSpans.ts';

/**
 * Splits a call's argument text on the commas that sit outside every bracket, discarding the empty tail left by a
 * trailing comma.
 *
 * Each argument keeps its surrounding whitespace. An empty argument list yields one empty argument, so a caller
 * counting arguments reads it as one.
 *
 * @internal
 */
export function listTopLevelArguments(inner: string): string[] {
  return listTopLevelSpans(inner).map(({ end, start }) => inner.slice(start, end));
}
