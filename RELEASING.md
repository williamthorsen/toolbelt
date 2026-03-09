# Releasing

This document covers the release workflow for the toolbelt monorepo.

## Prerequisites

- **git-cliff** — Installed automatically via `devDependencies`. Verify with `pnpm exec git-cliff --version`.
- **GitHub token** — The workflow uses the built-in `GITHUB_TOKEN` (no additional secrets required).

## Releasing via GitHub Actions (recommended)

The release workflow runs on `main` and handles everything: version bump, changelog generation, commit, tag, and push.

### Trigger a release

```sh
# Release all components with changes
gh workflow run release.yaml

# Release a specific component
gh workflow run release.yaml -f only=release-kit

# Release with a forced bump type
gh workflow run release.yaml -f only=release-kit -f bump=minor

# Release multiple specific components
gh workflow run release.yaml -f only=arrays,strings
```

Or use the GitHub UI: Actions → Release → Run workflow.

### What the workflow does

1. Checks out `main` with full history
2. Runs `release:prepare` (detects commits, bumps versions, generates changelogs)
3. Commits the changes
4. Creates a tag per component (e.g., `release-kit-v0.2.0`)
5. Pushes the commit and tags to `main`

### Workflow inputs

| Input  | Description                                                            |
| ------ | ---------------------------------------------------------------------- |
| `only` | Components to release (comma-separated, empty = all)                   |
| `bump` | Override bump type: `patch`, `minor`, or `major` (empty = auto-detect) |

## Local dry run

Preview what a release would do before triggering the workflow:

```sh
# All components
pnpm run release:prepare:dry

# Specific component(s)
pnpm run release:prepare:dry -- --only=release-kit

# With a forced bump type
pnpm run release:prepare:dry -- --only=release-kit --bump=minor
```

From a package directory:

```sh
cd packages/release-kit
pnpm run release:prepare:dry
```

## CLI flags (release:prepare)

| Flag                         | Description                                         |
| ---------------------------- | --------------------------------------------------- |
| `--dry-run`                  | Preview changes without modifying files             |
| `--bump=major\|minor\|patch` | Override the automatic bump type                    |
| `--only=name1,name2`         | Process only the named components (comma-separated) |
| `--help`                     | Show usage information                              |

Component names match the package directory name (e.g., `arrays`, `release-kit`, `strings`).
