import process from 'node:process';
import { inspect } from 'node:util';

import { isError } from '@williamthorsen/toolbelt.errors';

/**
 * Reports an uncaught error to stderr as `<name>: internal error: <message>`, followed by its stack frames
 * and a `caused by:` line with frames for each error in its `cause` chain, and exits with code 1 once the
 * report is flushed. It is the counterpart to `runCli`, which rethrows every error that is not a `UsageError`.
 *
 * Under Node's default `--unhandled-rejections=throw`, a rejected top-level await reaches the handler too;
 * a process `unhandledRejection` listener or `--unhandled-rejections=warn` keeps a rejection from it. A value
 * that is not an `Error` is reported by its `util.inspect` form, without frames. Only the first crash is
 * reported.
 * @category CLI
 * @stage candidate
 */
export function installCrashHandler(name: string): void {
  // Set once a crash is being reported, so that a second crash raised while the report flushes is ignored.
  let isReporting = false;
  process.on('uncaughtException', (error: unknown) => {
    if (isReporting) return;
    isReporting = true;
    // Exit from the callback, since a pipe on macOS is asynchronous and an immediate exit truncates the report.
    process.stderr.write(formatCrashReport(name, error), () => process.exit(1));
  });
}

/** Formats the report that `installCrashHandler` writes for a thrown value. */
export function formatCrashReport(name: string, value: unknown): string {
  const lines = [`${name}: internal error: ${describeValue(value)}`];
  if (isError(value)) lines.push(...listFrames(value));

  const seen = new Set<unknown>([value]);
  let cause = isError(value) ? value.cause : undefined;
  while (cause !== undefined && !seen.has(cause)) {
    seen.add(cause);
    lines.push(`caused by: ${describeValue(cause)}`);
    if (!isError(cause)) break;
    lines.push(...listFrames(cause));
    cause = cause.cause;
  }

  return `${lines.join('\n')}\n`;
}

// region | Helpers

/** Describes a thrown value by its message when it is an `Error`, and by its `util.inspect` form otherwise. */
function describeValue(value: unknown): string {
  return isError(value) ? value.message : inspect(value);
}

/** Lists the frame lines of an error's stack, which follow its header however many lines the header spans. */
function listFrames(error: Error): string[] {
  return (error.stack ?? '').split('\n').filter((line) => /^\s+at /u.test(line));
}

// endregion | Helpers
