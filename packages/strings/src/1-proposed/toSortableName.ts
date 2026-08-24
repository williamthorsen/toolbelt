interface Options {
  separator?: string;
  postSeparator?: string;
}

/**
 * Reorders a name so the segment at the given index leads, as `Public John Q` from `John Q Public`.
 * Returns the name unchanged if the index is not a split point inside it.
 * @category String
 * @experimental
 * @stage proposed
 */
export function toSortableName(
  name: string,
  index: number,
  { postSeparator = ' ', separator = ' ' }: Options = {},
): string {
  const parts = name.split(separator);
  if (index < 1 || index >= parts.length) {
    return name;
  }

  const leading = parts.slice(0, index);
  const trailing = parts.slice(index);

  return [trailing.join(separator), leading.join(separator)].join(postSeparator);
}
