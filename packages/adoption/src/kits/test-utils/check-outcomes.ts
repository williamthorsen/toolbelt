import { randomUUID } from 'node:crypto';

import { type FindingOutcome, isFlatChecklist, type OutcomeFinding, type RdyCheck, type RdyKit } from 'readyup';

/**
 * Imports the kit module at `kitUrl` afresh and lists its checks, as `listKitChecks` does. A kit keeps its project
 * sweep in its own closure, so a reused import would give every caller the first fixture repo's findings. A query
 * string unique to the call makes the module loader evaluate the kit module again, and with it the closure.
 */
export async function listFreshKitChecks(kitUrl: URL): Promise<readonly RdyCheck[]> {
  const freshUrl = new URL(kitUrl);
  freshUrl.searchParams.set('fresh', randomUUID());

  const kitModule: unknown = await import(/* @vite-ignore */ freshUrl.href);
  if (!hasKitExport(kitModule)) throw new Error('the module exports no kit');
  return listKitChecks(kitModule.default);
}

/**
 * Lists the checks of a kit's first checklist, in declaration order. Throws when that checklist is missing or
 * staged, so that an assertion over every check cannot pass on a kit that holds none.
 */
export function listKitChecks(kit: RdyKit): readonly RdyCheck[] {
  const [checklist] = kit.checklists;
  if (checklist === undefined || !isFlatChecklist(checklist)) throw new Error('the kit holds no flat checklist');
  return checklist.checks;
}

/**
 * Lists the sites named by a check, which are the ones that the runner renders into its detail. The rest of
 * the report counts toward the fraction and does nothing else.
 */
export function listReportedFindings(outcome: FindingOutcome): OutcomeFinding[] {
  return outcome.findings.filter((finding) => finding.reported);
}

/**
 * Runs a check and returns the report that it produced, which is the whole of what an adoption check declares:
 * The verdict, the detail, and the fraction are the runner's to derive, and are asserted where that
 * derivation is implemented.
 */
export async function runCheck(check: RdyCheck | undefined): Promise<FindingOutcome> {
  if (check === undefined) throw new Error('the kit holds no such check');
  const outcome = await check.check();
  if (typeof outcome === 'boolean' || !('findings' in outcome)) throw new Error('the check returned no report');
  return outcome;
}

/** Runs every check, as `runCheck` does, and returns their reports in the checks' order. */
export async function runEveryCheck(checks: readonly RdyCheck[]): Promise<FindingOutcome[]> {
  return Promise.all(checks.map((check) => runCheck(check)));
}

/** Runs a check's skip, which every adoption check declares. */
export async function runSkip(check: RdyCheck | undefined): Promise<false | string> {
  if (check?.skip === undefined) throw new Error('the check declares no skip');
  return check.skip();
}

/** Selects the check with the given id. Throws when no check has it, so that a renamed id cannot pass unnoticed. */
export function selectCheck(checks: readonly RdyCheck[], id: string): RdyCheck {
  const check = checks.find((candidate) => candidate.id === id);
  if (check === undefined) throw new Error(`the kit holds no check with id '${id}'`);
  return check;
}

/** Reduces a report to the two numbers from which the runner derives its fraction. */
export function summarizeFraction(outcome: FindingOutcome): {
  adoptedCount: number | undefined;
  findingCount: number;
} {
  return { adoptedCount: outcome.adoptedCount, findingCount: outcome.findings.length };
}

// region | Helpers

/** Reports whether a module's default export has the shape of a kit. */
function hasKitExport(value: unknown): value is { default: RdyKit } {
  if (typeof value !== 'object' || value === null || !('default' in value)) return false;
  const kit: unknown = value.default;
  return typeof kit === 'object' && kit !== null && 'checklists' in kit && Array.isArray(kit.checklists);
}

// endregion | Helpers
