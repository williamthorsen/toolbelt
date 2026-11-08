import { type FindingOutcome, isFlatChecklist, type OutcomeFinding, type RdyCheck, type RdyKit } from 'readyup';

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

/** Runs a check's skip, which every adoption check declares. */
export async function runSkip(check: RdyCheck | undefined): Promise<false | string> {
  if (check?.skip === undefined) throw new Error('the check declares no skip');
  return check.skip();
}

/** Reduces a report to the two numbers from which the runner derives its fraction. */
export function summarizeFraction(outcome: FindingOutcome): {
  adoptedCount: number | undefined;
  findingCount: number;
} {
  return { adoptedCount: outcome.adoptedCount, findingCount: outcome.findings.length };
}
