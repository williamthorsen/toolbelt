/* eslint no-console: "off" */
import fs from 'node:fs';
import process from 'node:process';

import { createTempTree, type TempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { captureStdio } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, expectTypeOf, it as baseIt } from 'vitest';

import { makeFixture } from '../makeFixture.ts';
import { silenceConsole } from '../silenceConsole.ts';

const buildLog: string[] = [];
const disposalLog: string[] = [];

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
  );

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
