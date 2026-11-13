import type { Writer } from './nodes.ts';

/** A writer that accumulates everything written to it. */
export interface TextBuffer extends Writer {
  /** Everything written so far, in order. */
  readonly text: string;
}

/**
 * Creates a writer that accumulates what is written to it, such as to capture what `runCli` writes to
 * `stdout` or `stderr`.
 *
 * @category CLI
 * @stage candidate
 */
export function createTextBuffer(): TextBuffer {
  let text = '';

  return {
    get text() {
      return text;
    },
    write(chunk: string) {
      text += chunk;
    },
  };
}
