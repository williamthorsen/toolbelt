# @williamthorsen/release-kit

Version-bumping and changelog-generation toolkit for release workflows.

This package extracts the shared release-preparation logic from the `skypilot-site` and `devtools/afg` repositories into a reusable library. It provides functions for parsing commits, determining version bumps, updating `package.json` files, and generating changelogs with `git-cliff`.

## Installation

```bash
pnpm add @williamthorsen/release-kit
```

Since this package is published to GitHub Packages, configure your `.npmrc`:

```ini
@williamthorsen:registry=https://npm.pkg.github.com
```

## ReleaseConfig reference

| Field             | Type               | Required | Description                                                               |
| ----------------- | ------------------ | -------- | ------------------------------------------------------------------------- |
| `tagPrefix`       | `string`           | Yes      | Git tag prefix used to identify version tags (e.g., `'v'`).               |
| `packageFiles`    | `string[]`         | Yes      | Paths to `package.json` files to bump.                                    |
| `changelogPaths`  | `string[]`         | Yes      | Paths to directories in which to generate changelogs.                     |
| `workTypes`       | `WorkTypeConfig[]` | Yes      | Ordered list of work type configurations for commit categorization.       |
| `formatCommand`   | `string`           | No       | Shell command to run after changelog generation (e.g., `'pnpm run fmt'`). |
| `cliffConfigPath` | `string`           | No       | Path to the `cliff.toml` file. Defaults to `'cliff.toml'`.                |

## Usage

### Minimal consuming-repo wrapper

Create a `scripts/release-prepare.ts` in your repo:

```typescript
import { releasePrepare } from '@williamthorsen/release-kit';
import type { ReleaseType } from '@williamthorsen/release-kit';
import { config } from './release.config.ts';

function parseArgs(): { dryRun: boolean; bumpOverride?: ReleaseType } {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes('--dry-run'),
    bumpOverride: args.find((a) => ['major', 'minor', 'patch'].includes(a)) as ReleaseType | undefined,
  };
}

const { dryRun, bumpOverride } = parseArgs();

if (!dryRun && !process.env.CI) {
  console.error('Error: must be run in CI. Use --dry-run for local preview.');
  process.exit(1);
}

releasePrepare(config, { dryRun, bumpOverride });
```

### release.config.ts pattern

```typescript
import { DEFAULT_WORK_TYPES } from '@williamthorsen/release-kit';
import type { ReleaseConfig } from '@williamthorsen/release-kit';

export const config: ReleaseConfig = {
  tagPrefix: 'v',
  packageFiles: ['package.json'],
  changelogPaths: ['.'],
  workTypes: [...DEFAULT_WORK_TYPES],
  formatCommand: 'pnpm run fmt', // optional
  cliffConfigPath: 'cliff.toml', // optional, this is the default
};
```

## Migration from skypilot-site

1. Add `@williamthorsen/release-kit` as a dependency.
2. Delete the following files from `scripts/lib/`:
   - `types.ts`
   - `defaults.ts`
   - `bumpVersion.ts`
   - `parseCommitMessage.ts`
   - `determineBumpType.ts`
   - `getCommitsSinceTarget.ts`
   - `bumpAllVersions.ts`
   - `generateChangelogs.ts`
   - `utils.ts` (the `isKeyOf` helper)
3. Delete test files from `scripts/lib/__tests__/`:
   - `bumpVersion.test.ts`
   - `parseCommitMessage.test.ts`
   - `determineBumpType.test.ts`
4. Replace `scripts/release-prepare.ts` with the minimal wrapper pattern shown above.
5. Create `scripts/release.config.ts` with your project-specific configuration.
6. Copy `cliff.toml.template` from this package to your repo root as `cliff.toml` (or keep your existing `cliff.toml`).

## Migration from AFG

1. Add `@williamthorsen/release-kit` as a dependency.
2. Delete the following files from `scripts/`:
   - `release-prepare.ts` (the full implementation)
   - Any local type/utility files used by the release script
3. Replace with the minimal wrapper pattern shown above.
4. In your `release.config.ts`, set `formatCommand: 'pnpm run fmt'` to replicate the AFG post-changelog formatting step.
5. Set `cliffConfigPath` if your `cliff.toml` is not at the repo root.
6. Copy `cliff.toml.template` from this package to your repo root as `cliff.toml`, or keep your existing configuration.

## External dependencies

This package shells out to two external tools:

- **`git`** -- must be available on `PATH`. Used to find tags and retrieve commit history.
- **`git-cliff`** -- must be available on `PATH`. Used to generate changelogs. Install via `cargo install git-cliff` or your package manager.

### Using cliff.toml.template

The package includes a `cliff.toml.template` file with a generic git-cliff configuration that:

- Strips issue-ticket prefixes matching `^[A-Z]+-\d+\s+` (e.g., `TOOL-123 `, `AFG-456 `)
- Handles both `type: description` and `workspace|type: description` commit formats
- Groups commits by work type into changelog sections

To use it:

```bash
cp node_modules/@williamthorsen/release-kit/cliff.toml.template cliff.toml
```

Then customize as needed for your project.

## GitHub Actions workflow

```yaml
name: Release prepare

on:
  workflow_dispatch:
    inputs:
      bump:
        description: 'Override bump type (leave empty to auto-detect)'
        required: false
        type: choice
        options:
          - ''
          - patch
          - minor
          - major

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0 # Full history needed for git log and git-cliff

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      - name: Install git-cliff
        run: cargo install git-cliff

      - run: pnpm install --frozen-lockfile

      - name: Run release preparation
        env:
          CI: true
        run: |
          ARGS=""
          if [ -n "${{ github.event.inputs.bump }}" ]; then
            ARGS="${{ github.event.inputs.bump }}"
          fi
          pnpm tsx scripts/release-prepare.ts $ARGS

      - name: Create pull request
        uses: peter-evans/create-pull-request@v6
        with:
          title: 'chore: release preparation'
          branch: release/prepare
          commit-message: 'chore: bump versions and update changelogs'
```
