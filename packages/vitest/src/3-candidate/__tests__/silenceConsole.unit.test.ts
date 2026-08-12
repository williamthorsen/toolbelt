/* eslint no-console: "off" */
import { describe, expect, expectTypeOf, it, type MockInstance } from 'vitest';

import { type ConsoleMethod, silenceConsole } from '../silenceConsole.ts';

describe(silenceConsole, () => {
  describe('runtime behavior', () => {
    it('silences each requested method', () => {
      const originals = { error: console.error, warn: console.warn };

      using _silent = silenceConsole(['error', 'warn']);

      expect(console.error).not.toBe(originals.error);
      expect(console.warn).not.toBe(originals.warn);
    });

    it('leaves methods outside the list alone', () => {
      const originalLog = console.log;

      using _silent = silenceConsole(['error']);

      expect(console.log).toBe(originalLog);
    });

    it('silences every method when called with no argument', () => {
      const originals = { ...console };

      using _silent = silenceConsole();

      for (const method of ['debug', 'error', 'info', 'log', 'warn'] satisfies ConsoleMethod[]) {
        expect(console[method]).not.toBe(originals[method]);
      }
    });

    it('records the calls made to a silenced method', () => {
      using silent = silenceConsole(['warn']);

      console.warn('deprecated', 42);

      expect(silent.warn).toHaveBeenCalledWith('deprecated', 42);
    });

    it('suppresses output rather than passing it through', () => {
      using silent = silenceConsole(['error']);

      console.error('swallowed');

      expect(silent.error.mock.calls).toStrictEqual([['swallowed']]);
      expect(silent.error.getMockImplementation()).toBeTypeOf('function');
    });

    it('restores every spy when the scope exits', () => {
      const originals = { error: console.error, warn: console.warn };

      {
        using _silent = silenceConsole(['error', 'warn']);
        expect(console.error).not.toBe(originals.error);
      }

      expect(console.error).toBe(originals.error);
      expect(console.warn).toBe(originals.warn);
    });
  });

  describe('type narrowing', () => {
    it('exposes exactly the requested methods', () => {
      using silent = silenceConsole(['error', 'warn']);

      expectTypeOf(silent.error).toEqualTypeOf<MockInstance>();
      expectTypeOf(silent.warn).toEqualTypeOf<MockInstance>();
      expectTypeOf(silent).not.toHaveProperty('log');
      expect(Object.keys(silent)).toStrictEqual(['error', 'warn']);
    });

    it('exposes every method when called with no argument', () => {
      using silent = silenceConsole();

      expectTypeOf(silent).toExtend<Record<ConsoleMethod, MockInstance>>();
    });

    it('returns a disposable', () => {
      using silent = silenceConsole(['error']);

      expectTypeOf(silent).toExtend<Disposable>();
    });
  });
});
