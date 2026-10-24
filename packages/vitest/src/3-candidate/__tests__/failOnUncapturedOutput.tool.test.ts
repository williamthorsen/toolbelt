import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { createTempTree } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it } from 'vitest';

import { failOnUncapturedOutput } from '../failOnUncapturedOutput.ts';

const FIXTURE_DIR = fileURLToPath(new URL('fixtures/failOnUncapturedOutput/', import.meta.url));
const VITEST_CLI = path.join(path.dirname(createRequire(import.meta.url).resolve('vitest/package.json')), 'vitest.mjs');

describe(failOnUncapturedOutput, () => {
  it('fails each test whose output no capture took, passes the captured one, and keeps the output off the terminal', () => {
    using tree = createTempTree({});
    const run = runFixture(tree.resolve('report.json'));
    const report = parseReport(tree.readJson('report.json'));
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
    expect(fs.existsSync(path.join(FIXTURE_DIR, '.vitest'))).toBe(false);
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

/** Reads the counts and failure messages from Vitest's parsed JSON report. */
function parseReport(report: unknown): FixtureReport {
  if (!isReport(report)) throw new Error(`Unexpected report shape: ${JSON.stringify(report).slice(0, 200)}`);

  return {
    failureMessages: report.testResults.flatMap((file) =>
      file.assertionResults.flatMap((test) => test.failureMessages),
    ),
    numFailedTests: report.numFailedTests,
    numPassedTests: report.numPassedTests,
  };
}

/**
 * Runs Vitest on the fixture with its own config, so that the repo's config does not apply, and writes the JSON
 * report to `reportPath`: Vitest 5 writes it to a file even when no path is given, and Vitest 4 to stdout.
 */
function runFixture(reportPath: string): { status: number | null; stderr: string; stdout: string } {
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
      `--outputFile=${reportPath}`,
    ],
    { cwd: FIXTURE_DIR, encoding: 'utf8' },
  );

  return { status: result.status, stderr: result.stderr, stdout: result.stdout };
}

// endregion | Helpers
