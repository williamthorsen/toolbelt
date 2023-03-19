/* eslint-disable @typescript-eslint/no-explicit-any */

import type { NonFunction } from './common.types.js';
import { isPlainObject } from './isPlainObject.js';

/**
 * Recursively replaces object properties and array elements within the object.
 * If a `checkCondition` function is given in the options, the replacement is made only if the function, which receives
 * the property or element's current value as an argument, evaluates to truthy.
 */
export function replaceDeep<TOld, TNew>(
  target: unknown,
  valueOrReplacer: ValueOrReplacer<TOld, TNew>,
  options: ReplaceValuesOptions = {}
): any {
  // Replace object values, then recursively invoke this function on the object's values
  if (isPlainObject(target)) {
    const newTarget = replaceObjectValues(target, valueOrReplacer, options);
    return Object.fromEntries(
      Object.entries(newTarget).map(([k, v]) => [k, replaceDeep(v, valueOrReplacer, options)])
    );
  }

  // Replace array elements, then recursively invoke this function on the array's elements
  if (Array.isArray(target)) {
    const newTarget = replaceArrayValues(target, valueOrReplacer, options);
    return newTarget.map(item => replaceDeep(item, valueOrReplacer, options));
  }

  // Anything else is neither an object nor an array, so simply return it unchanged
  return target;
}

// region | ----- Helper functions ----- |
/**
 * Returns a new array in which elements have been conditionally replaced. See `replaceDeep` for details.
 */
function replaceArrayValues<TOld, TNew>(
  target: ReadonlyArray<TOld>,
  valueOrReplacer: ValueOrReplacer<TOld, TNew>,
  options: ReplaceValuesOptions = {}
): Array<TOld | TNew> {
  const { checkCondition = returnTrue } = options;
  return target.map((previousValue) => checkCondition(previousValue)
    ? resolveValue(valueOrReplacer, previousValue)
    : previousValue
  );
}

/**
 * Returns a new object in which properties have been conditionally replaced. See `replaceDeep` for details.
 */
function replaceObjectValues<TOld, TNew>(
  target: Record<string, any>,
  valueOrReplacer: ValueOrReplacer<TOld, TNew>,
  options: ReplaceValuesOptions = {}
): Record<string, TOld | TNew> {
  const { checkCondition = returnTrue } = options;
  return Object.fromEntries(
    Object.entries(target).map(([key, previousValue]) => [
      key,
      checkCondition(previousValue) ? resolveValue(valueOrReplacer, previousValue) : previousValue,
    ])
  );
}

/**
 * Accepts either a value or a function. If given a value, returns the value.
 * If given a function, invokes the function and returns the result.
 * If interested, see https://github.com/microsoft/TypeScript/issues/37663 for discussion of how to type this correctly.
 */
function resolveValue<TOld, TNew>(valueOrReplacer: ValueOrReplacer<TOld, TNew>, previousValue: TOld): TNew {
  return valueOrReplacer instanceof Function ? valueOrReplacer(previousValue) : valueOrReplacer;
}

export const FOR_TESTING = { replaceArrayValues, replaceObjectValues, resolveValue };

function returnTrue(): boolean {
  return true;
}
// endregion | Helper functions

interface ReplaceValuesOptions {
  checkCondition?: (previousValue: unknown) => any;
}

type ValueOrReplacer<TOld, TNew> =  NonFunction<TNew> | ((previousValue: TOld) => TNew);
