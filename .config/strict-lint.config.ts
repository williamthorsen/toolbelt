import type { StrictLintConfig } from '@williamthorsen/strict-lint';

import { deferredUnicornRules } from './deferred-unicorn-rules.ts';

const config: StrictLintConfig = {
  maxSeverity: deferredUnicornRules,
};

export default config;
