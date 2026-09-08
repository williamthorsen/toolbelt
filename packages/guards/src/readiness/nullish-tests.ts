const SUBJECT = String.raw`(?<subject>[\w$]+)`;
// A strict pair has to exclude both values to be the guard, and neither operand order reads as the natural one,
// so both count. The loose comparison excludes both in one operator.
const NON_NULLABLE_TESTS = [
  new RegExp(String.raw`^${SUBJECT}\s*!==\s*null\s*&&\s*\k<subject>\s*!==\s*undefined$`),
  new RegExp(String.raw`^${SUBJECT}\s*!==\s*undefined\s*&&\s*\k<subject>\s*!==\s*null$`),
  new RegExp(String.raw`^${SUBJECT}\s*!=\s*null$`),
];
const NULLISH_TESTS = [
  new RegExp(String.raw`^${SUBJECT}\s*===\s*null\s*\|\|\s*\k<subject>\s*===\s*undefined$`),
  new RegExp(String.raw`^${SUBJECT}\s*===\s*undefined\s*\|\|\s*\k<subject>\s*===\s*null$`),
  new RegExp(String.raw`^${SUBJECT}\s*==\s*null$`),
];

/**
 * Reports whether an expression tests the named subject for being neither null nor undefined.
 *
 * @internal
 */
export function isNonNullableTest(expression: string, subject: string): boolean {
  return matchesAny(NON_NULLABLE_TESTS, expression, subject);
}

/**
 * Reports whether an expression tests the named subject for being null or undefined.
 *
 * @internal
 */
export function isNullishTest(expression: string, subject: string): boolean {
  return matchesAny(NULLISH_TESTS, expression, subject);
}

// region | Helpers

/** Reports whether any pattern matches the expression against the named subject. */
function matchesAny(patterns: readonly RegExp[], expression: string, subject: string): boolean {
  return patterns.some((pattern) => pattern.exec(expression.trim())?.groups?.['subject'] === subject);
}

// endregion | Helpers
