import { Buffer } from 'node:buffer';
import process from 'node:process';

import { isRecordOrArray } from '@williamthorsen/toolbelt.objects';

const GUARD_KEY = Symbol.for('@williamthorsen/toolbelt.vitest/outputGuard');

/**
 * Wraps `process.stdout.write`, `process.stderr.write`, and `process.emitWarning` so that output reaching them
 * while a test is active is held back and recorded rather than printed. Output while no test is active passes
 * through. The guard lives on `globalThis`, so every call in one process returns the same guard.
 *
 * A capture that replaces one of the wrapped functions takes its output before the guard sees it, and restores
 * the guard's wrapper when it ends.
 *
 * @internal
 */
export function installOutputGuard(): OutputGuard {
  const existing: unknown = Reflect.get(globalThis, GUARD_KEY);
  if (isOutputGuard(existing)) return existing;

  const guard = createOutputGuard();
  Reflect.set(globalThis, GUARD_KEY, guard);

  return guard;
}

/**
 * Process-wide record of uncaptured output, active while at least one test is running.
 *
 * @internal
 */
export interface OutputGuard extends Disposable {
  /** Marks a test as running. Concurrent tests each mark their own start. */
  startTest(): void;
  /** Marks a test as finished and returns the violations recorded since the last call, emptying the record. */
  finishTest(): readonly Violation[];
}

/**
 * Output that reached a stream or `process.emitWarning` while a test was running.
 *
 * @internal
 */
export interface Violation {
  source: 'stderr' | 'stdout' | 'warning';
  text: string;
}

// region | Helpers

/** Installs the wrappers and returns the guard that controls them; disposing it restores the wrapped functions. */
function createOutputGuard(): OutputGuard {
  const violations: Violation[] = [];
  let activeTests = 0;

  function isActive(): boolean {
    return activeTests > 0;
  }
  function record(violation: Violation): void {
    violations.push(violation);
  }

  const restorers = [
    swapProperty(process.stdout, 'write', createWriteGuard(process.stdout, 'stdout', isActive, record)),
    swapProperty(process.stderr, 'write', createWriteGuard(process.stderr, 'stderr', isActive, record)),
    swapProperty(process, 'emitWarning', createWarningGuard(isActive, record)),
  ];

  return {
    startTest() {
      activeTests += 1;
    },
    finishTest() {
      activeTests = Math.max(0, activeTests - 1);

      return violations.splice(0);
    },

    [Symbol.dispose]() {
      for (const restore of restorers.toReversed()) {
        restore();
      }
      Reflect.deleteProperty(globalThis, GUARD_KEY);
    },
  };
}

/** Builds an `emitWarning` replacement that records a warning during a test and emits it otherwise. */
function createWarningGuard(
  isActive: () => boolean,
  record: (violation: Violation) => void,
): typeof process.emitWarning {
  const original = process.emitWarning.bind(process);

  return function emitWarning(...args: unknown[]): void {
    if (!isActive()) {
      Reflect.apply(original, process, args);
      return;
    }

    record({ source: 'warning', text: formatWarning(args[0], args[1], args[2]) });
  };
}

/** Builds a `write` replacement that records a chunk during a test, reporting it as flushed, and writes it otherwise. */
function createWriteGuard(
  stream: NodeJS.WriteStream,
  source: 'stderr' | 'stdout',
  isActive: () => boolean,
  record: (violation: Violation) => void,
): typeof process.stdout.write {
  const original = stream.write.bind(stream);

  return function write(...args: unknown[]): boolean {
    if (!isActive()) {
      const flushed: unknown = Reflect.apply(original, stream, args);
      return flushed !== false;
    }

    const [chunk, encodingOrCallback] = args;
    record({ source, text: decodeChunk(chunk, encodingOrCallback) });

    const done = args.findLast((argument) => typeof argument === 'function');
    if (typeof done === 'function') Reflect.apply(done, undefined, []);

    return true;
  };
}

/** Renders a chunk as the text that Node writes: `encoding` applies to a string chunk and has no bearing on bytes. */
function decodeChunk(chunk: unknown, encoding: unknown): string {
  if (typeof chunk === 'string') {
    return Buffer.from(chunk, typeof encoding === 'string' && Buffer.isEncoding(encoding) ? encoding : 'utf8').toString(
      'utf8',
    );
  }
  if (chunk instanceof Uint8Array) return Buffer.from(chunk).toString('utf8');

  return String(chunk);
}

/** Renders the arguments of an `emitWarning` call as `name [code]: message`, as Node would name the warning. */
function formatWarning(warning: unknown, typeOrOptions: unknown, code: unknown): string {
  if (warning instanceof Error) {
    const errorCode: unknown = Reflect.get(warning, 'code');
    return joinWarning(warning.name, errorCode, warning.message);
  }

  const isOptions = isRecordOrArray(typeOrOptions);
  const type: unknown = isOptions ? Reflect.get(typeOrOptions, 'type') : typeOrOptions;
  const warningCode: unknown = isOptions ? Reflect.get(typeOrOptions, 'code') : code;

  return joinWarning(typeof type === 'string' ? type : 'Warning', warningCode, String(warning));
}

/** Reports whether a value is a guard installed by this module, possibly from another copy of it. */
function isOutputGuard(value: unknown): value is OutputGuard {
  return typeof value === 'object' && value !== null && 'startTest' in value && 'finishTest' in value;
}

/** Joins a warning's parts, omitting the code when the warning has none. */
function joinWarning(name: string, code: unknown, message: string): string {
  return typeof code === 'string' ? `${name} [${code}]: ${message}` : `${name}: ${message}`;
}

/**
 * Replaces one property and returns a function that restores the state that it found: the previous value if the
 * target owned the property, and absence if it did not.
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
