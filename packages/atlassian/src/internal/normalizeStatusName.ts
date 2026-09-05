/**
 * Reduces a status name to its comparison form. Jira reports one status under two casings across endpoints, so
 * names match on this rather than exactly.
 *
 * @internal
 */
export function normalizeStatusName(name: string): string {
  return name.trim().toLowerCase();
}
