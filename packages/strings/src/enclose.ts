export function enclose(opening: string, closing = opening) {
  return (content: string): string => `${opening}${content}${closing}`;
}
