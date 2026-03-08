import type { MonorepoReleaseConfig } from '~/packages/release-kit/src/index.ts';
import { DEFAULT_WORK_TYPES } from '~/packages/release-kit/src/index.ts';

function component(dir: string) {
  return {
    tagPrefix: `${dir}-v`,
    packageFiles: [`packages/${dir}/package.json`],
    changelogPaths: [`packages/${dir}`],
    paths: [`packages/${dir}/**`],
  };
}

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
  workTypes: [...DEFAULT_WORK_TYPES],
  formatCommand: 'pnpm run fmt',
};
