/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.errors.
 *
 * The kit is included in the package, so it runs only where the package is installed and always at the version
 * that the consumer has. Installing the package is the consent on which these checks rest: A lint rule applied to
 * every repository would impose the same opinion on projects that never asked for it.
 *
 * The checks take inventory rather than banning a pattern. Every `instanceof Error` in the project, and every
 * test of an error's `code` against `ENOENT` or `ENOTDIR`, is accounted for and named, and severity reports the
 * judgment: a hand-rolled helper or description is a `warn`, a narrowing that a guard would express better is a
 * `recommend`. Nothing here is `error`, because none of it
 * breaks the package: It reports how far adoption got.
 *
 * The kit declares what to look for and what to advise. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it, and how the looking is done lives in `packages/adoption`.
 */
import { defineAdoptionKit, isAdoptableSource } from '@williamthorsen/toolbelt.adoption';

import { ADOPTED_EXPORTS } from '../../src/readiness/adoptedExports.ts';
import { listErrorSites } from '../../src/readiness/listErrorSites.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.errors';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme';

export default defineAdoptionKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  detect: listErrorSites,
  exportNames: ADOPTED_EXPORTS,
  noSourcesReason: 'the project contains no JavaScript or TypeScript sources outside the exempt paths',
  packageName: PACKAGE_NAME,
  // A test constructs error shapes deliberately, and a bootstrap wrapper's hand-rolled handling keeps its
  // build-first message alive through an incomplete install.
  pathFilter: isAdoptableSource,
  checks: [
    {
      name: 'No source defines its own description helper',
      id: 'no-describe-clone',
      kinds: ['describe-clone'],
      fix: `Delete the function named above and import describeError from ${PACKAGE_NAME}. One import replaces the whole helper. Reference: ${README_URL}`,
    },
    {
      name: 'No source describes a thrown value inline',
      id: 'no-inline-description',
      kinds: ['describe-inline'],
      fix: `Replace each expression named above with describeError, imported from ${PACKAGE_NAME}. A domain-literal fallback discards what was thrown; describeError keeps it.`,
    },
    {
      name: 'No source narrows a thrown value by hand',
      id: 'no-instanceof-error',
      kinds: ['assert', 'narrow'],
      severity: 'recommend',
      fix: `Use isError from ${PACKAGE_NAME}, or assertIsError from ${PACKAGE_NAME}/candidate when the narrowing throws. Both recognize an Error crossing a realm boundary, which a bare instanceof test reports as false.`,
    },
    {
      name: 'No source coerces a thrown value to an Error by hand',
      id: 'no-error-coercion',
      kinds: ['coerce'],
      severity: 'recommend',
      fix: `${PACKAGE_NAME} publishes no coercer, so this reports an unmet need rather than a substitution. Raise it at ${README_URL} if the sites above are worth one.`,
    },
    {
      name: 'No source defines its own missing-path predicate',
      id: 'no-missing-path-clone',
      kinds: ['missing-path-clone'],
      fix: `Delete the function named above and import isMissingPathError from ${PACKAGE_NAME}/candidate. One import replaces the whole helper.`,
    },
    {
      name: 'No source tests for a missing path by hand',
      id: 'no-missing-path-test',
      kinds: ['missing-path-test'],
      severity: 'recommend',
      fix: `Replace each test named above with isMissingPathError, imported from ${PACKAGE_NAME}/candidate.`,
    },
    {
      name: 'No source tests for ENOENT or ENOTDIR alone',
      id: 'no-partial-missing-path-test',
      kinds: ['missing-path-partial'],
      severity: 'recommend',
      fix: `isMissingPathError, from ${PACKAGE_NAME}/candidate, treats ENOENT and ENOTDIR alike, so adopting it at a site named above also treats the other code as a missing path. Adopt it where that is the intent, and silence a site that tests one code on purpose with a pragma naming this check.`,
    },
  ],
});
