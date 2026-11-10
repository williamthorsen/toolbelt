const CLOSERS = ')]}';
const OPENERS = '([{';

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
  const args: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < inner.length; index += 1) {
    const character = inner.charAt(index);

    if (OPENERS.includes(character)) depth += 1;
    else if (CLOSERS.includes(character)) depth -= 1;
    else if (character === ',' && depth === 0) {
      args.push(inner.slice(start, index));
      start = index + 1;
    }
  }
  args.push(inner.slice(start));

  const last = args.at(-1);
  if (args.length > 1 && last !== undefined && last.trim() === '') args.pop();

  return args;
}
