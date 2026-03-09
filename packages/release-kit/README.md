# @williamthorsen/release-kit

Version-bumping and changelog-generation toolkit for release workflows.

This package extracts the shared release-preparation logic from the `skypilot-site` and `devtools/afg` repositories into a reusable library. It provides functions for parsing commits, determining version bumps, updating `package.json` files, and generating changelogs with `git-cliff`.

## Installation

```bash
pnpm add -D @williamthorsen/release-kit git-cliff
```

Since this package is published to GitHub Packages, configure your `.npmrc`:

```ini
@williamthorsen:registry=https://npm.pkg.github.com
```

## Quick start

1. Install `@williamthorsen/release-kit` and `git-cliff` as dev dependencies
2. Create `scripts/release-prepare.ts` and `scripts/release.config.ts` (see examples below)
3. Add `release:prepare` scripts to `package.json`
4. Copy `cliff.toml.template` to your repo root as `cliff.toml`
5. Add the GitHub Actions release workflow

## Configuration

### Single-package repo

Create `scripts/release.config.ts`:

```typescript
import { DEFAULT_WORK_TYPES } from '@williamthorsen/release-kit';
import type { ReleaseConfig } from '@williamthorsen/release-kit';

export const config: ReleaseConfig = {
  tagPrefix: 'v',
  packageFiles: ['package.json'],
  changelogPaths: ['.'],
  workTypes: [...DEFAULT_WORK_TYPES],
  formatCommand: 'pnpm run fmt',
};
```

### Monorepo

Create `scripts/release.config.ts`:

```typescript
import { DEFAULT_WORK_TYPES } from '@williamthorsen/release-kit';
import type { MonorepoReleaseConfig } from '@williamthorsen/release-kit';

function component(dir: string) {
  return {
    tagPrefix: `${dir}-v`,
    packageFiles: [`packages/${dir}/package.json`],
    changelogPaths: [`packages/${dir}`],
    paths: [`packages/${dir}/**`],
  };
}

export const config: MonorepoReleaseConfig = {
  components: [component('my-lib'), component('my-cli')],
  workTypes: [...DEFAULT_WORK_TYPES],
  formatCommand: 'pnpm run fmt',
};
```

### ReleaseConfig reference

| Field             | Type               | Required | Description                                                        |
| ----------------- | ------------------ | -------- | ------------------------------------------------------------------ |
| `tagPrefix`       | `string`           | Yes      | Git tag prefix for version tags (e.g., `'v'`)                      |
| `packageFiles`    | `string[]`         | Yes      | Paths to `package.json` files to bump                              |
| `changelogPaths`  | `string[]`         | Yes      | Directories in which to generate changelogs                        |
| `workTypes`       | `WorkTypeConfig[]` | Yes      | Ordered list of work type configurations for commit categorization |
| `formatCommand`   | `string`           | No       | Shell command to run after changelog generation                    |
| `cliffConfigPath` | `string`           | No       | Path to `cliff.toml` (defaults to `'cliff.toml'`)                  |

### MonorepoReleaseConfig reference

| Field           | Type                | Required | Description                                           |
| --------------- | ------------------- | -------- | ----------------------------------------------------- |
| `components`    | `ComponentConfig[]` | Yes      | Per-component config (tagPrefix, packageFiles, paths) |
| `workTypes`     | `WorkTypeConfig[]`  | Yes      | Shared work type configurations                       |
| `formatCommand` | `string`            | No       | Shell command to run after changelog generation       |

## Release script

Create `scripts/release-prepare.ts`:

### Single-package version

```typescript
import { releasePrepare } from '@williamthorsen/release-kit';
import type { ReleaseType } from '@williamthorsen/release-kit';
import { config } from './release.config.ts';

const VALID_BUMP_TYPES: readonly string[] = ['major', 'minor', 'patch'];

function parseArgs(): { dryRun: boolean; bumpOverride?: ReleaseType } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let bumpOverride: ReleaseType | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--bump=')) {
      const value = arg.slice('--bump='.length);
      if (!VALID_BUMP_TYPES.includes(value)) {
        console.error(`Invalid bump type "${value}". Must be: ${VALID_BUMP_TYPES.join(', ')}`);
        process.exit(1);
      }
      bumpOverride = value as ReleaseType;
    }
  }

  return { dryRun, bumpOverride };
}

const { dryRun, bumpOverride } = parseArgs();
releasePrepare(config, { dryRun, ...(bumpOverride ? { bumpOverride } : {}) });
```

### Monorepo version

```typescript
import { releasePrepareMono } from '@williamthorsen/release-kit';
import type { ReleaseType } from '@williamthorsen/release-kit';
import { config } from './release.config.ts';

const VALID_BUMP_TYPES: readonly string[] = ['major', 'minor', 'patch'];

function parseArgs(): { dryRun: boolean; bumpOverride?: ReleaseType; only?: string[] } {
  const args = process.argv.slice(2);
  let dryRun = false;
  let bumpOverride: ReleaseType | undefined;
  let only: string[] | undefined;

  for (const arg of args) {
    if (arg === '--dry-run') dryRun = true;
    else if (arg.startsWith('--bump=')) {
      const value = arg.slice('--bump='.length);
      if (!VALID_BUMP_TYPES.includes(value)) {
        console.error(`Invalid bump type "${value}". Must be: ${VALID_BUMP_TYPES.join(', ')}`);
        process.exit(1);
      }
      bumpOverride = value as ReleaseType;
    } else if (arg.startsWith('--only=')) {
      only = arg.slice('--only='.length).split(',');
    }
  }

  return { dryRun, bumpOverride, only };
}

const { dryRun, bumpOverride, only } = parseArgs();

let effectiveConfig = config;
if (only) {
  const filtered = config.components.filter((c) => {
    const name = c.tagPrefix.replace(/-v$/, '');
    return only.includes(name);
  });
  effectiveConfig = { ...config, components: filtered };
}

releasePrepareMono(effectiveConfig, { dryRun, ...(bumpOverride ? { bumpOverride } : {}) });
```

### package.json scripts

```json
{
  "scripts": {
    "release:prepare": "tsx scripts/release-prepare.ts",
    "release:prepare:dry": "tsx scripts/release-prepare.ts --dry-run"
  }
}
```

## GitHub Actions workflow

### Single-package repo

```yaml
# .github/workflows/release.yaml
name: Release

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

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'

      - run: pnpm install

      - name: Run release preparation
        id: prepare
        run: |
          ARGS=""
          if [ -n "${{ inputs.bump }}" ]; then
            ARGS="--bump=${{ inputs.bump }}"
          fi
          pnpm run release:prepare $ARGS
          VERSION=$(node -p "require('./package.json').version")
          echo "version=$VERSION" >> "$GITHUB_OUTPUT"

      - name: Check for changes
        id: check
        run: |
          if git diff --quiet; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "No release-worthy changes found."
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Commit, tag, and push
        if: steps.check.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "release: v${{ steps.prepare.outputs.version }}"
          git tag "v${{ steps.prepare.outputs.version }}"
          git push origin main "v${{ steps.prepare.outputs.version }}"
```

### Monorepo

```yaml
# .github/workflows/release.yaml
name: Release

on:
  workflow_dispatch:
    inputs:
      only:
        description: 'Components to release (comma-separated, leave empty for all)'
        required: false
        type: string
      bump:
        description: 'Override bump type (leave empty to auto-detect)'
        required: false
        type: choice
        options:
          - ''
          - patch
          - minor
          - major

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
          token: ${{ secrets.GITHUB_TOKEN }}

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'pnpm'

      - run: pnpm install

      - name: Run release preparation
        run: |
          ARGS=""
          if [ -n "${{ inputs.only }}" ]; then
            ARGS="$ARGS --only=${{ inputs.only }}"
          fi
          if [ -n "${{ inputs.bump }}" ]; then
            ARGS="$ARGS --bump=${{ inputs.bump }}"
          fi
          pnpm run release:prepare $ARGS

      - name: Check for changes
        id: check
        run: |
          if git diff --quiet; then
            echo "changed=false" >> "$GITHUB_OUTPUT"
            echo "No release-worthy changes found."
          else
            echo "changed=true" >> "$GITHUB_OUTPUT"
          fi

      - name: Determine release tags
        if: steps.check.outputs.changed == 'true'
        id: tags
        run: |
          TAGS=""
          for pkg in $(git diff --name-only -- 'packages/*/package.json'); do
            DIR=$(echo "$pkg" | cut -d/ -f2)
            VERSION=$(node -p "require('./$pkg').version")
            TAGS="$TAGS ${DIR}-v${VERSION}"
          done
          echo "tags=$TAGS" >> "$GITHUB_OUTPUT"
          echo "Releasing:$TAGS"

      - name: Commit, tag, and push
        if: steps.check.outputs.changed == 'true'
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
          git add -A
          git commit -m "release: ${{ steps.tags.outputs.tags }}"
          for TAG in ${{ steps.tags.outputs.tags }}; do
            git tag "$TAG"
          done
          git push origin main ${{ steps.tags.outputs.tags }}
```

## Triggering a release

```sh
# Single-package repo
gh workflow run release.yaml
gh workflow run release.yaml -f bump=minor

# Monorepo: all components
gh workflow run release.yaml

# Monorepo: specific component(s)
gh workflow run release.yaml -f only=my-lib
gh workflow run release.yaml -f only=my-lib,my-cli -f bump=minor
```

## cliff.toml setup

The package includes a `cliff.toml.template` with a generic git-cliff configuration that:

- Strips issue-ticket prefixes matching `^[A-Z]+-\d+\s+` (e.g., `TOOL-123 `, `AFG-456 `)
- Handles both `type: description` and `workspace|type: description` commit formats
- Groups commits by work type into changelog sections

Copy it to your repo root:

```bash
cp node_modules/@williamthorsen/release-kit/cliff.toml.template cliff.toml
```

Then customize as needed for your project.

## External dependencies

This package shells out to two external tools:

- **`git`** — must be available on `PATH`. Used to find tags and retrieve commit history.
- **`git-cliff`** — must be available on `PATH`. Add `git-cliff` as a dev dependency to make it available in CI.

## Migration from changesets

1. Add `@williamthorsen/release-kit` and `git-cliff` as dev dependencies.
2. Remove `@changesets/cli` from dev dependencies.
3. Delete the `.changeset/` directory.
4. Create `scripts/release-prepare.ts` and `scripts/release.config.ts` (see examples above).
5. Replace `changeset:*` scripts in `package.json` with `release:prepare` scripts.
6. Copy `cliff.toml.template` to your repo root as `cliff.toml`.
7. Add the GitHub Actions release workflow.
8. Create an initial version tag for each package (e.g., `git tag v1.0.0` or `git tag my-lib-v1.0.0`).
