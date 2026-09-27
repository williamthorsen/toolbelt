/**
 * Calls `String.prototype.toLowerCase` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toLowerCase(str: string): string {
  return str.toLowerCase();
}

/**
 * Calls `String.prototype.toUpperCase` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function toUpperCase(str: string): string {
  return str.toUpperCase();
}

/**
 * Calls `String.prototype.trim` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trim(str: string): string {
  return str.trim();
}

/**
 * Calls `String.prototype.trimEnd` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trimEnd(str: string): string {
  return str.trimEnd();
}

/**
 * Calls `String.prototype.trimStart` on a string, for use as a callback.
 * @category String
 * @experimental
 * @stage candidate
 */
export function trimStart(str: string): string {
  return str.trimStart();
}
