import process from 'node:process';

import { installCrashHandler } from '../../../installCrashHandler.ts';

installCrashHandler('demo');
// Hold the report's flush open for one timer, since a piped stderr on Linux writes synchronously and its
// callback would exit before a second crash could be raised.
const write = process.stderr.write.bind(process.stderr);
process.stderr.write = (chunk: string | Uint8Array, callback?: unknown): boolean =>
  write(chunk, () => {
    setTimeout(() => {
      throw new Error('second crash');
    }, 0);
    if (isCallback(callback)) setTimeout(callback, 0);
  });
throw new Error('first crash');

// region | Helpers

/** Reports whether a `write` argument is its completion callback. */
function isCallback(value: unknown): value is () => void {
  return typeof value === 'function';
}

// endregion | Helpers
