/* eslint-disable @typescript-eslint/no-explicit-any */

import { assertIsError } from './assertIsError.js';

/**
 * Returns the value at an object path in the form `path.to.property`.
 * Serves as a wrapper for the recursive `getNestedEntry` function to allow a top-level error message.
 * If the path is invalid or does not exist, throws an error.
 */
export function getValueByObjectPath(obj: Record<string, any>, objectPath: string): unknown {
  const pathSegments = objectPath.split('.');

  try {
    return getNestedEntry(obj, pathSegments);
  }
  catch (error) {
    assertIsError(error);
    throw new Error(`Could not get value at path "${objectPath}" : ${error.message}`);
  }
}

// region | ----- Helper functions ----- |
/**
 * Returns the value found at the nested key in the object.
 */
function getNestedEntry(obj: Record<string, any>, keys: string[]): unknown {
  const [key, ...remainingKeys] = keys;

  if (!key) {
    throw new Error('Malformed object path');
  }

  if (!(key in obj)) {
    throw new Error('Path not found');
  }

  if (keys.length === 1) {
    return obj[key];
  }
  return getNestedEntry(obj[key], remainingKeys);
}
// endregion
