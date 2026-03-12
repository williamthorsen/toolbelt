import type { MonorepoReleaseConfig } from '~/packages/release-kit/src/index.ts';
import { component } from '~/packages/release-kit/src/index.ts';

export const config: MonorepoReleaseConfig = {
  components: [
    component('arrays'),
    component('async'),
    component('datetime'),
    component('enums'),
    component('guards'),
    component('hof'),
    component('nodejs'),
    component('numbers'),
    component('objects'),
    component('release-kit'),
    component('sets'),
    component('strings'),
    component('tools'),
  ],
  formatCommand: 'pnpm run fmt',
};
