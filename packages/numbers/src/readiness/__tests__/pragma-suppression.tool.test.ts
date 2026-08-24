import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isRecord } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLAMP = 'export const bounded = Math.max(min, Math.min(max, value));';
const ROUND = 'export const rate = Math.round(value * 100) / 100;\n';
const RANDOM = 'export const roll = Math.floor(Math.random() * sides);\n';
const ADOPTER = "import { round } from '@williamthorsen/toolbelt.numbers/candidate';\nround(value, 2);\n";
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

interface CheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

describe('The numbers adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${CLAMP}\n`)).toStrictEqual([
      { count: 4, detail: 'src/bound.ts:1', id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 4, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 4, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
    ]);
  });

  it('drops a site an unqualified pragma covers from every check’s detail and fraction', () => {
    expect(runKit(`${CLAMP} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 3, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 3, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source carries no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.numbers/no-hand-rolled-clamp`.
  it('drops a site a qualified pragma covers from the named check alone', () => {
    expect(runKit(`${CLAMP} // rdy-ignore no-hand-rolled-clamp -- reviewed\n`)).toStrictEqual([
      { count: 3, detail: undefined, id: 'no-hand-rolled-clamp', passedCount: 1 },
      { count: 4, detail: 'src/rate.ts:1', id: 'no-hand-rolled-round', passedCount: 1 },
      { count: 4, detail: 'src/roll.ts:1', id: 'no-hand-rolled-random-integer', passedCount: 1 },
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

/** Narrows one entry of the report to the fields these tests assert on. */
function readCheckReport(check: unknown): CheckReport {
  const progress = isRecord(check) ? check['progress'] : undefined;
  if (!isRecord(check) || !isRecord(progress)) throw new Error('the report holds a check carrying no fraction');

  const { count, passedCount } = progress;
  const { detail, id } = check;
  if (typeof id !== 'string' || typeof count !== 'number' || typeof passedCount !== 'number') {
    throw new TypeError('the report describes a check in a shape these tests cannot read');
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
 * Runs the package's compiled kit over a fixture repo holding the given clamp source, and reports what each
 * check named and counted.
 *
 * The compiled bundle is what a consumer gets, so it is what this exercises; `kit-bundle-freshness` is what
 * keeps it current with the sources beneath it. A pragma is honored by the runner rather than by the kit, so
 * only a run can show that a kit's report reaches the layer that acts on one.
 */
function runKit(clampSource: string): CheckReport[] {
  using tree = createTrackedRepo({
    'package.json': MANIFEST,
    'src/adopter.ts': ADOPTER,
    'src/bound.ts': clampSource,
    'src/rate.ts': ROUND,
    'src/roll.ts': RANDOM,
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
