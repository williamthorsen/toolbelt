import type { MonorepoReleaseConfig } from '~/packages/release-kit/src/index.ts';
import { component } from '~/packages/release-kit/src/index.ts';

export const config: MonorepoReleaseConfig = {
  components: [
    component('packages/arrays'),
    component('packages/async'),
    component('packages/datetime'),
    component('packages/enums'),
    component('packages/guards'),
    component('packages/hof'),
    component('packages/nodejs'),
    component('packages/numbers'),
    component('packages/objects'),
    component('packages/release-kit'),
    component('packages/sets'),
    component('packages/strings'),
    component('packages/tools'),
  ],
  formatCommand: 'pnpm run fmt',
};
