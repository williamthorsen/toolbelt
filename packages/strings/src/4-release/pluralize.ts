/**
 * Returns the singular or plural form of a word based on the count.
 * If no plural form is provided, it defaults to the singular form with an 's' appended.
 * Only a count whose absolute value is exactly 1 takes the singular, so a fractional or non-finite count takes
 * the plural.
 *
 * @category String
 * @stage release
 */
export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return Math.abs(count) === 1 ? singular : plural;
}

/**
 * Returns the singular or plural form of a word based on the count, along with the count itself.
 * The count is interpolated as given, so a caller wanting formatted output composes a formatted number with
 * `pluralize` instead.
 *
 * @category String
 * @stage release
 */
export function pluralizeWithCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}
