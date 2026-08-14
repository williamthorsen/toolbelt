/**
 * Adoption checks for a project consuming @williamthorsen/toolbelt.vitest.
 *
 * The kit ships inside the package, so it runs only where the package is installed and always at the version
 * the consumer has. Installing the package is the consent these checks rest on.
 *
 * The checks take inventory rather than banning a pattern, and severity carries the judgment. A mock that does
 * not throw is a `warn`, because it lets a suite cover a path the process never reaches; a hand-rolled
 * throwing mock is a `recommend`, being a substitution rather than a correction. Nothing here is `error`.
 *
 * The kit holds wiring and filesystem access alone. What it reports lives in `src/readiness/`, where the
 * package's own suite covers it.
 */
import { type CheckOutcome, defineRdyKit } from 'readyup';
import { discoverWorkspaces, isGitRepo, readFile, runGit } from 'readyup/check-utils';

import { buildKindReport } from '../../src/readiness/buildKindReport.ts';
import type { ExitMockKind } from '../../src/readiness/classifyExitMock.ts';
import { listTestFiles } from '../../src/readiness/listTestFiles.ts';
import { PACKAGE_NAME } from '../../src/readiness/packageName.ts';
import { type ProjectSummary, summarizeSources } from '../../src/readiness/summarizeSources.ts';

const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/vitest#readme';

const NOT_A_REPO = 'the project is not a git working tree, and these checks read the files git tracks';
const NO_TESTS = 'the project holds no test files';
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
          name: 'No test declares its own process-exit sentinel error',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('sentinel-clone'),
          fix: `Delete the class named above and use throwOnProcessExit from ${PACKAGE_NAME}/candidate, whose ProcessExitError carries the code. One substitution retires the class and the mock together. Reference: ${README_URL}`,
        },
        {
          name: 'No test mocks process.exit without throwing',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('non-throwing'),
          fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate. A mock that returns lets execution continue past the exit, so the test asserts against a path the process never reaches, and nothing reports it.`,
        },
        {
          name: 'No test hand-rolls a throwing or unreadable process-exit mock',
          severity: 'recommend',
          skip: skipUnlessProjectIsAccountable,
          check: () => reportKinds('throwing', 'unclassified'),
          fix: `Replace each mock named above with throwOnProcessExit from ${PACKAGE_NAME}/candidate, and assert the code on the thrown ProcessExitError. An unclassified mock is one these checks could not read: an implementation given as a bare reference, attached away from the spy's own call chain, or whose parentheses never balance.`,
        },
      ],
    },
  ],
});

// region | Helpers

/** Reads the project once, so three checks and their skips share one filesystem pass. */
function loadSummary(): Promise<ProjectSummary | undefined> {
  cache.summary ??= readProject();
  return cache.summary;
}

/**
 * Lists the project's tracked files, or nothing where it is not a git working tree.
 *
 * `-z` is what makes the list complete: without it git escapes a path holding a non-ASCII byte and wraps it in
 * quotes, which no reader can open, and that file would drop out of the sweep unreported.
 */
async function listTrackedPaths(): Promise<string[] | undefined> {
  if (!(await isGitRepo('.'))) return undefined;
  const tracked = await runGit('.', 'ls-files', '-z');
  return tracked.split('\0').filter((path) => path !== '');
}

/** Summarizes the project's test files, or nothing where they cannot be listed. */
async function readProject(): Promise<ProjectSummary | undefined> {
  const tracked = await listTrackedPaths();
  if (tracked === undefined) return undefined;

  return summarizeSources(
    listTestFiles(tracked).flatMap((path) => {
      const text = readFile(path);
      return text === undefined ? [] : [{ path, text }];
    }),
  );
}

/** Fails when the project holds mocks of the named kinds, naming each and how far adoption got. */
async function reportKinds(...kinds: readonly ExitMockKind[]): Promise<CheckOutcome> {
  const summary = await loadSummary();
  return summary === undefined ? { ok: true } : buildKindReport(summary, kinds);
}

/** Skips every check where the project cannot be read, or is this package's own repository. */
async function skipUnlessProjectIsAccountable(): Promise<false | string> {
  if (discoverWorkspaces().some((workspace) => workspace.name === PACKAGE_NAME)) return SELF;

  const summary = await loadSummary();
  if (summary === undefined) return NOT_A_REPO;
  return summary.sourceCount === 0 ? NO_TESTS : false;
}

// endregion | Helpers
