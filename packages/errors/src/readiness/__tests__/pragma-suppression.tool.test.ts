import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isRecord } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CLONE = [
  'export function toMessage(error) {',
  '  if (error instanceof Error) return error.message;',
  '  return String(error);',
  '}',
  '',
].join('\n');
const COERCE = 'export const wrapped = value instanceof Error ? value : new Error(String(value));\n';
const DESCRIBE_INLINE = 'export const message = error instanceof Error ? error.message : String(error);';
const NARROW = "export const isErrno = error instanceof Error && 'code' in error;\n";
const ADOPTER = [
  "import { describeError } from '@williamthorsen/toolbelt.errors';",
  'export const message = describeError(error);',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

interface CheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

describe('The errors adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${DESCRIBE_INLINE}\n`)).toStrictEqual([
      { count: 5, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 5, detail: 'src/describe.ts:1', id: 'no-inline-description', passedCount: 1 },
      { count: 5, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 5, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${DESCRIBE_INLINE} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 4, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 4, detail: undefined, id: 'no-inline-description', passedCount: 1 },
      { count: 4, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 4, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.errors/no-inline-description`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${DESCRIBE_INLINE} // rdy-ignore no-inline-description -- reviewed\n`)).toStrictEqual([
      { count: 5, detail: 'toMessage (src/clone.ts:2)', id: 'no-describe-clone', passedCount: 1 },
      { count: 4, detail: undefined, id: 'no-inline-description', passedCount: 1 },
      { count: 5, detail: 'src/narrow.ts:1', id: 'no-instanceof-error', passedCount: 1 },
      { count: 5, detail: 'src/coerce.ts:1', id: 'no-error-coercion', passedCount: 1 },
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
 * Runs the package's compiled kit over a fixture repo whose inline description carries the given source, and
 * reports what each check named and counted.
 *
 * A consumer gets the compiled bundle, so this exercises it; `kit-bundle-freshness` keeps it current with the sources
 * beneath it. A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report
 * reaches the layer that acts on one.
 */
function runKit(describeSource: string): CheckReport[] {
  using tree = createTrackedRepo({
    'package.json': MANIFEST,
    'src/clone.ts': CLONE,
    'src/coerce.ts': COERCE,
    'src/describe.ts': describeSource,
    'src/narrow.ts': NARROW,
    'src/report.ts': ADOPTER,
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
