<!-- readme-type: monorepo-root -->

# PNPM Node monorepo

## Getting started

This project uses [pnpm](https://github.com/pnpm/pnpm) and Node.js. The Node.js version is pinned in `.tool-versions`; the pnpm version is pinned by the `packageManager` field in `package.json` and activated by [corepack](https://nodejs.org/api/corepack.html) (bundled with Node.js).

Install the pinned Node.js version, for example with the [asdf](https://asdf-vm.com/) runtime manager, which reads `.tool-versions`:

```shell
asdf plugin add nodejs
asdf install nodejs
```

Then enable corepack so `pnpm` resolves to the version pinned in `package.json`:

```shell
corepack enable
```

## Scripts

Install dependencies (this script has the same effect regardless of where it is run in the project):

```shell
pnpm install
```

---

These commands are run through the `nmr` runner. They can be run at the project level or at the level of an individual package.

To run at the project level, run the command from the project root. To run at a package level, change to the package's directory. Example: `cd packages/arrays`.

Run all code checks:

```shell
nmr check
```

Run the typechecker

```shell
nmr typecheck
```

Run the linter:

```shell
# Check for lint issues
nmr lint:check
# OR fix automatically-fixable issues
nmr lint
```

Run tests:

```shell
# Test and watch for changes
nmr test:watch

# Run tests once
nmr test

# Run coverage checker
nmr test:coverage
```

Shortcut to run typechecking, linting, and tests:

```shell
nmr check
```

### Publishing

Releases publish through npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC), and the repo holds no `NPM_TOKEN`. The one publish run by hand is a new package's placeholder, described under the one-time setup below.

Cut a release by running `release-kit` locally and pushing the tags that it creates:

```shell
# Bump versions, write changelogs, and create the release tags
npx @williamthorsen/release-kit prepare
npx @williamthorsen/release-kit commit
npx @williamthorsen/release-kit tag

# Push the commit and the new tags; the tag push triggers publishing
git push
git push --tags
```

Each pushed release tag (`{package}-v{version}`) triggers:

- `.github/workflows/publish.yaml`: Publishes the tagged package(s) to npm with provenance attestations.
- `.github/workflows/create-github-release.yaml`: Creates the matching GitHub Release.

Tags must be pushed from a developer machine, not by the dispatch `release.yaml` workflow: GitHub does not trigger workflows for tags pushed with the built-in `GITHUB_TOKEN`, so a bot-pushed tag would publish nothing.

**One-time setup (per published package):** Two steps, in order. Both require account-level 2FA, and the second requires npm ≥ 11.15.0.

First, claim the name with a placeholder version. npm accepts `npm trust` only for a package that the registry already holds, so a package's first publish cannot come from CI. Publish a bare manifest from a scratch directory. Never publish from `packages/{domain}`: that manifest carries the version from which release-kit bumps, and its build would ship an empty `dist/`.

```shell
placeholder_dir=$(mktemp -d) && printf '{ "name": "%s", "version": "0.0.0", "description": "Placeholder awaiting first release" }\n' @williamthorsen/toolbelt.arrays > "$placeholder_dir/package.json" && npm publish "$placeholder_dir" --access public
```

Then register the package as a trusted publisher, bound to `publish.yaml`:

```shell
npm trust github @williamthorsen/toolbelt.arrays --file publish.yaml --repo williamthorsen/toolbelt --allow-publish
```
