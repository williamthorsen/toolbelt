/* eslint no-console: "off" */
import fs from 'node:fs';
import process from 'node:process';

import { createTempTree, type TempTree } from '@williamthorsen/toolbelt.filesystem/candidate';
import { captureStdio, pointCwdAt } from '@williamthorsen/toolbelt.testing/candidate';
import { afterEach, beforeAll, beforeEach, describe, expect, expectTypeOf, it } from 'vitest';

import { disposeOnTestFinished } from '../disposeOnTestFinished.ts';
import { silenceConsole } from '../silenceConsole.ts';

const disposalLog: string[] = [];

describe(disposeOnTestFinished, () => {
  it('returns the value that it was given', () => {
    const probe = makeProbe('returned');

    expect(disposeOnTestFinished(probe)).toBe(probe);
  });

  describe('lifecycle', () => {
    it('leaves the value undisposed while the test runs', () => {
      disposeOnTestFinished(makeProbe('per-test'));

      expect(disposalLog).not.toContain('per-test');
    });

    // The disposal belongs to the previous test, so a later test is the only place it can be observed.
    it('disposes the value once the test has finished', () => {
      expect(countOf(disposalLog, 'per-test')).toBe(1);
    });

    it.fails('registers a disposal that survives the test failing', () => {
      disposeOnTestFinished(makeProbe('failed'));

      expect(disposalLog).not.toContain('failed');

      throw new Error('the failure that this test exists to produce');
    });

    it('disposes the value of a test that failed', () => {
      expect(countOf(disposalLog, 'failed')).toBe(1);
    });

    it('disposes what a dynamically skipped test registered', (ctx) => {
      disposeOnTestFinished(makeProbe('skipped'));

      expect(disposalLog).not.toContain('skipped');

      // eslint-disable-next-line vitest/no-disabled-tests -- the dynamic skip is the behavior under test.
      ctx.skip();
    });

    it('records that disposal', () => {
      expect(countOf(disposalLog, 'skipped')).toBe(1);
    });

    it('registers two values in one test', () => {
      disposeOnTestFinished(makeProbe('outer'));
      disposeOnTestFinished(makeProbe('inner'));

      expect(disposalLog).not.toContain('inner');
    });

    it('disposes them in reverse registration order', () => {
      expect(disposalLog.slice(-2)).toStrictEqual(['inner', 'outer']);
    });
  });

  describe('composition', () => {
    it('builds a temporary tree', () => {
      const tree = disposeOnTestFinished(createTempTree({ 'src/main.ts': 'export {};\n' }));

      expect(fs.readFileSync(tree.resolve('src/main.ts'), 'utf8')).toBe('export {};\n');
    });

    it('captures terminal output', () => {
      const stdio = disposeOnTestFinished(captureStdio({ isTty: false }));

      process.stdout.write('done\n');

      expect(stdio.stdout).toBe('done\n');
    });

    it('silences a console method', () => {
      const silent = disposeOnTestFinished(silenceConsole(['warn']));

      console.warn('hush');

      expect(silent.warn).toHaveBeenCalledWith('hush');
    });

    // Registered after the tree that it points into, so the reverse order restores cwd before the directory is removed.
    it('points the working directory at a tree', () => {
      const tree = disposeOnTestFinished(createTempTree({ 'src/': '' }));
      const cwd = disposeOnTestFinished(pointCwdAt(tree.dir));

      expect(process.cwd()).toBe(cwd.dir);
    });
  });

  describe('from a beforeEach hook', () => {
    beforeEach(() => {
      disposeOnTestFinished(makeProbe('before-hook'));
    });

    it('registers against the test that the hook is running for', () => {
      expect(disposalLog).not.toContain('before-hook');
    });

    it('disposes once per test that the hook ran for', () => {
      expect(countOf(disposalLog, 'before-hook')).toBe(1);
    });
  });

  describe('from an afterEach hook', () => {
    afterEach(() => {
      disposeOnTestFinished(makeProbe('after-hook'));
    });

    it('has registered nothing while the first test runs', () => {
      expect(disposalLog).not.toContain('after-hook');
    });

    // Registration from `afterEach` disposes only because the runner unwinds the finish hooks after it.
    it('disposes what the hook registered for the previous test', () => {
      expect(countOf(disposalLog, 'after-hook')).toBe(1);
    });
  });

  describe('outside any test', () => {
    let thrown: unknown;

    // The call has to happen in the hook, which is why the error is recorded there rather than captured here.
    beforeAll(() => {
      try {
        disposeOnTestFinished(makeProbe('no-test'));
      } catch (error: unknown) {
        thrown = error;
      }
    });

    it('refuses to register', () => {
      expect(thrown).toBeInstanceOf(Error);
      expect(thrown).toHaveProperty('message', 'Hook onTestFinished() can only be called inside a test');
      expect(disposalLog).not.toContain('no-test');
    });
  });

  describe('types', () => {
    it("gives the returned value the argument's type", () => {
      const tree = disposeOnTestFinished(createTempTree({}));

      expectTypeOf(tree).toEqualTypeOf<TempTree>();
    });
  });
});

// region | Helpers

/** Counts a label's occurrences in the disposal log. */
function countOf(log: readonly string[], label: string): number {
  return log.filter((entry) => entry === label).length;
}

/** Records every disposal, so a test can assert on a lifecycle without holding the instance. */
function makeProbe(label: string): Disposable {
  return {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      disposalLog.push(label);
    },
  };
}

// endregion | Helpers
