import { runReleasePrepare } from '~/packages/release-kit/src/index.ts';

import { config } from './release.config.ts';

runReleasePrepare(config);
