/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.cli.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest.
 *
 * The checks take inventory rather than banning a pattern: Hand-rolled argument parsing is correct code that the
 * package's parser and command runner express better, so both report at `recommend`. Nothing here is `warn`,
 * because none of it is a defect.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSourceOrBin } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listParserSites } from '../../src/readiness/listParserSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.cli';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/cli#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listParserSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project contains no JavaScript or TypeScript sources outside its tests',
  packageName: PACKAGE_NAME,
  // A command-line parser usually lives in a runner under `bin/` or `src/bin/`, which the other kits exempt as a
  // bootstrap wrapper. A wrapper that only forwards its arguments contains neither idiom.
  pathFilter: isAdoptableSourceOrBin,
  checks: [
    {
      name: 'No source parses arguments with the parseArgs of node:util',
      id: 'no-node-parse-args',
      kinds: ['node-parse-args'],
      severity: 'recommend',
      fix: `Replace the parseArgs call named above with parseArgs from ${PACKAGE_NAME}/candidate, which parses strictly against a schema of flags and operands, infers their types from it, narrows a value to its choices, and reports every rejection as a ParseError. Where the code around the call also writes help text or dispatches subcommands, define each command with defineCommand and group them with defineGroup, then run the tree with runCli, which renders help from the same definitions and resolves to the exit code. Reference: ${README_URL}`,
    },
    {
      name: 'No source compares arguments against flag names by hand',
      id: 'no-hand-rolled-flag-scan',
      kinds: ['flag-scan'],
      severity: 'recommend',
      fix: `Replace the comparisons in the function named above by declaring its flags in a schema: define the command with defineCommand from ${PACKAGE_NAME}/candidate, group commands with defineGroup, and run the tree with runCli. runCli intercepts -h and --help at every level, prints the version for -V and --version at the root when its version option is set, renders help from the definitions, and reports a usage error with a pointer to help. Reference: ${README_URL}`,
    },
  ],
});
