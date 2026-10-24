#!/usr/bin/env bash
set -euo pipefail

# check-vitest-compat.sh: Runs toolbelt.vitest's suite and typecheck on another Vitest major.
#
# Installs the latest release of the given Vitest major as a devDependency of
# @williamthorsen/toolbelt.vitest alone, then runs the package's tests with Vitest directly and its
# typecheck. An import-free vitest.config.ts written into the package stops Vitest from loading the
# root config, whose nmr factory imports `vitest/config` from the root's Vitest major. The install
# and that config rewrite the working tree, so the script runs only when CI is set, on a runner that
# is discarded afterwards. Run it after the workspace is built.
#
# Usage:
#   check-vitest-compat.sh <major>
#   check-vitest-compat.sh --help

PROG="$(basename "$0")"
readonly PROG
readonly PACKAGE='@williamthorsen/toolbelt.vitest'

# Main flow
main() {
  # Show help
  if [[ "${1:-}" == "--help" ]]; then
    show_usage 0
  fi

  # Validate arguments
  if [[ $# -ne 1 || ! "$1" =~ ^[0-9]+$ ]]; then
    echo "$PROG: Expected one argument, a Vitest major version such as 4" >&2
    show_usage
  fi
  local major="$1"

  if [[ -z "${CI:-}" ]]; then
    echo "$PROG: Refusing to run outside CI: The install rewrites $PACKAGE's manifest and the lockfile" >&2
    exit 1
  fi

  # Check dependencies
  if ! command -v pnpm &>/dev/null; then
    echo "$PROG: Required command 'pnpm' not found" >&2
    exit 127
  fi

  local repo_dir package_dir
  repo_dir="$(cd "$(dirname "$0")" && git rev-parse --show-toplevel)"
  package_dir="${repo_dir:?}/packages/vitest"

  # Install the requested major for the package alone
  echo "$PROG: Installing vitest@$major for $PACKAGE"
  pnpm --dir "$repo_dir" --filter "$PACKAGE" add --save-dev "vitest@$major"
  echo "$PROG: Resolved vitest $(node --print "require('$package_dir/node_modules/vitest/package.json').version")"

  # Isolate the run from the root config
  printf 'export default {};\n' >"$package_dir/vitest.config.ts"

  # Run the suite and the typecheck
  pnpm --dir "$package_dir" exec vitest run
  pnpm --dir "$package_dir" exec nmr typecheck
}

# region | Helper functions

# Displays command-line syntax: to stdout for a help request (exit 0), to stderr otherwise.
show_usage() {
  local code="${1:-2}" fd=2
  ((code == 0)) && fd=1
  cat >&"$fd" <<USAGE
Runs toolbelt.vitest's suite and typecheck on another Vitest major. Runs only when CI is set.

Usage:
  $PROG <major>
  $PROG --help

Arguments:
  <major>      Vitest major version to install, such as 4 (required)

Options:
  --help       Show this help

Dependencies:
  pnpm         Installs Vitest and runs the checks

Examples:
  CI=true $PROG 4
USAGE
  exit "$code"
}
# endregion | Helper functions

main "$@"
