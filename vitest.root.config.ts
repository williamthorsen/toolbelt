import { mergeConfig } from 'vitest/config';

import baseConfig from './.config/vitest/vitest.config.ts';

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access,unicorn/no-top-level-side-effects
delete baseConfig.test?.coverage?.include;

export default mergeConfig(baseConfig, {
  test: {
    coverage: {
      include: [],
    },
    exclude: ['packages/**'],
  },
});
