export type SiteKind = 'assert' | 'coerce' | 'describe-inline' | 'narrow';

// Each pattern reads a whitespace-collapsed window anchored at `instanceof Error`, because a real site wraps
// mid-expression under a formatter and a line-oriented pattern would walk past it.
const DESCRIBE_TERNARY = /^instanceof Error \? [\w.]+\.message :/;
const DESCRIBE_STATEMENT = /^instanceof Error\)+ ?(?:\{ )?return [\w.]+\.message/;
const COERCE_TERNARY = /^instanceof Error \? [\w.]+ : new \w*Error\b/;
const NEGATED_OPERAND = /!\(\s*[\w.]+\s*$/;

/**
 * Names what an `instanceof Error` site is doing, from the collapsed text either side of it.
 *
 * Every unrecognized site is a `narrow` rather than being dropped: the substitution there is often a
 * correction rather than a tidy-up, as with a guard that reads `.message` off a value the runtime may not
 * deliver as an `Error` at all.
 *
 * @internal
 */
export function classifySite(before: string, after: string): SiteKind {
  if (DESCRIBE_TERNARY.test(after) || DESCRIBE_STATEMENT.test(after)) return 'describe-inline';
  if (COERCE_TERNARY.test(after)) return 'coerce';
  if (NEGATED_OPERAND.test(before) && after.includes('throw')) return 'assert';
  return 'narrow';
}
