/**
 * Evaluates a polynomial, given its coefficients in ascending order, by Horner's method.
 *
 * @internal
 */
export function evaluatePolynomial(coefficients: readonly number[], x: number): number {
  return coefficients.reduceRight((accumulator, coefficient) => accumulator * x + coefficient, 0);
}

/**
 * Returns the quotient of two polynomials evaluated at the same point.
 *
 * @internal
 */
export function evaluateRatio(numerator: readonly number[], denominator: readonly number[], x: number): number {
  return evaluatePolynomial(numerator, x) / evaluatePolynomial(denominator, x);
}
