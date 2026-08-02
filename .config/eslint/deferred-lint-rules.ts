// `@williamthorsen/eslint-config-typescript` v6 added new unicorn rules, surfacing new violations in existing code.
// Errors are downgraded to warnings here until a decision is made whether to remove the rule or fix the violations.
export const deferredLintRules = {
  'unicorn/no-array-from-fill': 'warn',
  'unicorn/no-declarations-before-early-exit': 'warn',
  'unicorn/no-duplicate-loops': 'warn',
  'unicorn/no-return-array-push': 'warn',
  'unicorn/no-unreadable-array-destructuring': 'warn',
  // Defer to #56, which reimplements the rule's only violation (`findDistributionByIntervalProbability`).
  'unicorn/no-useless-recursion': 'warn',
  'unicorn/prefer-math-constants': 'warn',
  'unicorn/prefer-private-class-fields': 'warn',
} as const;
