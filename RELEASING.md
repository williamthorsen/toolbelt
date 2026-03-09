# Releasing

This document covers the release workflow for the toolbelt monorepo.

## Prerequisites

- **git-cliff** — Installed automatically via `devDependencies`. Verify with `pnpm exec git-cliff --version`.
- **GitHub PAT** — Required for publishing to GitHub Package Registry. Configure in `~/.npmrc`:
  ```
  //npm.pkg.github.com/:_authToken=ghp_YOUR_TOKEN
  ```

## Preparing a release

The release-preparation script detects commits since the last release tag, determines the bump type, updates `package.json` versions, and generates changelogs.

### 1. Dry run

Always start with a dry run to preview changes:

```sh
# All components
pnpm run release:prepare:dry

# Specific component(s)
pnpm run release:prepare:dry -- --only=release-kit
pnpm run release:prepare:dry -- --only=arrays,strings

# With a forced bump type
pnpm run release:prepare:dry -- --only=release-kit --bump=minor
```

From a package directory:

```sh
cd packages/release-kit
pnpm run release:prepare:dry
```

### 2. Prepare the release

Once the dry run looks correct, run without `--dry-run`:

```sh
pnpm run release:prepare -- --only=release-kit
```

This modifies files in place:

- Bumps the version in `package.json`
- Generates or updates `CHANGELOG.md`
- Runs the formatter (`pnpm run fmt`)

## CLI flags

| Flag                         | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `--dry-run`                  | Preview changes without modifying files             |
| `--bump=major\|minor\|patch` | Override the automatic bump type                    |
| `--only=name1,name2`         | Process only the named components (comma-separated) |
| `--help`                     | Show usage information                              |

Component names match the package directory name (e.g., `arrays`, `release-kit`, `strings`).

## Publishing to GitHub Package Registry

After preparing the release, publish from the package directory:

```sh
cd packages/release-kit
pnpm publish
```

Each package's `publishConfig` targets `https://npm.pkg.github.com`.

## Post-publish steps

1. **Commit** the version bump and changelog:

   ```sh
   git add packages/release-kit/package.json packages/release-kit/CHANGELOG.md
   git commit -m "release-kit|release: v0.2.0"
   ```

2. **Tag** the release:

   ```sh
   git tag release-kit-v0.2.0
   ```

3. **Push** the commit and tag:
   ```sh
   git push && git push --tags
   ```
