/**
 * Calls `String.prototype.toLowerCase` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

/**
 * Calls `String.prototype.toUpperCase` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

/**
 * Calls `String.prototype.trim` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trim(text: string): string {
  return text.trim();
}

/**
 * Calls `String.prototype.trimEnd` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trimEnd(text: string): string {
  return text.trimEnd();
}

/**
 * Calls `String.prototype.trimStart` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trimStart(text: string): string {
  return text.trimStart();
}
