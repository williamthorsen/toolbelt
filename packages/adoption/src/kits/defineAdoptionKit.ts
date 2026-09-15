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
  /** The symbol defined by the site, where it defines one worth naming in place of the location. */
  symbol?: string;
}

export type AdoptionCheck<Kind extends string> = AdoptionCheckFields<Kind> & CheckScope;

export interface AdoptionKitSpec<Kind extends string> {
  /** `NoInfer` fixes `Kind` to what `detect` produces, so each check's `kinds` is checked against it. */
  checks: ReadonlyArray<AdoptionCheck<NoInfer<Kind>>>;
  description: string;
  /**
   * Lists a source's sites. Blank the text with `blankNonCode` before the anchor scan, or an idiom written in a
   * comment or a literal reports as one written in code. What `countPackageUsage` reads must stay unblanked:
   * It matches the import specifier, which is a string literal.
   */
  detect: (text: string) => ReadonlyArray<AdoptionSite<Kind>>;
  /** The package's own callable exports. A call to one of them counts toward adoption. */
  exportNames: readonly string[];
  /**
   * Why a check declaring no scope of its own does not apply to a project in which the path filter matched
   * nothing.
   */
  noSourcesReason: string;
  packageName: string;
  /** The paths from which a check declaring no scope of its own reports its kinds. */
  pathFilter: PathFilter;
}

interface AdoptionCheckFields<Kind extends string> {
  fix: string;
  /**
   * What an `rdy-ignore` pragma names to suppress this check's findings alone, the runner namespacing it under
   * the publishing package. Required, though readyup's own field is optional: A check that declares none can
   * be silenced only along with every other check on the line, and nothing reports the loss.
   */
  id: string;
  /** The kinds reported by this check. A site of any other kind counts toward the denominator alone. */
  kinds: readonly Kind[];
  name: string;
  severity?: Severity;
}

/**
 * The paths from which a check reports its kinds, and why the check does not apply where the project holds none
 * of them. A check declares both or neither, and one declaring neither takes the kit's.
 */
type CheckScope = Scope | { noSourcesReason?: undefined; pathFilter?: undefined };

interface ProjectSummary<Kind extends string> {
  adoptedCount: number;
  findings: Array<AdoptionSite<Kind> & { path: string }>;
  sources: readonly ProjectSource[];
}

interface Scope {
  noSourcesReason: string;
  pathFilter: PathFilter;
}

const NOT_A_REPO = 'the project is not a git working tree, and these checks read the files that git tracks';
/** What a check reports where the project could not be read. The runner resolves it to a pass that contains nothing. */
const NOTHING_TO_REPORT: FindingOutcome = { findings: [] };

/**
 * Assembles a package's adoption checks into a kit, given the detector and the checks that read it.
 *
 * A kit built here holds its detector and its advice and nothing else: The source sweep, the adoption count,
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
  const adoptedPackage = { exportNames: spec.exportNames, packageName: spec.packageName };
  const kitScope: Scope = { noSourcesReason: spec.noSourcesReason, pathFilter: spec.pathFilter };
  const pathFiltersByKind = mapPathFiltersByKind();
  const sweptPathFilters = [
    ...new Set([spec.pathFilter, ...spec.checks.map((check) => resolveScope(check).pathFilter)]),
  ];

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
          skip: () => skipUnlessProjectHoldsSources(resolveScope(check)),
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
   * it and takes the site out of every one of their fractions -- the loss that `id` is required to prevent,
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

  /** Reports whether any check reads a path, which puts it in the kit's one sweep. */
  function isSweptPath(path: string): boolean {
    return sweptPathFilters.some((pathFilter) => pathFilter(path));
  }

  /** Reads the project once, so every check and its skip share one sweep. */
  function loadSummary(): Promise<ProjectSummary<Kind> | undefined> {
    cache.summary ??= readProject();
    return cache.summary;
  }

  /**
   * Maps each kind named by a check to the path filter of that check's scope.
   *
   * Throws where checks naming one kind read it through different filters: A site of that kind would be kept for
   * one check and dropped for the other, and the checks would no longer share a denominator.
   */
  function mapPathFiltersByKind(): Map<Kind, PathFilter> {
    const pathFilters = new Map<Kind, PathFilter>();
    const conflicted = new Set<Kind>();
    for (const check of spec.checks) {
      const { pathFilter } = resolveScope(check);
      for (const kind of check.kinds) {
        const assigned = pathFilters.get(kind);
        if (assigned !== undefined && assigned !== pathFilter) conflicted.add(kind);
        pathFilters.set(kind, pathFilter);
      }
    }

    if (conflicted.size > 0) {
      const kinds = [...conflicted].toSorted().join(', ');
      throw new Error(`${spec.packageName}'s kit reads one kind through more than one path filter: ${kinds}`);
    }
    return pathFilters;
  }

  /**
   * Summarizes the project's swept sources, or nothing where it is not a git working tree. A site is kept only in a
   * source accepted by the path filter for its kind, so every check's report holds the same sites.
   */
  async function readProject(): Promise<ProjectSummary<Kind> | undefined> {
    const sources = await readTrackedSources(isSweptPath);
    if (sources === undefined) return undefined;

    return {
      adoptedCount: countPackageUsage(sources, adoptedPackage),
      findings: sources.flatMap((source) =>
        spec
          .detect(source.text)
          .filter((site) => (pathFiltersByKind.get(site.kind) ?? spec.pathFilter)(source.path))
          .map((site) => ({ ...site, path: source.path })),
      ),
      sources,
    };
  }

  /**
   * Reports every site held by the project, marking those of the named kinds and how far adoption got. A site
   * inside the declaration exported by the package under one of its adopted names is dropped from the report
   * altogether, because the implementation of an idiom cannot adopt itself.
   *
   * The runner reads the verdict, the detail, and the fraction off the report, so a pragma contained in the
   * sources is honored where it is written rather than in each kit.
   */
  async function reportKinds(kinds: readonly Kind[]): Promise<FindingOutcome> {
    const summary = await loadSummary();
    if (summary === undefined) return NOTHING_TO_REPORT;

    return buildFindingReport({
      adoptedCount: summary.adoptedCount,
      findings: summary.findings,
      ownImplementation: { ...adoptedPackage, sources: summary.sources },
      shouldReport: (finding) => kinds.includes(finding.kind),
    });
  }

  /** Returns the scope declared by a check, or the kit's where it declares none. */
  function resolveScope(check: AdoptionCheck<Kind>): Scope {
    return check.pathFilter === undefined
      ? kitScope
      : { noSourcesReason: check.noSourcesReason, pathFilter: check.pathFilter };
  }

  /** Skips a check where the project cannot be read, or holds no swept source matched by the check's scope. */
  async function skipUnlessProjectHoldsSources(scope: Scope): Promise<SkipResult> {
    const summary = await loadSummary();
    if (summary === undefined) return NOT_A_REPO;
    return summary.sources.some((source) => scope.pathFilter(source.path)) ? false : scope.noSourcesReason;
  }

  // endregion | Helpers
}
