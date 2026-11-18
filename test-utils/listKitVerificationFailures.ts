import { isRecord } from './isRecord.ts';
import { isUnknownArray } from './isUnknownArray.ts';

/** The outcome of one `rdy verify --recursive --json` process, as `spawnSync` reports it. */
export interface VerifyRun {
  signal: string | null;
  status: number | null;
  stderr: string;
  stdout: string;
}

// Every verdict that `rdy verify --rebuild` reports per kit. A rebuild mismatch leaves the other three `ok`, so
// reporting a subset can name none of what failed.
const VERDICT_FIELDS = ['status', 'sourceStatus', 'inputsStatus', 'rebuildStatus'];

/**
 * Lists the failures of one recursive `rdy verify` run, each prefixed by the workspace that it belongs to, given
 * the workspaces that the caller found to have a kit. A kit workspace that the sweep did not verify is a failure,
 * as is any failure that the report does not attribute to a kit, which then includes the exit and stderr.
 */
export function listKitVerificationFailures(run: VerifyRun, kitWorkspaces: readonly string[]): string[] {
  const report = parseReport(run.stdout);
  if (report === undefined) return [`rdy verify did not report JSON (${describeExit(run)})`];

  const verifiedProjects = new Set(report.projects.map((project) => project.project));
  const failingKits = report.kits.filter((kit) => !isPassingKit(kit));
  const failures = [
    ...kitWorkspaces
      .filter((workspace) => !verifiedProjects.has(workspace))
      .map((workspace) => `${workspace}: not verified by the recursive sweep`),
    ...failingKits.map((kit) => `${kit.project}: ${kit.name} (${describeVerdicts(kit)})`),
    ...report.projects
      .filter((project) => !project.passed && failingKits.every((kit) => kit.project !== project.project))
      .map((project) => `${project.project}: rdy reported a failure without naming a kit (${describeExit(run)})`),
  ];

  if (failures.length === 0 && (run.status !== 0 || run.signal !== null)) {
    failures.push(`rdy verify failed without a failing project (${describeExit(run)})`);
  }

  return failures.toSorted((a, b) => a.localeCompare(b));
}

// region | Helpers

interface KitEntry {
  name: string;
  project: string;
  verdicts: Record<string, unknown>;
}

interface ProjectEntry {
  passed: boolean;
  project: string;
}

/** Names how the process ended, followed by its stderr when it wrote any. */
function describeExit(run: VerifyRun): string {
  const ending = run.status === null ? `signal ${run.signal ?? 'unknown'}` : `exit ${String(run.status)}`;
  const stderr = run.stderr.trim();
  return stderr === '' ? ending : `${ending}; stderr: ${stderr}`;
}

/** Lists a kit's verdicts as reported, naming any that the report omits so that its absence is visible. */
function describeVerdicts(kit: KitEntry): string {
  return VERDICT_FIELDS.map((field) => `${field}=${readVerdict(kit.verdicts[field])}`).join(', ');
}

/** Reports whether every verdict of a kit is `ok`, counting an omitted verdict as a failure. */
function isPassingKit(kit: KitEntry): boolean {
  return VERDICT_FIELDS.every((field) => kit.verdicts[field] === 'ok');
}

/** Reads a kit entry of the report, naming a missing name or project rather than dropping the entry. */
function parseKit(value: Record<string, unknown>): KitEntry {
  return {
    name: typeof value['name'] === 'string' ? value['name'] : 'unnamed kit',
    project: typeof value['project'] === 'string' ? value['project'] : 'unknown project',
    verdicts: value,
  };
}

/** Reads a project entry of the report, or nothing when it does not name a project. */
function parseProject(value: Record<string, unknown>): ProjectEntry | undefined {
  const project = value['project'];
  return typeof project === 'string' ? { passed: value['passed'] === true, project } : undefined;
}

/** Reads the kit and project lists of a JSON report, or nothing when stdout does not contain one. */
function parseReport(stdout: string): { kits: KitEntry[]; projects: ProjectEntry[] } | undefined {
  let report: unknown;
  try {
    report = JSON.parse(stdout);
  } catch {
    return undefined;
  }

  const kits = isRecord(report) ? report['kits'] : undefined;
  const projects = isRecord(report) ? report['projects'] : undefined;
  if (!isUnknownArray(kits) || !isUnknownArray(projects)) return undefined;

  return {
    kits: kits.filter((kit) => isRecord(kit)).map((kit) => parseKit(kit)),
    projects: projects
      .filter((project) => isRecord(project))
      .map((project) => parseProject(project))
      .filter((project) => project !== undefined),
  };
}

/** Names a verdict, or its absence, without stringifying a shape never promised by the report. */
function readVerdict(value: unknown): string {
  return typeof value === 'string' ? value : 'unreported';
}

// endregion | Helpers
