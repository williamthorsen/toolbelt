import process from 'node:process';

import { swapProperty } from '../internal/swapProperty.ts';

/**
 * Records every process warning emitted in the enclosing scope without printing it, restoring
 * `process.emitWarning` when the scope exits. Each warning is the `Error` that Node would emit, recorded when
 * `emitWarning` is called rather than on the later tick on which Node prints it. The `'warning'` event does not
 * fire while the scope is open, so a `process.on('warning')` listener in the code under test does not run. Node
 * prints a warning on a later tick, so a `captureStdio` scope that has closed by then does not take it, and without
 * this capture the warning reaches the terminal.
 *
 * A call that Node rejects, such as `emitWarning(42)` or one whose type or code is not a string, throws a `TypeError`
 * with Node's code `ERR_INVALID_ARG_TYPE` and records nothing.
 *
 * @category Testing
 * @experimental
 * @stage candidate
 *
 * @example
 * using captured = captureWarnings();
 * loadLegacyConfig();
 * expect(captured.warnings).toMatchObject([{ name: 'DeprecationWarning', code: 'CFG001' }]);
 */
export function captureWarnings(): CapturedWarnings {
  const warnings: Error[] = [];

  const restore = swapProperty(
    process,
    'emitWarning',
    function emitWarning(warning: Error | string, typeOrOptions?: unknown, code?: unknown): void {
      warnings.push(buildWarning(warning, typeOrOptions, code));
    },
  );

  return {
    get warnings() {
      return [...warnings];
    },
    reset() {
      warnings.length = 0;
    },

    [Symbol.dispose]() {
      restore();
    },
  };
}

/** Warnings that the code under test emitted while a capture scope was open. */
export interface CapturedWarnings extends Disposable {
  readonly warnings: readonly Error[];
  /** Empties the record, which a test comparing two invocations needs between them. */
  reset(): void;
}

/** The fields that Node reads from an options object, unvalidated until each is narrowed. */
interface WarningOptions {
  code?: unknown;
  detail?: unknown;
  type?: unknown;
}

// region | Helpers

/** Builds the error that Node throws for an argument of the wrong type, matching its class and code. */
function buildInvalidArgumentError(name: string, expected: string): TypeError {
  return Object.assign(new TypeError(`The "${name}" argument must be ${expected}.`), {
    code: 'ERR_INVALID_ARG_TYPE',
  });
}

/**
 * Builds the `Error` that Node emits for a call, throwing the `TypeError` that Node throws for an argument that it
 * rejects. Node checks the type and the code before the warning, so an `Error` passed with an invalid type or code
 * is rejected too. A string becomes an `Error` named for its type; an `Error` is emitted as given, and Node ignores
 * the valid type and code passed with one.
 */
function buildWarning(warning: unknown, typeOrOptions: unknown, positionalCode: unknown): Error {
  const { type, code, detail } = resolveOptions(typeOrOptions, positionalCode);

  if (type !== undefined && typeof type !== 'string') throw buildInvalidArgumentError('type', 'of type string');
  if (code !== undefined && typeof code !== 'string') throw buildInvalidArgumentError('code', 'of type string');

  // rdy-ignore-next-line toolbelt.errors/no-instanceof-error -- a caller-supplied argument, not a caught value
  if (warning instanceof Error) return warning;
  if (typeof warning !== 'string') {
    throw buildInvalidArgumentError('warning', 'of type string or an instance of Error');
  }

  return Object.assign(
    new Error(warning),
    // eslint-disable-next-line unicorn/no-error-property-assignment -- Node emits a plain `Error` renamed to the warning's type.
    { name: type === undefined || type === '' ? 'Warning' : type },
    code === undefined ? {} : { code },
    typeof detail === 'string' ? { detail } : {},
  );
}

/** Reads a function in the position of a code as a constructor for the stack trace, which leaves no code. */
function ignoreConstructor(code: unknown): unknown {
  return typeof code === 'function' ? undefined : code;
}

/** Reports whether a value is an options object rather than a type string or a constructor. */
function isWarningOptions(value: unknown): value is WarningOptions {
  // rdy-ignore-next-line toolbelt.objects/no-hand-rolled-record-guard -- `objects` devDepends on `testing`
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Reads the type, code, and detail from the arguments as Node does, before any is validated. An options object
 * replaces the positional code, Node reads a falsy type in one as no type, and a function in the position of a type
 * is a constructor for the stack trace, which leaves neither a type nor a code.
 */
function resolveOptions(typeOrOptions: unknown, positionalCode: unknown): WarningOptions {
  if (isWarningOptions(typeOrOptions)) {
    const { type, code, detail } = typeOrOptions;

    return { type: type || undefined, code: ignoreConstructor(code), detail };
  }
  if (typeof typeOrOptions === 'function') return {};

  return { type: typeOrOptions, code: ignoreConstructor(positionalCode) };
}

// endregion | Helpers
