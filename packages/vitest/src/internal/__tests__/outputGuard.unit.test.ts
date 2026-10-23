import { Buffer } from 'node:buffer';
import process from 'node:process';

import { captureStdio, captureWarnings } from '@williamthorsen/toolbelt.testing/candidate';
import { describe, expect, it, vi } from 'vitest';

import { installOutputGuard } from '../outputGuard.ts';

// Each test opens a capture before installing the guard, so that the capture stands in for the terminal: what
// the guard passes through lands in the capture, and nothing reaches the real streams.
describe(installOutputGuard, () => {
  describe('while a test is running', () => {
    it('holds back a stream write and records it', () => {
      using stdio = captureStdio();
      using guard = installOutputGuard();

      guard.startTest();
      process.stdout.write('to stdout');
      process.stderr.write(Buffer.from('to stderr'));

      expect(guard.finishTest()).toStrictEqual([
        { source: 'stdout', text: 'to stdout' },
        { source: 'stderr', text: 'to stderr' },
      ]);
      expect(stdio.stdout + stdio.stderr).toBe('');
    });

    it('reports a held-back write as flushed and invokes its callback', () => {
      using _stdio = captureStdio();
      using guard = installOutputGuard();
      const callback = vi.fn();

      guard.startTest();
      const flushed = process.stderr.write('text', 'utf8', callback);
      guard.finishTest();

      expect(flushed).toBe(true);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('holds back a warning and records it by name, code, and message', () => {
      using captured = captureWarnings();
      using guard = installOutputGuard();

      guard.startTest();
      process.emitWarning('old', 'DeprecationWarning', 'DEP1');
      process.emitWarning('slow', { type: 'PerfWarning' });

      expect(guard.finishTest()).toStrictEqual([
        { source: 'warning', text: 'DeprecationWarning [DEP1]: old' },
        { source: 'warning', text: 'PerfWarning: slow' },
      ]);
      expect(captured.warnings).toStrictEqual([]);
    });

    it('empties the record when the test finishes', () => {
      using _stdio = captureStdio();
      using guard = installOutputGuard();

      guard.startTest();
      process.stdout.write('once');
      guard.finishTest();

      expect(guard.finishTest()).toStrictEqual([]);
    });

    it('stays active until every concurrent test has finished', () => {
      using stdio = captureStdio();
      using guard = installOutputGuard();

      guard.startTest();
      guard.startTest();
      guard.finishTest();
      process.stdout.write('late');

      expect(guard.finishTest()).toStrictEqual([{ source: 'stdout', text: 'late' }]);
      expect(stdio.stdout).toBe('');
    });
  });

  describe('while no test is running', () => {
    it('passes stream writes and warnings through', () => {
      using stdio = captureStdio();
      using captured = captureWarnings();
      using guard = installOutputGuard();

      process.stdout.write('passes');
      process.emitWarning('passes too');

      expect(stdio.stdout).toBe('passes');
      expect(captured.warnings.map((warning) => warning.message)).toStrictEqual(['passes too']);
      expect(guard.finishTest()).toStrictEqual([]);
    });
  });

  describe('under a capture', () => {
    it.each([
      {
        label: 'captureStdio',
        capture: () => captureStdio(),
        emit: () => process.stderr.write('captured'),
      },
      {
        label: 'captureWarnings',
        capture: () => captureWarnings(),
        emit: () => process.emitWarning('captured'),
      },
      {
        label: 'a spy on the stream',
        capture: () => {
          const spy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
          return { [Symbol.dispose]: () => spy.mockRestore() };
        },
        emit: () => process.stderr.write('captured'),
      },
    ])('if $label takes the output, records nothing and restores the guard afterward', ({ capture, emit }) => {
      using stdio = captureStdio();
      using guard = installOutputGuard();

      guard.startTest();
      {
        using _capture = capture();
        emit();
      }
      process.stderr.write('after');

      expect(guard.finishTest()).toStrictEqual([{ source: 'stderr', text: 'after' }]);
      expect(stdio.stderr).toBe('');
    });
  });

  describe('installation', () => {
    it('returns the installed guard on a second call without wrapping again', () => {
      using guard = installOutputGuard();
      const wrapped = Object.getOwnPropertyDescriptor(process.stdout, 'write');

      const again = installOutputGuard();

      expect(again).toBe(guard);
      expect(Object.getOwnPropertyDescriptor(process.stdout, 'write')).toStrictEqual(wrapped);
    });

    it('restores every wrapped function on dispose', () => {
      const targets = [
        [process.stdout, 'write'],
        [process.stderr, 'write'],
        [process, 'emitWarning'],
      ] as const;
      const before = targets.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key));

      {
        using _guard = installOutputGuard();
      }

      expect(targets.map(([target, key]) => Object.getOwnPropertyDescriptor(target, key))).toStrictEqual(before);
    });
  });
});
