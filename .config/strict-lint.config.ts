import { advisoryRuleSeverities } from '@williamthorsen/eslint-config-typescript';
import type { StrictLintConfig } from '@williamthorsen/strict-lint';

import { deferredLintRules } from './eslint/deferred-lint-rules.ts';

const config: StrictLintConfig = {
  maxSeverity: {
    ...advisoryRuleSeverities,
    ...deferredLintRules,
  },
};

export default config;
