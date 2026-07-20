import type { StrictLintConfig } from '@williamthorsen/strict-lint';

import { deferredUnicornRules } from './deferred-unicorn-rules.js';

const config: StrictLintConfig = {
  maxSeverity: deferredUnicornRules,
};

export default config;
