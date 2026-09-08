import { condenseWhitespace, PARENTHESES, readBalancedGroup } from '@williamthorsen/toolbelt.adoption';

import { isNonNullableTest, isNullishTest } from './nullish-tests.ts';

export type AssertionCloneKind = 'assert-clone' | 'nullish-assert-clone';

interface GuardedTest {
  condition: string;
  /** What the guard does where its condition holds. */
  outcome: 'return' | 'throw';
}

const GUARD = /\bif\s*\(/g;
const NEGATION = /^!\s*/;
const RETURN_STATEMENT = /^return\s*[;}]/;
const THROW_STATEMENT = /^throw\b/;

/**
 * Returns the assertion a function's body re-implements, or nothing where the body does more than assert.
 *
 * Takes the blanked body. A body qualifies only where every statement in it is a `throw` or a bare `return`
 * under a guard, so a function that also computes, logs, or returns a value is left alone. Which assertion it
 * clones is then read off the guard that tests the function's own argument: `assert` where the argument is
 * tested for truth, `assertIsNonNullable` where it is tested against null and undefined. A guard on anything
 * else is passed over, so a domain assertion narrowing its argument through a call or an `instanceof` reports
 * nothing here.
 *
 * @internal
 */
export function findAssertionClone(body: string, parameter: string): AssertionCloneKind | undefined {
  const condensed = condenseWhitespace(body).trim();
  if (!isAssertionBody(condensed)) return undefined;

  const tests = listGuardedTests(condensed);
  if (tests.some((test) => testsOwnArgument(test, parameter))) return 'assert-clone';
  if (tests.some((test) => testsOwnArgumentForNullish(test, parameter))) return 'nullish-assert-clone';

  return undefined;
}

// region | Helpers

/** Replaces each guard's condition with spaces, leaving the statements that the body runs. */
function blankConditions(condensed: string): string {
  let blanked = condensed;

  for (const match of condensed.matchAll(GUARD)) {
    const group = readBalancedGroup(condensed, match.index, PARENTHESES);
    if (group === undefined) continue;
    blanked = blanked.slice(0, match.index) + ' '.repeat(group.end - match.index) + blanked.slice(group.end);
  }

  return blanked;
}

/** Reports whether a body does nothing but throw, and return early to avoid throwing. */
function isAssertionBody(condensed: string): boolean {
  const statements = blankConditions(condensed)
    .replaceAll(/\belse\b/g, ' ')
    .replaceAll(/[{}]/g, ' ')
    .split(';')
    .map((statement) => statement.trim())
    .filter((statement) => statement !== '');

  return (
    statements.some((statement) => THROW_STATEMENT.test(statement)) &&
    statements.every((statement) => THROW_STATEMENT.test(statement) || statement === 'return')
  );
}

/** Lists each guard whose condition decides between throwing and returning. */
function listGuardedTests(condensed: string): GuardedTest[] {
  const tests: GuardedTest[] = [];

  for (const match of condensed.matchAll(GUARD)) {
    const group = readBalancedGroup(condensed, match.index, PARENTHESES);
    if (group === undefined) continue;

    const outcome = readOutcome(condensed.slice(group.end));
    if (outcome !== undefined) {
      tests.push({ condition: condensed.slice(group.start + 1, group.end - 1).trim(), outcome });
    }
  }

  return tests;
}

/** Reads what a guard does where its condition holds, past the brace that may open its block. */
function readOutcome(afterCondition: string): GuardedTest['outcome'] | undefined {
  const statement = afterCondition.replace(/^\s*\{?\s*/, '');
  if (THROW_STATEMENT.test(statement)) return 'throw';
  if (RETURN_STATEMENT.test(statement)) return 'return';

  return undefined;
}

/** Reports whether a guard throws on a falsy argument, or returns on a truthy one, as `assert` does. */
function testsOwnArgument({ condition, outcome }: GuardedTest, parameter: string): boolean {
  if (outcome === 'return') return condition === parameter;

  return NEGATION.test(condition) && condition.replace(NEGATION, '') === parameter;
}

/** Reports whether a guard throws on a nullish argument, or returns on a present one. */
function testsOwnArgumentForNullish({ condition, outcome }: GuardedTest, parameter: string): boolean {
  return outcome === 'throw' ? isNullishTest(condition, parameter) : isNonNullableTest(condition, parameter);
}

// endregion | Helpers
