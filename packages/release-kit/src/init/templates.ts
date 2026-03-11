import type { RepoType } from './detectRepoType.ts';

/**
 * Generate the release-prepare.ts thin runner script.
 *
 * This script is identical for both repo types because `runReleasePrepare` is polymorphic.
 */
export function releasePrepareScript(): string {
  return `import { runReleasePrepare } from '@williamthorsen/release-kit';

import { config } from './release.config.ts';

runReleasePrepare(config);
`;
}

/** Generate the release.config.ts starter config with TODOs for customization. */
export function releaseConfigScript(repoType: RepoType): string {
  if (repoType === 'monorepo') {
    return `import type { MonorepoReleaseConfig } from '@williamthorsen/release-kit';
import { DEFAULT_WORK_TYPES } from '@williamthorsen/release-kit';

// TODO: Replace with your actual component directories
function component(dir: string) {
  return {
    tagPrefix: \`\${dir}-v\`,
    packageFiles: [\`packages/\${dir}/package.json\`],
    changelogPaths: [\`packages/\${dir}\`],
    paths: [\`packages/\${dir}/**\`],
  };
}

export const config: MonorepoReleaseConfig = {
  components: [
    // TODO: Add your components here
    // component('my-package'),
  ],
  workTypes: [...DEFAULT_WORK_TYPES],
  // TODO: Uncomment and adjust if you have a format command
  // formatCommand: 'pnpm run fmt',
};
`;
  }

  return `import type { ReleaseConfig } from '@williamthorsen/release-kit';
import { DEFAULT_WORK_TYPES } from '@williamthorsen/release-kit';

export const config: ReleaseConfig = {
  // TODO: Adjust the tag prefix if needed (e.g., 'v' for tags like v1.2.3)
  tagPrefix: 'v',
  packageFiles: ['package.json'],
  changelogPaths: ['.'],
  workTypes: [...DEFAULT_WORK_TYPES],
  // TODO: Uncomment and adjust if you have a format command
  // formatCommand: 'pnpm run fmt',
};
`;
}

/** Generate the release.yaml GitHub Actions workflow. */
export function releaseWorkflow(repoType: RepoType): string {
  if (repoType === 'monorepo') {
    return `# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json
name: Release

on:
  workflow_dispatch:
    inputs:
      only:
        description: 'Components to release (comma-separated, leave empty for all)'
        required: false
        type: string
      bump:
        description: 'Override version bump type (leave empty to auto-detect from commits)'
        required: false
        type: choice
        options:
          - ''
          - patch
          - minor
          - major

permissions:
  contents: write
  packages: read

jobs:
  release:
    uses: williamthorsen/.github/.github/workflows/release-pnpm.yaml@v1
    with:
      # TODO: Set the Node.js and pnpm versions for your project
      node-version: '22.0.0'
      pnpm-version: '10.0.0'
      monorepo: true
      only: \${{ inputs.only }}
      bump: \${{ inputs.bump }}
`;
  }

  return `# yaml-language-server: $schema=https://json.schemastore.org/github-workflow.json
name: Release

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Override version bump type (leave empty to auto-detect from commits)'
        required: false
        type: choice
        options:
          - ''
          - patch
          - minor
          - major

permissions:
  contents: write
  packages: read

jobs:
  release:
    uses: williamthorsen/.github/.github/workflows/release-pnpm.yaml@v1
    with:
      # TODO: Set the Node.js and pnpm versions for your project
      node-version: '22.0.0'
      pnpm-version: '10.0.0'
      bump: \${{ inputs.bump }}
`;
}
