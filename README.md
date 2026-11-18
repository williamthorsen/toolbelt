<!-- readme-type: monorepo-root -->

# Toolbelt

TypeScript utility libraries, each published to npm as `@williamthorsen/toolbelt.{domain}`. Every package is ESM only and requires Node.js 24 or later.

## Packages

| Package                                                                | Description                                                                                                                |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [`@williamthorsen/toolbelt.acp`](packages/acp/README.md)               | An Agent Client Protocol client that runs an app's prompts on agent harnesses such as Claude Code and the Antigravity CLI. |
| [`@williamthorsen/toolbelt.arrays`](packages/arrays/README.md)         | Array utilities                                                                                                            |
| [`@williamthorsen/toolbelt.async`](packages/async/README.md)           | Async utilities                                                                                                            |
| [`@williamthorsen/toolbelt.atlassian`](packages/atlassian/README.md)   | Utilities for working with Atlassian Cloud                                                                                 |
| [`@williamthorsen/toolbelt.cli`](packages/cli/README.md)               | A parser, help renderer, and command router for command-line tools                                                         |
| [`@williamthorsen/toolbelt.datetime`](packages/datetime/README.md)     | Date and time utilities                                                                                                    |
| [`@williamthorsen/toolbelt.dstructs`](packages/dstructs/README.md)     | Data-structure utilities                                                                                                   |
| [`@williamthorsen/toolbelt.enums`](packages/enums/README.md)           | Functions for working with TypeScript enums                                                                                |
| [`@williamthorsen/toolbelt.errors`](packages/errors/README.md)         | Utilities for working with errors                                                                                          |
| [`@williamthorsen/toolbelt.filesystem`](packages/filesystem/README.md) | Filesystem utilities                                                                                                       |
| [`@williamthorsen/toolbelt.git`](packages/git/README.md)               | Utilities for working with git                                                                                             |
| [`@williamthorsen/toolbelt.guards`](packages/guards/README.md)         | TypeScript type guards                                                                                                     |
| [`@williamthorsen/toolbelt.hof`](packages/hof/README.md)               | TypeScript higher-order functions                                                                                          |
| [`@williamthorsen/toolbelt.llm`](packages/llm/README.md)               | Runs an LLM job in the page or at an operator's endpoint, on a credential of the user's or the operator's.                 |
| [`@williamthorsen/toolbelt.nodejs`](packages/nodejs/README.md)         | Utilities for inspecting Node.js runtimes and toolchains                                                                   |
| [`@williamthorsen/toolbelt.numbers`](packages/numbers/README.md)       | Utility functions for working with numbers                                                                                 |
| [`@williamthorsen/toolbelt.objects`](packages/objects/README.md)       | Utilities for working with objects in JavaScript and TypeScript                                                            |
| [`@williamthorsen/toolbelt.packaging`](packages/packaging/README.md)   | Package and project layout utilities: where a package or project boundary begins, and what its manifest declares           |
| [`@williamthorsen/toolbelt.secrets`](packages/secrets/README.md)       | Utilities for storing and retrieving secrets in the OS credential store                                                    |
| [`@williamthorsen/toolbelt.sets`](packages/sets/README.md)             | Functions for working with sets                                                                                            |
| [`@williamthorsen/toolbelt.statistics`](packages/statistics/README.md) | Statistics utilities                                                                                                       |
| [`@williamthorsen/toolbelt.strings`](packages/strings/README.md)       | String-handling utilities                                                                                                  |
| [`@williamthorsen/toolbelt.terminal`](packages/terminal/README.md)     | Utilities for rendering command-line output to terminals, pipes, and CI logs                                               |
| [`@williamthorsen/toolbelt.testing`](packages/testing/README.md)       | Runner-agnostic utilities for testing                                                                                      |
| [`@williamthorsen/toolbelt.vitest`](packages/vitest/README.md)         | Utilities for testing with Vitest                                                                                          |

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
