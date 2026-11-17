/**
 * Returns the offset of the closing brace of the block that encloses an offset, or nothing when no block
 * encloses it.
 *
 * @internal
 */
export function findEnclosingBlockEnd(code: string, from: number): number | undefined {
  let depth = 0;
  for (let index = from; index < code.length; index += 1) {
    if (code[index] === '{') depth += 1;
    else if (code[index] === '}') {
      if (depth === 0) return index;
      depth -= 1;
    }
  }

  return undefined;
}
