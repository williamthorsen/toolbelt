<!-- readme-type: monorepo-root -->

# PNPM Node monorepo

## Getting started

Prerequisites: The Node.js version pinned in `.tool-versions`, and a [standalone pnpm](https://pnpm.io/installation), which runs the version that `packageManager` in `package.json` pins.

Install the pinned Node.js version, for example with the [asdf](https://asdf-vm.com/) runtime manager, which reads `.tool-versions`:

```shell
asdf plugin add nodejs
asdf install nodejs
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

Releases publish through npm [trusted publishing](https://docs.npmjs.com/trusted-publishers/) (OIDC), and the repo stores no `NPM_TOKEN`. The one publish run by hand is a new package's placeholder, described under the one-time setup below.

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

**One-time setup (per published package):** Two steps, in order, from a shell signed in to npm through `npm login`. Both require account-level 2FA, and the second requires npm ≥ 11.15.0.

First, claim the name with a placeholder version. npm accepts `npm trust` only for a package that the registry already holds, so a package's first publish cannot come from CI. Publish a bare manifest from a scratch directory. Never publish from `packages/{domain}`: That manifest declares the version from which release-kit bumps, and its build would publish an empty `dist/`.

```shell
placeholder_dir=$(mktemp -d) && printf '{ "name": "%s", "version": "0.0.0", "description": "Placeholder awaiting first release" }\n' @williamthorsen/toolbelt.{domain} > "$placeholder_dir/package.json" && npm publish "$placeholder_dir" --access public
```

Then register the package as a trusted publisher, bound to `publish.yaml`. The registry takes a few minutes to show a new package, and `npm trust` fails until it does, so wait until `npm view @williamthorsen/toolbelt.{domain} version` reports `0.0.0`:

```shell
npm trust github @williamthorsen/toolbelt.{domain} --file publish.yaml --repo williamthorsen/toolbelt --allow-publish
```
