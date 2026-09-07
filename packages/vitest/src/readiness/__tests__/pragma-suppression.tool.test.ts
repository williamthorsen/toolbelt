import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { createTrackedRepo } from '@williamthorsen/toolbelt.adoption/test-utils';
import { isRecord } from 'readyup/check-utils';
import { describe, expect, it } from 'vitest';

const MANIFEST = JSON.stringify({ name: 'fixture-project', version: '1.0.0' });
const CAPTURE = "vi.spyOn(console, 'log').mockImplementation((...args) => { lines.push(args); });\n";
const DISPOSAL = 'onTestFinished(() => tree[Symbol.dispose]());\n';
const LOSSY_CAPTURE = "vi.spyOn(console, 'error').mockImplementation((message) => { lines.push(message); });\n";
const NON_THROWING = "vi.spyOn(process, 'exit').mockImplementation(() => {});\n";
const READ = ["using silent = silenceConsole(['warn']);", 'expect(silent.warn.mock.calls).toHaveLength(1);', ''].join(
  '\n',
);
const SENTINEL_CLONE = [
  'class ExitError extends Error {}',
  "vi.spyOn(process, 'exit').mockImplementation((code) => {",
  '  throw new ExitError(code);',
  '});',
  '',
].join('\n');
const SILENCE = "vi.spyOn(console, 'warn').mockImplementation(() => {});";
const THROWING = ["vi.spyOn(process, 'exit').mockImplementation(() => {", "  throw new Error('exit');", '});', ''].join(
  '\n',
);
const ADOPTER = [
  "import { throwOnProcessExit } from '@williamthorsen/toolbelt.vitest';",
  'using _exit = throwOnProcessExit();',
  '',
].join('\n');
const PACKAGE_DIR = path.resolve(import.meta.dirname, '../../..');

interface CheckReport {
  count: number;
  detail: string | undefined;
  id: string;
  passedCount: number;
}

describe('The vitest adoption kit, run through rdy', () => {
  it('names every site and spans them all in one denominator', () => {
    expect(runKit(`${SILENCE}\n`)).toStrictEqual([
      { count: 9, detail: 'ExitError (src/sentinel.unit.test.ts:2)', id: 'no-exit-sentinel-clone', passedCount: 1 },
      { count: 9, detail: 'src/non-throwing.unit.test.ts:1', id: 'no-non-throwing-exit-mock', passedCount: 1 },
      { count: 9, detail: 'src/throwing.unit.test.ts:1', id: 'no-hand-rolled-exit-mock', passedCount: 1 },
      { count: 9, detail: 'src/lossy.unit.test.ts:1', id: 'no-lossy-console-capture', passedCount: 1 },
      { count: 9, detail: 'src/capture.unit.test.ts:1', id: 'no-hand-rolled-console-capture', passedCount: 1 },
      { count: 9, detail: 'src/silence.unit.test.ts:1', id: 'no-hand-rolled-console-silence', passedCount: 1 },
      { count: 9, detail: 'src/read.unit.test.ts:2', id: 'no-console-calls-read', passedCount: 1 },
      { count: 9, detail: 'src/dispose.unit.test.ts:1', id: 'no-hand-rolled-test-disposal', passedCount: 1 },
    ]);
  });

  it('drops a site covered by an unqualified pragma from every check’s detail and fraction', () => {
    expect(runKit(`${SILENCE} // rdy-ignore -- reviewed\n`)).toStrictEqual([
      { count: 8, detail: 'ExitError (src/sentinel.unit.test.ts:2)', id: 'no-exit-sentinel-clone', passedCount: 1 },
      { count: 8, detail: 'src/non-throwing.unit.test.ts:1', id: 'no-non-throwing-exit-mock', passedCount: 1 },
      { count: 8, detail: 'src/throwing.unit.test.ts:1', id: 'no-hand-rolled-exit-mock', passedCount: 1 },
      { count: 8, detail: 'src/lossy.unit.test.ts:1', id: 'no-lossy-console-capture', passedCount: 1 },
      { count: 8, detail: 'src/capture.unit.test.ts:1', id: 'no-hand-rolled-console-capture', passedCount: 1 },
      { count: 8, detail: undefined, id: 'no-hand-rolled-console-silence', passedCount: 1 },
      { count: 8, detail: 'src/read.unit.test.ts:2', id: 'no-console-calls-read', passedCount: 1 },
      { count: 8, detail: 'src/dispose.unit.test.ts:1', id: 'no-hand-rolled-test-disposal', passedCount: 1 },
    ]);
  });

  // A `dir:` kit source has no namespace, so the bare id stands. A consumer running the kit from the
  // installed package writes `toolbelt.vitest/no-hand-rolled-console-silence`.
  it('drops a site covered by a qualified pragma from the named check alone', () => {
    expect(runKit(`${SILENCE} // rdy-ignore no-hand-rolled-console-silence -- reviewed\n`)).toStrictEqual([
      { count: 9, detail: 'ExitError (src/sentinel.unit.test.ts:2)', id: 'no-exit-sentinel-clone', passedCount: 1 },
      { count: 9, detail: 'src/non-throwing.unit.test.ts:1', id: 'no-non-throwing-exit-mock', passedCount: 1 },
      { count: 9, detail: 'src/throwing.unit.test.ts:1', id: 'no-hand-rolled-exit-mock', passedCount: 1 },
      { count: 9, detail: 'src/lossy.unit.test.ts:1', id: 'no-lossy-console-capture', passedCount: 1 },
      { count: 9, detail: 'src/capture.unit.test.ts:1', id: 'no-hand-rolled-console-capture', passedCount: 1 },
      { count: 8, detail: undefined, id: 'no-hand-rolled-console-silence', passedCount: 1 },
      { count: 9, detail: 'src/read.unit.test.ts:2', id: 'no-console-calls-read', passedCount: 1 },
      { count: 9, detail: 'src/dispose.unit.test.ts:1', id: 'no-hand-rolled-test-disposal', passedCount: 1 },
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
 * Runs the package's compiled kit over a fixture repo whose console silence carries the given source, and
 * reports what each check named and counted.
 *
 * A consumer gets the compiled bundle, so this exercises it; `kit-bundle-freshness` keeps it current with the sources
 * beneath it. A pragma is honored by the runner rather than by the kit, so only a run can show that a kit's report
 * reaches the layer that acts on one.
 */
function runKit(silenceSource: string): CheckReport[] {
  using tree = createTrackedRepo({
    'package.json': MANIFEST,
    'src/capture.unit.test.ts': CAPTURE,
    'src/dispose.unit.test.ts': DISPOSAL,
    'src/exit.unit.test.ts': ADOPTER,
    'src/lossy.unit.test.ts': LOSSY_CAPTURE,
    'src/non-throwing.unit.test.ts': NON_THROWING,
    'src/read.unit.test.ts': READ,
    'src/sentinel.unit.test.ts': SENTINEL_CLONE,
    'src/silence.unit.test.ts': silenceSource,
    'src/throwing.unit.test.ts': THROWING,
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
