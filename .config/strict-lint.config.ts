import type { StrictLintConfig } from '@williamthorsen/strict-lint';

import { deferredLintRules } from './eslint/deferred-lint-rules.ts';

const config: StrictLintConfig = {
  maxSeverity: deferredLintRules,
};

export default config;
