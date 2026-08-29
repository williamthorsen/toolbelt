/**
 * The package's callable exports, which adoption is counted in calls to.
 *
 * The five `String.prototype` wrappers -- `toLowerCase`, `toUpperCase`, `trim`, `trimEnd`, and `trimStart` --
 * are held out. Adoption is counted by matching a call name in a file that imports the package, and those five
 * name methods every string in such a file may call, so listing them would count `value.trim()` as adoption.
 *
 * @internal
 */
export const ADOPTED_EXPORTS: readonly string[] = [
  'capitalize',
  'condenseWhitespace',
  'dedent',
  'enclose',
  'hashString',
  'interpolate',
  'Interpolator',
  'isPatternMatch',
  'joinTruthy',
  'obfuscate',
  'pickVariants',
  'pluralize',
  'pluralizeWithCount',
  'removeWhitespace',
  'safeTrim',
  'slugify',
  'stripCommonIndent',
  'TextNode',
  'toCamelCase',
  'toOrdinal',
  'toSortableName',
  'trimWhitespace',
];
