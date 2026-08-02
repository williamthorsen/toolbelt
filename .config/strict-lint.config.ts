import { advisoryRuleSeverities } from '@williamthorsen/eslint-config-typescript';
import { defineConfig } from '@williamthorsen/strict-lint/config';

import { deferredLintRules } from './eslint/deferred-lint-rules.ts';

const config = defineConfig({
  maxSeverity: {
    ...advisoryRuleSeverities,
    ...deferredLintRules,
  },
});

export default config;
