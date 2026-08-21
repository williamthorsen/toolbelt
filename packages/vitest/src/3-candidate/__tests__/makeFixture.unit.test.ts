/* eslint no-console: "off" */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { createTempTree, type TempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { captureStdio, pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, expectTypeOf, it as baseIt } from 'vitest';

import { makeFixture } from '../makeFixture.ts';
import { silenceConsole } from '../silenceConsole.ts';

const buildLog: string[] = [];
const disposalLog: string[] = [];
const aroundAllLog: string[] = [];
const fileHookLog: string[] = [];

const it = baseIt
  .extend(
    'perTest',
    makeFixture(() => makeProbe('per-test')),
  )
  .extend(
    'perFile',
    { scope: 'file' },
    makeFixture(() => makeProbe('per-file')),
  )
  .extend(
    'tree',
    { scope: 'file' },
    makeFixture(() => createTempTree({ 'src/main.ts': 'export {};\n' })),
  )
  .extend(
    'stdio',
    makeFixture(() => captureStdio({ isTty: false })),
  )
  .extend(
    'silent',
    makeFixture(() => silenceConsole(['warn'])),
  )
  .extend(
    'hookProbe',
    makeFixture(() => makeProbe('hook-probe')),
  )
  .extend(
    'hookFileProbe',
    { scope: 'file' },
    makeFixture(() => makeProbe('hook-file-probe')),
  );

// A second extended API, carrying none of the fixtures above.
// eslint-disable-next-line vitest/consistent-test-it -- the lone `.extend` is a declaration; the test it declares sits in a `describe`.
const otherIt = baseIt.extend(
  'unshared',
  makeFixture(() => makeProbe('unshared')),
);

// Registered at file level, so it wraps every test in the file rather than one suite's.
// eslint-disable-next-line vitest/require-hook -- `aroundEach` is a hook, and postdates the rule's list of them.
it.aroundEach(async (runTest, { task }) => {
  fileHookLog.push(task.name);

  await runTest();
});

describe(makeFixture, () => {
  describe('test scope', () => {
    it('builds the value for the test that names it', ({ perTest }) => {
      expect(perTest.label).toBe('per-test');
      expect(countOf(buildLog, 'per-test')).toBe(1);
      expect(buildLog).not.toContain('per-file');
    });

    // The disposal belongs to the previous test, so a later test is the only place it can be observed.
    it('disposes the previous value before the next test runs', ({ perTest }) => {
      expect(disposalLog).toStrictEqual(['per-test']);
      expect(countOf(buildLog, 'per-test')).toBe(2);
      expect(perTest.label).toBe('per-test');
    });
  });

  describe('file scope', () => {
    it('builds the value once', ({ perFile }) => {
      expect(perFile.label).toBe('per-file');
      expect(countOf(buildLog, 'per-file')).toBe(1);
    });

    it('reuses that value for a later test', ({ perFile }) => {
      expect(perFile.label).toBe('per-file');
      expect(countOf(buildLog, 'per-file')).toBe(1);
      expect(disposalLog).not.toContain('per-file');
    });
  });

  describe('composition', () => {
    it('builds a temporary tree', ({ tree }) => {
      expect(fs.readFileSync(tree.resolve('src/main.ts'), 'utf8')).toBe('export {};\n');
    });

    it('captures terminal output', ({ stdio }) => {
      process.stdout.write('done\n');

      expect(stdio.stdout).toBe('done\n');
    });

    it('silences a console method', ({ silent }) => {
      console.warn('hush');

      expect(silent.warn).toHaveBeenCalledWith('hush');
    });
  });

  describe('types', () => {
    it("gives the fixture the factory's return type", ({ tree }) => {
      expectTypeOf(tree).toEqualTypeOf<TempTree>();
    });
  });

  describe('around hooks', () => {
    // eslint-disable-next-line vitest/require-hook -- `aroundEach` is a hook, and postdates the rule's list of them.
    it.aroundEach(async (runTest, { hookProbe: _hookProbe, tree }) => {
      using _cwd = pointCwdAt(tree.dir);

      await runTest();
    });

    // eslint-disable-next-line vitest/require-hook -- `aroundAll` is a hook, and postdates the rule's list of them.
    it.aroundAll(async (runSuite, { hookFileProbe }) => {
      aroundAllLog.push(hookFileProbe.label);

      await runSuite();
    });

    it('builds a test-scoped request for a test that names it nowhere', () => {
      expect(countOf(buildLog, 'hook-probe')).toBe(1);
    });

    it('disposes that request before the next test runs', () => {
      expect(countOf(disposalLog, 'hook-probe')).toBe(1);
      expect(countOf(buildLog, 'hook-probe')).toBe(2);
    });

    it('points the working directory for a test that names no fixture', () => {
      expect(fs.readFileSync(path.resolve('src/main.ts'), 'utf8')).toBe('export {};\n');
    });

    it('runs the suite-level hook once for the whole suite', () => {
      expect(aroundAllLog).toStrictEqual(['hook-file-probe']);
      expect(countOf(buildLog, 'hook-file-probe')).toBe(1);
    });
  });

  describe('hook registration scope', () => {
    otherIt('runs a file-level hook for a test declared with another extended API', ({ task, unshared }) => {
      expect(unshared.label).toBe('unshared');
      expect(fileHookLog.at(-1)).toBe(task.name);
    });
  });
});

// region | Helpers

/** Counts a label's occurrences in one of the lifecycle logs. */
function countOf(log: readonly string[], label: string): number {
  return log.filter((entry) => entry === label).length;
}

/** Records every build and disposal, so a test can assert on a scope's lifecycle without holding the instance. */
function makeProbe(label: string): Probe {
  buildLog.push(label);

  return {
    label,
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      disposalLog.push(label);
    },
  };
}

interface Probe extends Disposable {
  readonly label: string;
}

// endregion | Helpers
