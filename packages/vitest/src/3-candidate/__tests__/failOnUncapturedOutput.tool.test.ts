import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { failOnUncapturedOutput } from '../failOnUncapturedOutput.ts';

const FIXTURE_DIR = fileURLToPath(new URL('fixtures/failOnUncapturedOutput/', import.meta.url));
const VITEST_CLI = path.join(path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs');

describe(failOnUncapturedOutput, () => {
  it('fails each test whose output no capture took, passes the captured one, and keeps the output off the terminal', () => {
    const run = runFixture();
    const report = parseReport(run.stdout);
    const failures = report.failureMessages.join('\n');

    expect(run.status).not.toBe(0);
    expect(report.numFailedTests).toBe(3);
    expect(report.numPassedTests).toBe(1);
    for (const expected of [
      'stderr: "UNCAPTURED-OUTPUT',
      'stderr: "FINISH-HOOK-OUTPUT',
      'stdout: "AFTER-EACH-OUTPUT',
    ]) {
      expect(failures).toContain(expected);
    }
    expect(run.stderr + run.stdout).not.toMatch(/(?:UNCAPTURED|FINISH-HOOK|AFTER-EACH)-OUTPUT\n/u);
  });
});

// region | Helpers

interface FixtureReport {
  failureMessages: string[];
  numFailedTests: number;
  numPassedTests: number;
}

/** Reports whether a parsed value has the fields of Vitest's JSON report that the test reads. */
function isReport(value: unknown): value is {
  numFailedTests: number;
  numPassedTests: number;
  testResults: Array<{ assertionResults: Array<{ failureMessages: string[] }> }>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'numFailedTests' in value &&
    typeof value.numFailedTests === 'number' &&
    'numPassedTests' in value &&
    typeof value.numPassedTests === 'number' &&
    'testResults' in value &&
    Array.isArray(value.testResults)
  );
}

/** Reads the counts and failure messages from Vitest's JSON report. */
function parseReport(stdout: string): FixtureReport {
  const report: unknown = JSON.parse(stdout);
  if (!isReport(report)) throw new Error(`Unexpected report shape: ${stdout.slice(0, 200)}`);

  return {
    failureMessages: report.testResults.flatMap((file) =>
      file.assertionResults.flatMap((test) => test.failureMessages),
    ),
    numFailedTests: report.numFailedTests,
    numPassedTests: report.numPassedTests,
  };
}

/** Runs Vitest on the fixture with its own config, so that the repo's config does not apply. */
function runFixture(): { status: number | null; stderr: string; stdout: string } {
  const result = spawnSync(
    process.execPath,
    [
      VITEST_CLI,
      'run',
      '--root',
      FIXTURE_DIR,
      '--config',
      path.join(FIXTURE_DIR, 'vitest.config.ts'),
      '--reporter=json',
    ],
    { cwd: FIXTURE_DIR, encoding: 'utf8' },
  );

  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

// endregion | Helpers
