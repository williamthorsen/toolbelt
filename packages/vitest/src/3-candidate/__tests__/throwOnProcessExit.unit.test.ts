import process from 'node:process';

import { captureError } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, expectTypeOf, it, type MockInstance } from 'vitest';

import { type MockedProcessExit, ProcessExitError, throwOnProcessExit } from '../throwOnProcessExit.ts';

describe(throwOnProcessExit, () => {
  describe('runtime behavior', () => {
    it('replaces process.exit for the scope and restores it afterwards', () => {
      const original = process.exit;

      {
        using _exit = throwOnProcessExit();

        expect(process.exit).not.toBe(original);
      }

      expect(process.exit).toBe(original);
    });

    it('stops execution at the exit rather than running past it', () => {
      using _exit = throwOnProcessExit();
      const reached: string[] = [];

      function runCommand(): void {
        reached.push('before');
        exitWith(1);
        reached.push('after');
      }

      expect(runCommand).toThrow(ProcessExitError);

      expect(reached).toStrictEqual(['before']);
    });

    it('throws an error carrying the exit code', async () => {
      using _exit = throwOnProcessExit();

      const error = await captureError(ProcessExitError, () => process.exit(2));

      expect(error.code).toBe(2);
    });

    it('coerces an integer-string code to a number, as Node does', async () => {
      using _exit = throwOnProcessExit();

      const error = await captureError(ProcessExitError, () => process.exit('2'));

      expect(error.code).toBe(2);
    });

    it('reports no code where the call named none', async () => {
      using _exit = throwOnProcessExit();

      const error = await captureError(ProcessExitError, () => process.exit());

      expect(error.code).toBeUndefined();
    });

    it('names the code in the message', async () => {
      using _exit = throwOnProcessExit();

      const error = await captureError(ProcessExitError, () => process.exit(3));

      expect(error.message).toBe('process.exit(3)');
    });

    it('records the call on the spy', () => {
      using exit = throwOnProcessExit();

      expect(() => process.exit(1)).toThrow(ProcessExitError);

      expect(exit.spy).toHaveBeenCalledWith(1);
    });

    it('leaves the spy uncalled where nothing exits', () => {
      using exit = throwOnProcessExit();

      expect(exit.spy).not.toHaveBeenCalled();
    });
  });

  describe('types', () => {
    it('reports the code as an optional number', () => {
      expectTypeOf<ProcessExitError['code']>().toEqualTypeOf<number | undefined>();
    });

    it('returns a Disposable carrying the spy', () => {
      expectTypeOf<MockedProcessExit>().toExtend<Disposable>();
      expectTypeOf<MockedProcessExit['spy']>().toEqualTypeOf<MockInstance<typeof process.exit>>();
    });
  });
});

// region | Helpers

/**
 * Exits, declaring a `void` return so a caller may hold statements after the call.
 *
 * Calling `process.exit` directly would make those statements unreachable to the compiler, which reports
 * TS7027 and takes with it the only way to observe whether they ran.
 */
function exitWith(code: number): void {
  process.exit(code);
}

// endregion | Helpers
