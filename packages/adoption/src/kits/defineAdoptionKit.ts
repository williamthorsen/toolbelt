import { defineRdyKit, type FindingOutcome, type RdyKit, type Severity, type SkipResult } from 'readyup';
import {
  buildFindingReport,
  countPackageUsage,
  type PathFilter,
  type ProjectSource,
  readTrackedSources,
} from 'readyup/check-utils';

export interface AdoptionSite<Kind extends string> {
  kind: Kind;
  line: number;
  /** The symbol the site defines, where it defines one worth naming in place of the location. */
  symbol?: string;
}

export interface AdoptionCheck<Kind extends string> {
  fix: string;
  /**
   * What an `rdy-ignore` pragma names to suppress this check's findings alone, the runner namespacing it under
   * the publishing package. Required, though readyup's own field is optional: a check that declares none can
   * be silenced only along with every other check on the line, and nothing reports the loss.
   */
  id: string;
  /** The kinds this check reports. A site of any other kind counts toward the denominator alone. */
  kinds: readonly Kind[];
  name: string;
  severity?: Severity;
}

export interface AdoptionKitSpec<Kind extends string> {
  checks: ReadonlyArray<AdoptionCheck<Kind>>;
  description: string;
  /**
   * Lists a source's sites. Blank the text with `blankNonCode` before the anchor scan, or an idiom written in a
   * comment or a literal reports as one written in code. What `countPackageUsage` reads must stay unblanked:
   * it matches the import specifier, which is a string literal.
   */
  detect: (text: string) => ReadonlyArray<AdoptionSite<Kind>>;
  /** The package's own callable exports, which is what adoption is counted in calls to. */
  exportNames: readonly string[];
  /** Why the checks do not apply to a project the path filter matched nothing in. */
  noSourcesReason: string;
  packageName: string;
  pathFilter: PathFilter;
}

interface ProjectSummary<Kind extends string> {
  adoptedCount: number;
  findings: Array<AdoptionSite<Kind> & { path: string }>;
  sources: readonly ProjectSource[];
}

const NOT_A_REPO = 'the project is not a git working tree, and these checks read the files git tracks';
/** What a check reports where the project could not be read. The runner resolves it to a pass carrying nothing. */
const NOTHING_TO_REPORT: FindingOutcome = { findings: [] };

/**
 * Assembles a package's adoption checks into a kit, given the detector and the checks that read it.
 *
 * A kit built here holds its detector and its advice and nothing else: the source sweep, the adoption count,
 * the exemption covering the package's own implementation, and the finding report are shared, so a package
 * adopting these checks declares what it looks for rather than how the looking is done.
 *
 * The summary is held per kit rather than per module, because two compiled kits can run in one process and one
 * kit's findings are not the other's. The sweep beneath it is cached in readyup, which a compiled kit leaves
 * unbundled, so several kits in one run still read each file once.
 *
 * @internal
 */
export function defineAdoptionKit<Kind extends string>(spec: AdoptionKitSpec<Kind>): RdyKit {
  assertCheckIdsAreUnique();

  const cache: { summary?: Promise<ProjectSummary<Kind> | undefined> } = {};
  const packageUsage = { exportNames: spec.exportNames, packageName: spec.packageName };

  return defineRdyKit({
    description: spec.description,
    defaultSeverity: 'warn',
    checklists: [
      {
        name: 'adoption',
        checks: spec.checks.map((check) => ({
          name: check.name,
          id: check.id,
          ...(check.severity !== undefined && { severity: check.severity }),
          skip: skipUnlessProjectHoldsSources,
          check: () => reportKinds(check.kinds),
          fix: check.fix,
        })),
      },
    ],
  });

  // region | Helpers

  /**
   * Throws where one id names more than one check, which readyup validates nowhere.
   *
   * A pragma is matched against each check's own accepted ids, so a shared id silences every check holding
   * it and takes the site out of every one of their fractions -- the loss `id` is required to prevent,
   * arriving from the other direction.
   */
  function assertCheckIdsAreUnique(): void {
    const seen = new Set<string>();
    const duplicated = new Set<string>();
    for (const { id } of spec.checks) {
      if (seen.has(id)) duplicated.add(id);
      seen.add(id);
    }

    if (duplicated.size > 0) {
      const ids = [...duplicated].toSorted().join(', ');
      throw new Error(`${spec.packageName}'s kit gives one id to more than one check: ${ids}`);
    }
  }

  /** Reads the project once, so every check and its skip share one sweep. */
  function loadSummary(): Promise<ProjectSummary<Kind> | undefined> {
    cache.summary ??= readProject();
    return cache.summary;
  }

  /** Summarizes the project's matching sources, or nothing where it is not a git working tree. */
  async function readProject(): Promise<ProjectSummary<Kind> | undefined> {
    const sources = await readTrackedSources(spec.pathFilter);
    if (sources === undefined) return undefined;

    return {
      adoptedCount: countPackageUsage(sources, packageUsage),
      findings: sources.flatMap((source) => spec.detect(source.text).map((site) => ({ ...site, path: source.path }))),
      sources,
    };
  }

  /**
   * Reports every site the project holds, marking those of the named kinds and how far adoption got. A site
   * inside the declaration the package exports under one of its adopted names is dropped from the report
   * altogether, because the implementation of an idiom cannot adopt itself.
   *
   * The runner reads the verdict, the detail, and the fraction off the report, so a pragma the sources carry
   * is honored where it is written rather than in each kit.
   */
  async function reportKinds(kinds: readonly Kind[]): Promise<FindingOutcome> {
    const summary = await loadSummary();
    if (summary === undefined) return NOTHING_TO_REPORT;

    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      ownImplementation: { ...packageUsage, sources: summary.sources },
      shouldReport: (finding) => kinds.includes(finding.kind),
    });
  }

  /** Skips every check where the project cannot be read, or holds no source the filter matched. */
  async function skipUnlessProjectHoldsSources(): Promise<SkipResult> {
    const summary = await loadSummary();
    if (summary === undefined) return NOT_A_REPO;
    return summary.sources.length === 0 ? spec.noSourcesReason : false;
  }

  // endregion | Helpers
}
