const MAX_DISTANCE = 2;

/**
 * Returns the command closest to a mistyped token by optimal string alignment distance, or `undefined` when
 * none is within 2 edits and closer than the token's own length. A tie goes to the alphabetically first name.
 */
export function findClosestCommand(token: string, names: readonly string[]): string | undefined {
  let closest: { name: string; distance: number } | undefined;
  for (const name of names.toSorted()) {
    const distance = measureAlignmentDistance(token, name);
    if (distance > MAX_DISTANCE || distance >= token.length) continue;
    if (closest === undefined || distance < closest.distance) closest = { name, distance };
  }
  return closest?.name;
}

// region | Helpers

/** Counts the insertions, deletions, substitutions, and adjacent transpositions that turn one string into another. */
function measureAlignmentDistance(source: string, target: string): number {
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

function readCell(grid: readonly number[], width: number, i: number, j: number): number {
  return grid[i * width + j] ?? 0;
}

// endregion | Helpers
