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
 */
import { type CheckOutcome, defineRdyKit, type Progress } from 'readyup';
import { discoverWorkspaces, isGitRepo, readFile, runGit } from 'readyup/check-utils';

import { type ErrorSiteKind, listErrorSites } from '../../src/readiness/listErrorSites.ts';
import { listSourceFiles } from '../../src/readiness/listSourceFiles.ts';

const PACKAGE_NAME = '@williamthorsen/toolbelt.errors';
const README_URL = 'https://github.com/williamthorsen/toolbelt/tree/main/packages/errors#readme';

const NO_SOURCES = 'the project holds no JavaScript or TypeScript sources outside the exempt paths';
const SELF = 'this project publishes the package these checks are for';

interface Finding {
  kind: ErrorSiteKind;
  line: number;
  path: string;
  symbol?: string;
}

interface Project {
  /** Calls the project already makes into this package, which is the numerator of every fraction. */
  adopted: number;
  findings: Finding[];
  sourceCount: number;
}

// Held for the life of one `rdy` run, which is one process targeting one project.
const cache: { project?: Promise<Project> } = {};

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

/** Names one finding by where it is, and by the helper it defines where it defines one. */
function describeFinding(finding: Finding): string {
  const location = `${finding.path}:${finding.line}`;
  return finding.symbol === undefined ? location : `${finding.symbol} (${location})`;
}

/** Counts calls to the package's exports in one source. */
function countCalls(text: string): number {
  return text.matchAll(/\b(?:assertIsError|chainError|describeError|isError)\s*\(/g).toArray().length;
}

/** Reads the project once, so four checks and their skips share one filesystem pass. */
function loadProject(): Promise<Project> {
  cache.project ??= readProject();
  return cache.project;
}

/** Lists the project's tracked files, which git already filters by the project's own ignore rules. */
async function listTrackedPaths(): Promise<string[]> {
  if (!(await isGitRepo('.'))) return [];
  const tracked = await runGit('.', 'ls-files');
  return tracked.split('\n').filter((path) => path !== '');
}

/** Classifies every hand-rolled site in the project, and counts how far adoption already got. */
async function readProject(): Promise<Project> {
  const paths = listSourceFiles(await listTrackedPaths());
  const sources = paths.flatMap((path) => {
    const text = readFile(path);
    return text === undefined ? [] : [{ path, text }];
  });

  return {
    adopted: sources.reduce((total, source) => total + countCalls(source.text), 0),
    findings: sources.flatMap((source) => listErrorSites(source.text).map((site) => ({ ...site, path: source.path }))),
    sourceCount: sources.length,
  };
}

/** Fails when the project holds sites of the named kinds, naming each and how far adoption got. */
async function reportKinds(...kinds: readonly ErrorSiteKind[]): Promise<CheckOutcome> {
  const project = await loadProject();
  const findings = project.findings.filter((finding) => kinds.includes(finding.kind));
  const progress: Progress = {
    type: 'fraction',
    passedCount: project.adopted,
    count: project.adopted + project.findings.length,
  };

  if (findings.length === 0) return { ok: true, progress };
  return { ok: false, detail: findings.map((finding) => describeFinding(finding)).join(', '), progress };
}

/** Skips every check where the project is this package's own repository, or holds nothing to read. */
async function skipUnlessProjectIsAccountable(): Promise<false | string> {
  if (discoverWorkspaces().some((workspace) => workspace.name === PACKAGE_NAME)) return SELF;
  return (await loadProject()).sourceCount === 0 ? NO_SOURCES : false;
}

// endregion | Helpers
