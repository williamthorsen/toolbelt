import { isPlainObject } from '../4-release/is-object.ts';

/**
 * Returns `typeof value`, except that the "object" type is replaced by the more precise types defined in
 * `preciseObjectTypeOf`.
 *
 * @category Object
 * @experimental
 * @stage candidate
 */
export function preciseTypeOf(value: unknown): PreciseType {
  // TODO: Remove the type assertion when TypeScript becomes capable of correctly narrowing the type
  // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
  return typeof value === 'object' ? preciseObjectTypeOf(value) : (typeof value as NonObjectJsPrimitive);
}

/**
 * Classifies a value whose `typeof` is "object" as "null", "array", "plainobject", or "instance".
 *
 * @category Object
 * @experimental
 * @stage candidate
 * @todo Consider subtyping instances, such as Date and Promise.
 */
export function preciseObjectTypeOf(value: object | null): ObjectSubtype {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (isPlainObject(value)) return 'plainobject';
  return 'instance';
}

type NonObjectJsPrimitive = 'bigint' | 'boolean' | 'number' | 'string' | 'symbol' | 'undefined';

// The subtypes of what `typeof` reports as "object", plus "function"
type ObjectSubtype = 'array' | 'function' | 'instance' | 'null' | 'plainobject';

export type PreciseType = NonObjectJsPrimitive | ObjectSubtype;
