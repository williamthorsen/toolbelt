import process from 'node:process';
import readline from 'node:readline/promises';

/** The streams on which `readAnswer` asks its question and reads the answer. */
export interface ReadAnswerOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

/**
 * Writes a question to `output` and resolves to the line typed on `input`, or to `undefined` when input ends
 * before a line arrives or has already ended. A last line that ends without a newline counts as the answer. Input
 * that readline has buffered past the answer is discarded, so a later call on piped input does not see it. The
 * question goes to stderr by default, so that it stays out of piped stdout.
 *
 * @category CLI
 * @stage candidate
 */
export async function readAnswer(question: string, options: ReadAnswerOptions = {}): Promise<string | undefined> {
  const { input = process.stdin, output = process.stderr } = options;
  // A stream emits `end` once, so an interface created after it never closes.
  if ('readableEnded' in input && input.readableEnded) return undefined;

  const reader = readline.createInterface({ input, output });
  // At the end of input, readline emits a pending partial line as `line`, bypassing the question, then closes.
  const ending = new Promise<string | undefined>((resolve) => {
    reader.once('line', resolve);
    reader.once('close', () => {
      resolve(undefined);
    });
  });

  try {
    return await Promise.race([askQuietly(reader, question), ending]);
  } finally {
    reader.close();
  }
}

// region | Helpers

/** Resolves to the answer to a question, or to `undefined` when the interface rejects it. */
async function askQuietly(reader: readline.Interface, question: string): Promise<string | undefined> {
  try {
    return await reader.question(question);
  } catch {
    return undefined;
  }
}

// endregion | Helpers
