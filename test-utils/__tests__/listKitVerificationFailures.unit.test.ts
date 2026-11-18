import { describe, expect, it } from 'vitest';

import { listKitVerificationFailures, type VerifyRun } from '../listKitVerificationFailures.ts';

const OK_VERDICTS = { status: 'ok', sourceStatus: 'ok', inputsStatus: 'ok', rebuildStatus: 'ok' };

describe(listKitVerificationFailures, () => {
  it('returns nothing when every kit workspace passes', () => {
    const run = buildRun({
      kits: [{ name: 'default', project: 'packages/a', ...OK_VERDICTS }],
      projects: [{ project: 'packages/a', passed: true }],
    });

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([]);
  });

  it('names a failing kit with every verdict, marking an omitted one', () => {
    const run = buildRun(
      {
        kits: [{ name: 'default', project: 'packages/a', status: 'ok', sourceStatus: 'ok', inputsStatus: 'ok' }],
        projects: [{ project: 'packages/a', passed: false }],
      },
      { status: 1 },
    );

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([
      'packages/a: default (status=ok, sourceStatus=ok, inputsStatus=ok, rebuildStatus=unreported)',
    ]);
  });

  it('reports a failing project without a failing kit, with its exit and stderr', () => {
    const run = buildRun(
      {
        kits: [{ name: 'default', project: 'packages/a', ...OK_VERDICTS }],
        projects: [{ project: 'packages/a', passed: false }],
      },
      { status: 1, stderr: 'uncompiled: extra.ts\n' },
    );

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([
      'packages/a: rdy reported a failure without naming a kit (exit 1; stderr: uncompiled: extra.ts)',
    ]);
  });

  it('reports a kit workspace that the sweep did not verify', () => {
    const run = buildRun({
      kits: [{ name: 'default', project: 'packages/a', ...OK_VERDICTS }],
      projects: [{ project: 'packages/a', passed: true }],
    });

    expect(listKitVerificationFailures(run, ['packages/a', 'packages/b'])).toStrictEqual([
      'packages/b: not verified by the recursive sweep',
    ]);
  });

  it.each([
    { label: 'unparseable stdout', stdout: 'Error: boom' },
    { label: 'a report without a project list', stdout: JSON.stringify({ kits: [] }) },
  ])('reports $label with the signal and stderr', ({ stdout }) => {
    const run: VerifyRun = { signal: 'SIGKILL', status: null, stderr: 'killed\n', stdout };

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([
      'rdy verify did not report JSON (signal SIGKILL; stderr: killed)',
    ]);
  });

  it('reports a non-zero exit whose report names no failure', () => {
    const run = buildRun(
      {
        kits: [{ name: 'default', project: 'packages/a', ...OK_VERDICTS }],
        projects: [{ project: 'packages/a', passed: true }],
      },
      { status: 2 },
    );

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([
      'rdy verify failed without a failing project (exit 2)',
    ]);
  });

  it('reports the exit and stderr of a failed run that verified no project', () => {
    const run = buildRun({ kits: [], projects: [] }, { status: 1, stderr: 'config error\n' });

    expect(listKitVerificationFailures(run, ['packages/a'])).toStrictEqual([
      'packages/a: not verified by the recursive sweep',
      'rdy verify failed without a failing project (exit 1; stderr: config error)',
    ]);
  });
});

// region | Helpers

/** Builds a run whose stdout is the given report, exiting 0 unless overridden. */
function buildRun(report: unknown, overrides: Partial<VerifyRun> = {}): VerifyRun {
  return { signal: null, status: 0, stderr: '', stdout: JSON.stringify(report), ...overrides };
}

// endregion | Helpers
