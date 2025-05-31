interface Options {
  separator?: string;
  postSeparator?: string;
}

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
