/* eslint no-console: "off" */
import { Buffer } from 'node:buffer';
import process from 'node:process';

import { describe, expect, expectTypeOf, it, vi } from 'vitest';

import { captureStdio } from '../captureStdio.ts';

describe(captureStdio, () => {
  describe('stream capture', () => {
    it('buffers each stream separately', () => {
      using stdio = captureStdio();

      process.stdout.write('out\n');
      process.stderr.write('err\n');

      expect(stdio.stdout).toBe('out\n');
      expect(stdio.stderr).toBe('err\n');
    });

    it('preserves write boundaries alongside the joined transcript', () => {
      using stdio = captureStdio();

      process.stdout.write('first');
      process.stdout.write('second');

      expect(stdio.stdoutChunks).toStrictEqual(['first', 'second']);
      expect(stdio.stdout).toBe(stdio.stdoutChunks.join(''));
    });

    it('decodes a byte chunk as text', () => {
      using stdio = captureStdio();

      process.stdout.write(Buffer.from('bytes'));
      process.stdout.write(new Uint8Array([0x68, 0x69]));

      expect(stdio.stdoutChunks).toStrictEqual(['bytes', 'hi']);
    });

    it('reads a named encoding for a string chunk and ignores it for bytes', () => {
      using stdio = captureStdio();

      process.stdout.write('aGk=', 'base64');
      process.stdout.write(new Uint8Array([0x68, 0x69]), 'hex');

      expect(stdio.stdoutChunks).toStrictEqual(['hi', 'hi']);
    });

    it('reports the write as flushed and invokes a trailing callback', () => {
      const callbacks: string[] = [];

      using stdio = captureStdio();

      const returned = process.stdout.write('a', () => {
        callbacks.push('two-argument');
      });
      process.stdout.write('b', 'utf8', () => {
        callbacks.push('three-argument');
      });

      expect(returned).toBe(true);
      expect(callbacks).toStrictEqual(['two-argument', 'three-argument']);
      expect(stdio.stdout).toBe('ab');
    });

    it('suppresses the output rather than passing it through', () => {
      using stdio = captureStdio();

      process.stdout.write('swallowed');

      expect(Object.hasOwn(process.stdout, 'write')).toBe(true);
      expect(stdio.stdout).toBe('swallowed');
    });
  });

  describe('reset', () => {
    it('empties both buffers', () => {
      using stdio = captureStdio();

      process.stdout.write('before');
      process.stderr.write('before');
      stdio.reset();

      expect(stdio.stdout).toBe('');
      expect(stdio.stderr).toBe('');
    });

    it('leaves a previously read chunk list untouched', () => {
      using stdio = captureStdio();

      process.stdout.write('first');
      const chunks = stdio.stdoutChunks;
      stdio.reset();

      expect(chunks).toStrictEqual(['first']);
    });

    it('lets one test compare two invocations', () => {
      using stdio = captureStdio();

      process.stdout.write('rendered');
      const first = stdio.stdout;

      stdio.reset();
      process.stdout.write('rendered');

      expect(stdio.stdout).toBe(first);
    });
  });

  describe('restoration', () => {
    it('returns write to prototype resolution when the scope exits', () => {
      {
        using _stdio = captureStdio();
        expect(Object.hasOwn(process.stdout, 'write')).toBe(true);
      }

      // The streams own no `write` of their own, so its absence is the whole of the restoration.
      expect(Object.hasOwn(process.stdout, 'write')).toBe(false);
      expect(Object.hasOwn(process.stderr, 'write')).toBe(false);
    });

    it('restores a property the stream owned to the value it held', () => {
      using _pinned = pinIsTty(process.stdout, true);

      {
        using _stdio = captureStdio({ isTty: false });
        expect(process.stdout.isTTY).toBe(false);
      }

      expect(process.stdout.isTTY).toBe(true);
    });

    it('restores the absence of a property the stream did not own', () => {
      using _pinned = pinIsTty(process.stdout, undefined);

      {
        using _stdio = captureStdio({ isTty: true });
        expect(Object.hasOwn(process.stdout, 'isTTY')).toBe(true);
      }

      expect(Object.hasOwn(process.stdout, 'isTTY')).toBe(false);
    });
  });

  describe('isTty', () => {
    it('reports the requested value on both streams', () => {
      using _stdio = captureStdio({ isTty: true });

      expect(process.stdout.isTTY).toBe(true);
      expect(process.stderr.isTTY).toBe(true);
    });

    it('leaves the value alone when it is not requested', () => {
      using _pinned = pinIsTty(process.stdout, true);

      {
        using _stdio = captureStdio();
        expect(process.stdout.isTTY).toBe(true);
      }

      expect(process.stdout.isTTY).toBe(true);
    });

    it('restores both streams even when it is not requested', () => {
      const owned = { stderr: Object.hasOwn(process.stderr, 'isTTY'), stdout: Object.hasOwn(process.stdout, 'isTTY') };

      {
        using _stdio = captureStdio();
      }

      expect(Object.hasOwn(process.stdout, 'isTTY')).toBe(owned.stdout);
      expect(Object.hasOwn(process.stderr, 'isTTY')).toBe(owned.stderr);
    });
  });

  describe('includeConsole', () => {
    it('leaves the console methods alone by default', () => {
      const originals = { info: console.info, warn: console.warn };

      using _stdio = captureStdio();

      expect(console.info).toBe(originals.info);
      expect(console.warn).toBe(originals.warn);
    });

    it('routes each method to the stream Node routes it to', () => {
      using stdio = captureStdio({ includeConsole: true });

      console.debug('debug');
      console.info('info');
      console.log('log');
      console.warn('warn');
      console.error('error');

      expect(stdio.stdout).toBe('debug\ninfo\nlog\n');
      expect(stdio.stderr).toBe('warn\nerror\n');
    });

    it('interleaves console output with direct writes in call order', () => {
      using stdio = captureStdio({ includeConsole: true });

      process.stdout.write('written\n');
      console.info('logged');
      process.stdout.write('written again\n');

      expect(stdio.stdout).toBe('written\nlogged\nwritten again\n');
    });

    it('renders format specifiers and extra arguments as Node does', () => {
      using stdio = captureStdio({ includeConsole: true });

      console.info('found %d', 3);
      console.info('a', 'b');
      console.info({ nested: { key: 'value' } });

      expect(stdio.stdoutChunks).toStrictEqual(['found 3\n', 'a b\n', "{ nested: { key: 'value' } }\n"]);
    });

    it('restores every console method when the scope exits', () => {
      const originals = { ...console };

      {
        using _stdio = captureStdio({ includeConsole: true });
        expect(console.info).not.toBe(originals.info);
      }

      for (const method of ['debug', 'error', 'info', 'log', 'warn'] as const) {
        expect(console[method]).toBe(originals[method]);
      }
    });
  });

  describe('composition with a console spy', () => {
    it('loses only the region an inner silence covers', () => {
      using stdio = captureStdio({ includeConsole: true });

      console.info('before');
      {
        const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
        console.info('silenced');
        spy.mockRestore();
      }
      console.info('after');

      expect(stdio.stdout).toBe('before\nafter\n');
    });

    it('leaves an outer spy holding the calls it recorded', () => {
      const spy = vi.spyOn(console, 'info').mockImplementation(() => {});

      console.info('outer before');
      {
        using stdio = captureStdio({ includeConsole: true });
        console.info('inner');
        expect(stdio.stdout).toBe('inner\n');
      }
      console.info('outer after');

      const calls = spy.mock.calls.flat();
      spy.mockRestore();

      expect(calls).toStrictEqual(['outer before', 'outer after']);
    });
  });

  describe('type surface', () => {
    it('returns a disposable', () => {
      using stdio = captureStdio();

      expectTypeOf(stdio).toExtend<Disposable>();
      expectTypeOf(stdio.stdoutChunks).toEqualTypeOf<readonly string[]>();
    });
  });
});

// region | Helpers

/**
 * Pins `isTTY` on a stream for the enclosing scope, putting back the state the stream had when it exits. A
 * failing assertion disposes the binding on its way out, so the value cannot outlive the test that set it.
 */
function pinIsTty(stream: NodeJS.WriteStream, value: boolean | undefined): Disposable {
  const hadOwnProperty = Object.hasOwn(stream, 'isTTY');
  const previous = stream.isTTY;

  if (value === undefined) Reflect.deleteProperty(stream, 'isTTY');
  else stream.isTTY = value;

  return {
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      if (hadOwnProperty) stream.isTTY = previous;
      else Reflect.deleteProperty(stream, 'isTTY');
    },
  };
}

// endregion | Helpers
