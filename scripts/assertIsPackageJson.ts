import { hasOwnProperty } from '../packages/objects/src/3-candidate/index.ts';
import { isPlainObject } from '../packages/objects/src/4-release/index.ts';

/**
 * Throws an error if the `scripts` field of the object does not conform to the `PackageJson` interface.
 */

export function assertIsPackageJson(packageJson: unknown): asserts packageJson is PackageJson {
  if (!isPlainObject(packageJson)) {
    throw new TypeError('Invalid input: Expected an object literal.');
  }

  if (hasOwnProperty(packageJson, 'scripts')) {
    if (!isPlainObject(packageJson.scripts)) {
      throw new TypeError("Invalid package.json: 'scripts' should be an object");
    }

    for (const [key, value] of Object.entries(packageJson.scripts)) {
      if (typeof value !== 'string') {
        throw new TypeError(`Invalid package.json: script key '${key}' or its value is not a string`);
      }
    }
  }
}

/**
 * Lists only the fields of the `PackageJson` interface that are relevant to the above assertion.
 */
interface PackageJson {
  scripts?: { [key: string]: string } | undefined;
}
