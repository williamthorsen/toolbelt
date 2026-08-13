/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.errors.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * the consumer has. Installing the package is the consent these checks rest on: a lint rule reaching every
 * repository would press the same opinion on projects that never asked for it.
 *
 * The checks take inventory rather than banning a pattern. Every `instanceof Error` in the project is
 * accounted for and named, and severity carries the judgment: a hand-rolled description is a `warn`, a
 * narrowing that a guard would express better is a `recommend`. Nothing here is `error`, because none of it
 * breaks the package -- it reports how far adoption got.
 *
 * The kit holds wiring and filesystem access alone. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it.
 */
import { type CheckOutcome, defineRdyKit } from 'readyup';
import { discoverWorkspaces, isGitRepo, readFile, runGit } from 'readyup/check-utils';

import { buildKindReport } from '../../src/readiness/buildKindReport.ts';
import type { ErrorSiteKind } from '../../src/readiness/listErrorSites.ts';
import { listSourceFiles } from '../../src/readiness/listSourceFiles.ts';
import { PACKAGE_NAME } from '../../src/readiness/packageName.ts';
import { type ProjectSummary, summarizeSources } from '../../src/readiness/summarizeSources.ts';

const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme';

const NOT_A_REPO = 'the project is not a git working tree, and these checks read the files git tracks';
const NO_SOURCES = 'the project holds no JavaScript or TypeScript sources outside the exempt paths';
const SELF = 'this project publishes the package these checks are for';

// Held for the life of one `rdy` run, which is one process targeting one project.
const cache: { summary?: Promise<ProjectSummary | undefined> } = {};

export default defineRdyKit({
  description: `Adoption checks for a project consuming ${PACKAGE_NAME}`,
  defaultSeverity: 'warn',
  checklists: [
    {
      name: 'adoption',
      checks: [
        {
          name: 'No source defines its own description helper',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('describe-clone'),
          fix: `Delete the function named above and import describeError from ${PACKAGE_NAME}. One import retires the whole helper. Reference: ${README_URL}`,
        },
        {
          name: 'No source describes a thrown value inline',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('describe-inline'),
          fix: `Replace each expression named above with describeError, imported from ${PACKAGE_NAME}. A domain-literal fallback discards what was thrown; describeError keeps it.`,
        },
        {
          name: 'No source narrows a thrown value by hand',
          severity: 'recommend',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('assert', 'narrow'),
          fix: `Use isError from ${PACKAGE_NAME}, or assertIsError from ${PACKAGE_NAME}/candidate where the narrowing throws. Both recognize an Error crossing a realm boundary, which a bare instanceof test reports as false.`,
        },
        {
          name: 'No source coerces a thrown value to an Error by hand',
          severity: 'recommend',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('coerce'),
          fix: `${PACKAGE_NAME} publishes no coercer, so this reports an unmet need rather than a substitution. Raise it at ${README_URL} if the sites above are worth one.`,
        },
      ],
    },
  ],
});

// region | Helpers

/** Reads the project once, so four checks and their skips share one filesystem pass. */
function loadSummary(): Promise<ProjectSummary | undefined> {
  cache.summary ??= readProject();
  return cache.summary;
}

/**
 * Lists the project's tracked files, or nothing where it is not a git working tree.
 *
 * `-z` is what makes the list complete: without it git escapes a path holding a non-ASCII byte and wraps it in
 * quotes, which no reader can open, and that source would drop out of the sweep unreported.
 */
async function listTrackedPaths(): Promise<string[] | undefined> {
  if (!(await isGitRepo('.'))) return undefined;
  const tracked = await runGit('.', 'ls-files', '-z');
  return tracked.split('\0').filter((path) => path !== '');
}

/** Summarizes the project's sources, or nothing where the files cannot be listed. */
async function readProject(): Promise<ProjectSummary | undefined> {
  const tracked = await listTrackedPaths();
  if (tracked === undefined) return undefined;

  return summarizeSources(
    listSourceFiles(tracked).flatMap((path) => {
      const text = readFile(path);
      return text === undefined ? [] : [{ path, text }];
    }),
  );
}

/** Fails when the project holds sites of the named kinds, naming each and how far adoption got. */
async function reportKinds(...kinds: readonly ErrorSiteKind[]): Promise<CheckOutcome> {
  const summary = await loadSummary();
  return summary === undefined ? { ok: true } : buildKindReport(summary, kinds);
}

/** Skips every check where the project cannot be read, or is this package's own repository. */
async function skipUnlessProjectIsAccountable(): Promise<false | string> {
  if (discoverWorkspaces().some((workspace) => workspace.name === PACKAGE_NAME)) return SELF;

  const summary = await loadSummary();
  if (summary === undefined) return NOT_A_REPO;
  return summary.sourceCount === 0 ? NO_SOURCES : false;
}

// endregion | Helpers
