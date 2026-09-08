import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isRecord } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const ADOPTER = [
  "import { isString } from '@williamthorsen/toolbelt.guards';",
  'export const named = isString(value);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

interface CheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

describe('The guards adoption kit, run through rdy', () => {
  // Every check counts the same two sites, and only the adopting call passes. A site of another check's kind
  // raises the denominator without raising the numerator, so the fraction reports how far adoption of the
  // package got rather than how clean one check is.
  it('names the site under its own check and counts it against every fraction', () => {
    expect(runKit(buildGuard(''))).toStrictEqual([
      { count: 2, detail: 'check (src/guard.ts:1)', id: 'no-assertion-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-predicate-clone', passedCount: 1 },
      { count: 2, detail: undefined, id: 'no-number-guard-clone', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from the detail and the fraction', () => {
    expect(runKit(buildGuard(' // rdy-ignore -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.guards/no-assertion-clone`.
  it('drops a site covered by a qualified pragma', () => {
    expect(runKit(buildGuard(' // rdy-ignore no-assertion-clone -- reviewed'))[0]).toStrictEqual({
      count: 1,
      detail: undefined,
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });

  it('leaves a site standing where the pragma names another check', () => {
    expect(runKit(buildGuard(' // rdy-ignore no-number-guard-clone -- reviewed'))[0]).toStrictEqual({
      count: 2,
      detail: 'check (src/guard.ts:1)',
      id: 'no-assertion-clone',
      passedCount: 1,
    });
  });
});

// region | Helpers

/** Builds a hand-rolled assertion whose head line carries the given trailing pragma. */
function buildGuard(pragma: string): string {
  return [
    `export function check(condition, message) {${pragma}`,
    '  if (!condition) throw new Error(message);',
    '}',
    '',
  ].join('\n');
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Reads each adoption check's id, detail, and fraction out of an `rdy run --json` report. */
function listCheckReports(report: string): CheckReport[] {
  const parsed: unknown = JSON.parse(report);

  return readFirstChecklistChecks(parsed).map((check) => readCheckReport(check));
}

/** Narrows one entry of the report to the fields on which these tests assert. */
function readCheckReport(check: unknown): CheckReport {
  const progress = isRecord(check) ? check['progress'] : undefined;
  if (!isRecord(check) || !isRecord(progress)) throw new Error('the report holds a check with no fraction');

  const { count, passedCount } = progress;
  const { detail, id } = check;
  if (typeof id !== 'string' || typeof count !== 'number' || typeof passedCount !== 'number') {
    throw new TypeError('the report describes a check in a shape that these tests cannot read');
  }

  return { count, detail: typeof detail === 'string' ? detail : undefined, id, passedCount };
}

/** Reaches the checks of the run's one checklist, the kit declaring a single one. */
function readFirstChecklistChecks(report: unknown): unknown[] {
  const kits = isRecord(report) ? report['kits'] : undefined;
  const kit = isUnknownArray(kits) ? kits[0] : undefined;
  const checklists = isRecord(kit) ? kit['checklists'] : undefined;
  const checklist = isUnknownArray(checklists) ? checklists[0] : undefined;
  const checks = isRecord(checklist) ? checklist['checks'] : undefined;
  if (!isUnknownArray(checks)) throw new Error('the run reported no adoption checks');

  return checks;
}

/**
 * Runs the package's compiled kit over a fixture repo holding the given guard source, and reports what each
 * check named and counted.
 *
 * A consumer gets the compiled bundle, so this exercises it; `kit-bundle-freshness` keeps it current with the
 * sources beneath it. A pragma is honored by the runner rather than by the kit, so only a run can show that a
 * kit's report reaches the layer that acts on one.
 */
function runKit(guardSource: string): CheckReport[] {
  using tree = createTrackedRepo({
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': guardSource,
  });

  const result = spawnSync(
    path.join(PACKAGE_DIR, 'node_modules', '.bin', 'rdy'),
    ['run', '--from', `dir:${path.join(PACKAGE_DIR, '.readyup', 'kits')}`, '--json'],
    { cwd: tree.dir, encoding: 'utf8' },
  );
  if (result.error !== undefined) throw result.error;
  if (result.stdout === '') throw new Error(`rdy reported nothing: ${result.stderr}`);

  return listCheckReports(result.stdout);
}

// endregion | Helpers
