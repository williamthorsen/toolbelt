/* eslint no-console: "off" */
import { describe, expect, expectTypeOf, it, type Mock } from 'vitest';

import { listConsoleLines } from '../listConsoleLines.ts';
import { silenceConsole } from '../silenceConsole.ts';

/** The type `vi.spyOn(console, 'error')` resolves to, narrower than the `MockInstance` `silenceConsole` returns. */
type ConsoleMethodSpy = Mock<typeof console.error>;

describe(listConsoleLines, () => {
  describe('runtime behavior', () => {
    it('returns nothing for a method that was never called', () => {
      using silent = silenceConsole(['log']);

      expect(listConsoleLines(silent.log)).toStrictEqual([]);
    });

    it('returns one line per call, in call order', () => {
      using silent = silenceConsole(['log']);

      console.log('first');
      console.log('second');

      expect(listConsoleLines(silent.log)).toStrictEqual(['first', 'second']);
    });

    it('joins the arguments of one call on a single space', () => {
      using silent = silenceConsole(['warn']);

      console.warn('deprecated:', 'use', 'tagRelease');

      expect(listConsoleLines(silent.warn)).toStrictEqual(['deprecated: use tagRelease']);
    });

    it('renders a non-string argument through String', () => {
      using silent = silenceConsole(['info']);

      console.info('count', 42, true, undefined);

      expect(listConsoleLines(silent.info)).toStrictEqual(['count 42 true undefined']);
    });

    it('renders an error as its message rather than its stack', () => {
      using silent = silenceConsole(['error']);

      console.error('failed:', new Error('boom'));

      expect(listConsoleLines(silent.error)).toStrictEqual(['failed: Error: boom']);
    });

    it('reads only the method it was given', () => {
      using silent = silenceConsole(['error', 'warn']);

      console.warn('warned');

      expect(listConsoleLines(silent.error)).toStrictEqual([]);
    });
  });

  describe('types', () => {
    it('accepts the spy a silence hands back', () => {
      using silent = silenceConsole(['log']);

      expectTypeOf(listConsoleLines).toBeCallableWith(silent.log);
    });

    it('accepts a spy typed by the method it replaces', () => {
      expectTypeOf<ConsoleMethodSpy>().toExtend<Parameters<typeof listConsoleLines>[0]>();
    });

    it('returns strings', () => {
      using silent = silenceConsole(['log']);

      expectTypeOf(listConsoleLines(silent.log)).toEqualTypeOf<string[]>();
    });
  });
});
