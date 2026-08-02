// Rules downgraded to warnings until their violations are resolved.
// Consumed by `eslint.config.ts` (as a `rules` block) and `.config/strict-lint.config.ts` (as `maxSeverity`),
// so removing an entry both restores the preset's `error` and lets the rule fail `check:strict`.
export const deferredLintRules = {
  // Defer to #56, which reimplements the rule's only violation (`findDistributionByIntervalProbability`).
  'unicorn/no-useless-recursion': 'warn',
} as const;
