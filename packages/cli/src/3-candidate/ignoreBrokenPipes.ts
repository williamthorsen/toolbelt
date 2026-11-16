import process from 'node:process';

/**
 * Ignores `EPIPE` on each stream, which a reader that exits first raises as an `error` event rather than the
 * quiet termination that `SIGPIPE` would give. Every other stream error is rethrown from the listener, so that it
 * reaches the process `uncaughtException` handler that `installCrashHandler` registers.
 *
 * @category CLI
 * @stage candidate
 */
export function ignoreBrokenPipes(streams: readonly NodeJS.WritableStream[] = [process.stdout, process.stderr]): void {
  for (const stream of streams) {
    stream.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') throw error;
    });
  }
}
