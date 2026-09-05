/**
 * The package's callable exports. A call to one of them counts toward adoption.
 *
 * `hasOwnProperty` names a method carried by every object, and adoption is counted by matching a call name in
 * a file that imports the package, so a call on the value itself would count as adoption. It is listed anyway:
 * eslint's recommended `no-prototype-builtins` reports that form, and holding the name out would leave the
 * check that recommends this function unable to register any progress at all.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'getValueAtPathOrThrow',
  'hasKeyAtPath',
  'hasOwnProperty',
  'isEqual',
  'isKeyOf',
  'isObject',
  'isPlainObject',
  'isRecord',
  'isRecordOrArray',
  'isScalar',
  'mapToObject',
  'objectFromKeys',
  'objectSize',
  'omitNullish',
  'omitUndefined',
  'preciseTypeOf',
  'sortKeys',
  'sortObjectKeys',
];
