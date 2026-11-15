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
  const lines: string[] = [];
  appendReport(lines, `${name}: internal error: `, value, 0, new Set([value]));
  return `${lines.join('\n')}\n`;
}

// region | Helpers

/**
 * Appends a value's labelled line and frames, then the reports of the errors that it wraps, one level deeper,
 * then the report of its cause, at its own level. A value already in `seen` is skipped, so each is reported once.
 */
function appendReport(lines: string[], label: string, value: unknown, depth: number, seen: Set<unknown>): void {
  const indent = '  '.repeat(depth);
  lines.push(`${indent}${label}${describeValue(value)}`);
  if (!isError(value)) return;
  lines.push(...listFrames(value).map((frame) => `${indent}${frame}`));

  for (const [memberLabel, member] of listMembers(value)) {
    if (seen.has(member)) continue;
    seen.add(member);
    appendReport(lines, `${memberLabel}: `, member, depth + 1, seen);
  }

  const { cause } = value;
  if (cause === undefined || seen.has(cause)) return;
  seen.add(cause);
  appendReport(lines, 'caused by: ', cause, depth, seen);
}

/** Describes a thrown value by its message when it is an `Error`, and by its `util.inspect` form otherwise. */
function describeValue(value: unknown): string {
  return isError(value) ? value.message : inspect(value);
}

/** Lists the frame lines of an error's stack, which follow its header however many lines the header spans. */
function listFrames(error: Error): string[] {
  return (error.stack ?? '').split('\n').filter((line) => /^\s+at /u.test(line));
}

/** Lists the errors that a `SuppressedError` or an `AggregateError` wraps, each labelled by its property name. */
function listMembers(error: Error): Array<[string, unknown]> {
  if (error instanceof SuppressedError) {
    const disposalError: unknown = error.error;
    const suppressed: unknown = error.suppressed;
    return [
      ['error', disposalError],
      ['suppressed', suppressed],
    ];
  }
  if (error instanceof AggregateError) {
    const members: unknown[] = error.errors;
    return members.map((member, index) => [`errors[${index}]`, member]);
  }
  return [];
}

// endregion | Helpers
