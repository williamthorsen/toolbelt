import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { isRecord } from 'readyup/check-utils';

import { createTrackedRepo } from './createTrackedRepo.ts';

// Adoption's own readyup, which the catalog pins to the version installed by every package with a kit.
const RDY_BIN_PATH = path.resolve(import.meta.dirname, '../../../node_modules/.bin/rdy');

/** What one check of an `rdy run --json` report named and counted. */
export interface KitCheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

/**
 * Runs a package's compiled kits over a tracked fixture repo holding the given entries, and lists what each check
 * of the first checklist named and counted.
 *
 * A consumer gets the compiled bundle, so this runs it; `kit-bundle-freshness` keeps it current with the sources
 * beneath it.
 */
export function listKitCheckReports(packageDir: string, entries: Record<string, string>): KitCheckReport[] {
  using tree = createTrackedRepo(entries);

  const result = spawnSync(
    RDY_BIN_PATH,
    ['run', '--from', `dir:${path.join(packageDir, '.readyup', 'kits')}`, '--json'],
    { cwd: tree.dir, encoding: 'utf8' },
  );
  if (result.error !== undefined) throw result.error;
  if (result.stdout === '') throw new Error(`rdy reported nothing: ${result.stderr}`);

  const report: unknown = JSON.parse(result.stdout);

  return readFirstChecklistChecks(report).map((check) => readCheckReport(check));
}

// region | Helpers

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Narrows one entry of the report to the fields on which a kit test asserts. */
function readCheckReport(check: unknown): KitCheckReport {
  const progress = isRecord(check) ? check['progress'] : undefined;
  if (!isRecord(check) || !isRecord(progress)) throw new Error('the report holds a check with no fraction');

  const { count, passedCount } = progress;
  const { detail, id } = check;
  if (typeof id !== 'string' || typeof count !== 'number' || typeof passedCount !== 'number') {
    throw new TypeError('the report describes a check in a shape that this reader cannot read');
  }

  return { count, detail: typeof detail === 'string' ? detail : undefined, id, passedCount };
}

/** Reaches the checks of the run's first checklist, throwing with rdy's own message where the kit did not load. */
function readFirstChecklistChecks(report: unknown): unknown[] {
  const kits = isRecord(report) ? report['kits'] : undefined;
  const kit = isUnknownArray(kits) ? kits[0] : undefined;
  const error = isRecord(kit) ? kit['error'] : undefined;
  const loadMessage = isRecord(error) ? error['message'] : undefined;
  if (typeof loadMessage === 'string') throw new Error(`rdy could not load the kit: ${loadMessage}`);

  const checklists = isRecord(kit) ? kit['checklists'] : undefined;
  const checklist = isUnknownArray(checklists) ? checklists[0] : undefined;
  const checks = isRecord(checklist) ? checklist['checks'] : undefined;
  if (!isUnknownArray(checks)) throw new Error('the run reported no adoption checks');

  return checks;
}

// endregion | Helpers
