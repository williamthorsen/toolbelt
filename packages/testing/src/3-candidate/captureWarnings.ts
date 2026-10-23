import process from 'node:process';

import { swapProperty } from '../internal/swapProperty.ts';

/**
 * Records every process warning emitted in the enclosing scope without printing it, restoring
 * `process.emitWarning` when the scope exits. Each warning is the `Error` that Node would emit, recorded when
 * `emitWarning` is called rather than on the later tick on which Node prints it. The `'warning'` event does not
 * fire while the scope is open, so a `process.on('warning')` listener in the code under test does not run.
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

/**
 * Builds the `Error` that Node emits for a call. A string becomes an `Error` named for its type; an `Error` is
 * emitted as given, and Node ignores the type and code passed with one. An argument in a position that Node reads
 * as a constructor for the stack trace is not a type or a code.
 */
function buildWarning(warning: Error | string, typeOrOptions: unknown, code: unknown): Error {
  if (warning instanceof Error) return warning;

  const options = isWarningOptions(typeOrOptions) ? typeOrOptions : { type: typeOrOptions, code };

  return Object.assign(
    new Error(warning),
    // eslint-disable-next-line unicorn/no-error-property-assignment -- Node emits a plain `Error` renamed to the warning's type.
    { name: typeof options.type === 'string' ? options.type : 'Warning' },
    typeof options.code === 'string' ? { code: options.code } : {},
    typeof options.detail === 'string' ? { detail: options.detail } : {},
  );
}

/** Reports whether a value is an options object rather than a type string or a constructor. */
function isWarningOptions(value: unknown): value is WarningOptions {
  return typeof value === 'object' && value !== null;
}

// endregion | Helpers
