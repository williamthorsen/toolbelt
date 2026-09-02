import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isRecord } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const RECORD = "export const ok = typeof value === 'object' && value !== null;";
const OWN_PROPERTY = 'export const has = Object.prototype.hasOwnProperty.call(target, key);\n';
const STRINGIFY = 'export const same = JSON.stringify(a) === JSON.stringify(b);\n';
const ADOPTER = "import { isRecord } from '@williamthorsen/toolbelt.objects';\nisRecord(value);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

interface CheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

describe('The objects adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${RECORD}\n`)).toStrictEqual([
      { count: 4, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 4, detail: 'src/guard.ts:1', id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 4, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${RECORD} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 3, detail: undefined, id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 3, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source carries no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.objects/no-hand-rolled-record-guard`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${RECORD} // rdy-ignore no-hand-rolled-record-guard -- reviewed\n`)).toStrictEqual([
      { count: 4, detail: 'src/has.ts:1', id: 'no-hand-rolled-own-property', passedCount: 1 },
      { count: 3, detail: undefined, id: 'no-hand-rolled-record-guard', passedCount: 1 },
      { count: 4, detail: 'src/same.ts:1', id: 'no-stringify-comparison', passedCount: 1 },
    ]);
  });
});

// region | Helpers

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
  if (!isRecord(check) || !isRecord(progress)) throw new Error('the report holds a check carrying no fraction');

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
 * Runs the package's compiled kit over a fixture repo holding the given record-guard source, and reports what
 * each check named and counted.
 *
 * The compiled bundle is what a consumer gets, so it is what this exercises; `kit-bundle-freshness` is what
 * keeps it current with the sources beneath it. A pragma is honored by the runner rather than by the kit, so
 * only a run can show that a kit's report reaches the layer that acts on one.
 */
function runKit(recordSource: string): CheckReport[] {
  using tree = createTrackedRepo({
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/guard.ts': recordSource,
    'src/has.ts': OWN_PROPERTY,
    'src/same.ts': STRINGIFY,
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
