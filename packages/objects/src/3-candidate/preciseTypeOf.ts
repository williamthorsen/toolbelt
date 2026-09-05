import { isPlainObject } from '../4-release/is-object.ts';

/**
 * Returns `typeof value`, except that the "object" type is replaced by the more precise types defined in
 * `preciseObjectTypeOf`.
 */
export function preciseTypeOf(value: unknown): PreciseType {
  // TODO: Remove the type assertion when TypeScript becomes capable of correctly narrowing the type
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return typeof value === 'object' ? preciseObjectTypeOf(value) : (typeof value as NonObjectJsPrimitive);
}

/**
 * Returns
 * - "array" for an array
 * - "null" for null
 * - "plainobject" for plain objects
 * - "instance" for all other objects // consider subtyping instances: Date, Promise, etc.
 */
export function preciseObjectTypeOf(value: object | null): ObjectSubtype {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isPlainObject(value)) return 'plainobject';
  return 'instance';
}

type NonObjectJsPrimitive = 'bigint' | 'boolean' | 'number' | 'string' | 'symbol' | 'undefined';

// These types are all technically of type "object"
type ObjectSubtype = 'array' | 'function' | 'instance' | 'null' | 'plainobject';

export type PreciseType = NonObjectJsPrimitive | ObjectSubtype;
