import process from 'node:process';
import readline from 'node:readline/promises';

/** The streams on which `readAnswer` asks its question and reads the answer. */
export interface ReadAnswerOptions {
  input?: NodeJS.ReadableStream;
  output?: NodeJS.WritableStream;
}

/**
 * Writes a question to `output` and resolves to the line typed on `input`, or to `undefined` when input ends
 * before a line arrives. The question goes to stderr by default, so that it stays out of piped stdout.
 *
 * @category CLI
 * @stage candidate
 */
export async function readAnswer(question: string, options: ReadAnswerOptions = {}): Promise<string | undefined> {
  const { input = process.stdin, output = process.stderr } = options;
  const reader = readline.createInterface({ input, output });
  const closed = new Promise<undefined>((resolve) => {
    reader.once('close', () => {
      resolve(undefined);
    });
  });

  try {
    return await Promise.race([askQuietly(reader, question), closed]);
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
