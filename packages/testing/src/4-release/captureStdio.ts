import { Buffer } from 'node:buffer';
import process from 'node:process';
import { format } from 'node:util';

import { swapProperty } from '../internal/swapProperty.ts';

const CONSOLE_METHODS = ['debug', 'error', 'info', 'log', 'warn'] as const;

/** Stream to which each console method reports, mirroring how Node routes them. */
const CONSOLE_STREAMS: Record<ConsoleMethod, 'stderr' | 'stdout'> = {
  debug: 'stdout',
  error: 'stderr',
  info: 'stdout',
  log: 'stdout',
  warn: 'stderr',
};

/**
 * Captures everything written to stdout and stderr for the enclosing scope, restoring both streams when the
 * scope exits. Only disposal restores them, so a capture bound with `const` rather than `using` leaves both streams
 * swapped for the rest of the file.
 *
 * A test runner replaces the global console, so console output goes to neither stream unless `includeConsole` is
 * set. Both streams' `isTTY` is saved and restored whether or not `isTty` is passed, and a stream that owned no
 * `isTTY` owns none again afterwards.
 *
 * The streams and the console are swapped by assignment rather than spied on, so a capture nests with
 * `silenceConsole` from `@williamthorsen/toolbelt.vitest` in either order: The innermost scope takes the output,
 * and the outer one resumes intact when it exits.
 *
 * @category Testing
 * @stage release
 *
 * @example
 * using stdio = captureStdio({ isTty: false });
 * runCommand(['--verbose']);
 * expect(stdio.stdout).toContain('done');
 */
export function captureStdio(options: CaptureStdioOptions = {}): CapturedStdio {
  const { includeConsole = false, isTty } = options;

  const stdoutChunks: string[] = [];
  const stderrChunks: string[] = [];

  const restorers = [
    swapProperty(process.stdout, 'write', createWriteCapture(stdoutChunks)),
    swapProperty(process.stderr, 'write', createWriteCapture(stderrChunks)),
    swapProperty(process.stdout, 'isTTY', isTty ?? process.stdout.isTTY),
    swapProperty(process.stderr, 'isTTY', isTty ?? process.stderr.isTTY),
  ];

  if (includeConsole) {
    for (const method of CONSOLE_METHODS) {
      const chunks = CONSOLE_STREAMS[method] === 'stdout' ? stdoutChunks : stderrChunks;
      restorers.push(swapProperty(console, method, createConsoleCapture(chunks)));
    }
  }

  return {
    get stderr() {
      return stderrChunks.join('');
    },
    get stderrChunks() {
      return [...stderrChunks];
    },
    get stdout() {
      return stdoutChunks.join('');
    },
    get stdoutChunks() {
      return [...stdoutChunks];
    },
    reset() {
      stdoutChunks.length = 0;
      stderrChunks.length = 0;
    },

    [Symbol.dispose]() {
      for (const restore of restorers.toReversed()) {
        restore();
      }
    },
  };
}

/** Buffered output that a command wrote while a capture scope was open. */
export interface CapturedStdio extends Disposable {
  /** Everything written to stderr, joined. */
  readonly stderr: string;
  /** The individual writes to stderr, copied on each read so that a later `reset()` does not empty it. */
  readonly stderrChunks: readonly string[];
  /** Everything written to stdout, joined. */
  readonly stdout: string;
  /** The individual writes to stdout, copied on each read so that a later `reset()` does not empty it. */
  readonly stdoutChunks: readonly string[];
  /** Empties both buffers, which a test comparing two invocations of one command needs between them. */
  reset(): void;
}

/** Options for a capture scope. */
export interface CaptureStdioOptions {
  /**
   * Whether to add console output to the stream buffers, which a command reporting through `console` needs. Output
   * is routed as Node routes it: `debug`, `info`, and `log` join stdout, and `warn` and `error` join stderr, each
   * call formatted through `util.format`. Off by default, which leaves console output going to the test reporter.
   */
  includeConsole?: boolean;
  /**
   * Value that both streams report for `isTTY` while the scope is open, which exercises style detection. It sets
   * both because style detection reads the stream to which it writes; a test needing them to differ assigns directly.
   */
  isTty?: boolean;
}

type ConsoleMethod = (typeof CONSOLE_METHODS)[number];

// region | Helpers

/** Builds a console-method replacement that buffers its arguments as one formatted line. */
function createConsoleCapture(chunks: string[]): (...args: unknown[]) => void {
  return (...args) => {
    chunks.push(`${format(...args)}\n`);
  };
}

/** Builds a `write` replacement that buffers each chunk as text and reports the write as flushed. */
function createWriteCapture(chunks: string[]): typeof process.stdout.write {
  return function write(
    chunk: Uint8Array | string,
    encodingOrCallback?: BufferEncoding | ((error?: Error) => void),
    callback?: (error?: Error) => void,
  ): boolean {
    chunks.push(decodeChunk(chunk, encodingOrCallback));

    const done = typeof encodingOrCallback === 'function' ? encodingOrCallback : callback;
    done?.();

    return true;
  };
}

/** Renders a chunk as the text that Node writes: `encoding` applies to a string chunk and has no bearing on bytes. */
function decodeChunk(chunk: Uint8Array | string, encoding?: BufferEncoding | ((error?: Error) => void)): string {
  const bytes =
    typeof chunk === 'string'
      ? Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8')
      : Buffer.from(chunk);

  return bytes.toString('utf8');
}

// endregion | Helpers
