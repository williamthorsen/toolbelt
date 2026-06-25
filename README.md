# PNPM Node monorepo

## Getting started

This project uses [pnpm](https://github.com/pnpm/pnpm) and NodeJS. The versions of each are set in `.tool-versions`.

If you don't have PNPM installed, it is recommended that you use the [ASDF runtime manager](https://asdf-vm.com/) to install it. For alternative methods, see the [pnpm installation instructions](https://pnpm.io/installation).

```shell
# Install ASDF runtime-version manager
git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.10.2
# OR (not tested)
brew install asdf

# Install PNPM
asdf plugin add pnpm
asdf install pnpm 7.21.0
```

You can also use ASDF to install the correct version of Node:

```shell
asdf plugin add nodejs
asdf install nodejs 18.12.1
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

Packages are published from CI by the release workflow (`.github/workflows/release.yaml`); there is no local publish command. Trigger a release from the workflow's manual `workflow_dispatch`, optionally scoping it with the `only` and `bump` inputs.
