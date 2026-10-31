/** The largest edit distance at which a candidate still counts as a likely typo. */
const MAX_DISTANCE = 2;

/**
 * Returns the candidate closest to `input` by optimal string alignment distance, or `undefined` when none is a
 * plausible typo: within 2 edits and closer than `input` has characters. A tie goes to the earliest candidate.
 * Characters are compared by code point and case-sensitively.
 * @category String
 * @experimental
 * @stage candidate
 */
export function findCloseMatch(input: string, candidates: readonly string[]): string | undefined {
  const source = Array.from(input);
  let closest: { candidate: string; distance: number } | undefined;
  for (const candidate of candidates) {
    const distance = measureAlignmentDistance(source, Array.from(candidate));
    if (distance > MAX_DISTANCE || distance >= source.length) continue;
    if (closest === undefined || distance < closest.distance) closest = { candidate, distance };
  }
  return closest?.candidate;
}

// region | Helpers

/** Counts the insertions, deletions, substitutions, and adjacent transpositions that turn one sequence into another. */
function measureAlignmentDistance(source: readonly string[], target: readonly string[]): number {
  const width = target.length + 1;
  const grid: number[] = [];

  // Fill the grid row by row, so that cell (i, j) is at index i * width + j.
  for (let i = 0; i <= source.length; i += 1) {
    for (let j = 0; j <= target.length; j += 1) {
      if (i === 0 || j === 0) {
        grid.push(i + j);
        continue;
      }
      const cost = source[i - 1] === target[j - 1] ? 0 : 1;
      let distance = Math.min(
        readCell(grid, width, i - 1, j) + 1,
        readCell(grid, width, i, j - 1) + 1,
        readCell(grid, width, i - 1, j - 1) + cost,
      );
      if (i > 1 && j > 1 && source[i - 1] === target[j - 2] && source[i - 2] === target[j - 1]) {
        distance = Math.min(distance, readCell(grid, width, i - 2, j - 2) + 1);
      }
      grid.push(distance);
    }
  }
  return readCell(grid, width, source.length, target.length);
}

/** Reads cell (i, j) of a grid stored row by row. */
function readCell(grid: readonly number[], width: number, i: number, j: number): number {
  return grid[i * width + j] ?? 0;
}

// endregion | Helpers
