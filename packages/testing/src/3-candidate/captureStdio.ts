import { Buffer } from 'node:buffer';
import process from 'node:process';
import { format } from 'node:util';

const CONSOLE_METHODS = ['debug', 'error', 'info', 'log', 'warn'] as const;

/** Stream each console method reports to, mirroring how Node routes them. */
const CONSOLE_STREAMS: Record<ConsoleMethod, 'stderr' | 'stdout'> = {
  debug: 'stdout',
  error: 'stderr',
  info: 'stdout',
  log: 'stdout',
  warn: 'stderr',
};

/**
 * Captures everything written to stdout and stderr for the enclosing scope, restoring both streams when the
 * scope exits. A test runner replaces the global console, so console output reaches neither stream unless
 * `includeConsole` asks for it.
 *
 * @category Testing
 * @experimental
 * @stage candidate
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
    // eslint-disable-next-line unicorn/no-nonstandard-builtin-properties -- the rule's Symbol allowlist omits Symbol.dispose and accepts no options.
    [Symbol.dispose]() {
      for (const restore of restorers.toReversed()) {
        restore();
      }
    },
  };
}

/** Buffered output a command wrote while a capture scope was open. */
export interface CapturedStdio extends Disposable {
  readonly stderr: string;
  readonly stderrChunks: readonly string[];
  readonly stdout: string;
  readonly stdoutChunks: readonly string[];
  /** Empties both buffers, which a test comparing two invocations of one command needs between them. */
  reset(): void;
}

/** Options for a capture scope. */
export interface CaptureStdioOptions {
  /** Whether console output joins the stream buffers, which a command reporting through `console` needs. */
  includeConsole?: boolean;
  /** Value both streams report for `isTTY` while the scope is open, which exercises style detection. */
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

/** Renders a written chunk as text, decoding a byte chunk under the encoding the caller named. */
function decodeChunk(chunk: Uint8Array | string, encoding?: BufferEncoding | ((error?: Error) => void)): string {
  if (typeof chunk === 'string') return chunk;

  return Buffer.from(chunk).toString(typeof encoding === 'string' ? encoding : 'utf8');
}

/**
 * Replaces one property and returns the call that puts back the state it found: the previous value where the
 * target owned the property, and absence where it did not. Both cases arise here, since
 * `process.stdout.write` resolves from the stream's prototype and `isTTY` is unset outside a terminal.
 */
function swapProperty<T extends object, K extends keyof T>(target: T, key: K, value: T[K]): () => void {
  const hadOwnProperty = Object.hasOwn(target, key);
  const previous = target[key];

  target[key] = value;

  return () => {
    if (hadOwnProperty) target[key] = previous;
    else Reflect.deleteProperty(target, key);
  };
}

// endregion | Helpers
