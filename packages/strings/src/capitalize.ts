/**
 * Capitalizes the first letter of the input string and returns the result.
 * @param input
 */
export function capitalize(input: string): string {
  return input.charAt(0).toUpperCase() + input.slice(1);
}
