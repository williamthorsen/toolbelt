import type { WorkTypeConfig } from './types.ts';

/** Default work types ordered by priority, matching the skypilot-site convention. */
export const DEFAULT_WORK_TYPES: readonly WorkTypeConfig[] = [
  { type: 'fix', header: 'Bug fixes', bump: 'patch', aliases: ['bugfix'] },
  { type: 'feat', header: 'Features', bump: 'minor', aliases: ['feature'] },
  { type: 'internal', header: 'Internal', bump: 'patch' },
  { type: 'refactor', header: 'Refactoring', bump: 'patch' },
  { type: 'tests', header: 'Tests', bump: 'patch', aliases: ['test'] },
  { type: 'tooling', header: 'Tooling', bump: 'patch' },
  { type: 'ci', header: 'CI', bump: 'patch' },
  { type: 'deps', header: 'Dependencies', bump: 'patch', aliases: ['dep'] },
  { type: 'docs', header: 'Documentation', bump: 'patch', aliases: ['doc'] },
  { type: 'fmt', header: 'Formatting', bump: 'patch' },
] as const;
