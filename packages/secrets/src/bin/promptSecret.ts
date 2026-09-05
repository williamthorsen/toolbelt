import readline from 'node:readline/promises';
import { Writable } from 'node:stream';

const CONFIRM_PROMPT = 'Retype secret: ';
const SECRET_PROMPT = 'Secret: ';

/**
 * Reads a secret from a terminal without echoing it, asking twice and comparing, since nothing on screen shows
 * what was typed. `security` has a prompt of its own, but it fills a 128-byte buffer and hands back nothing to
 * verify, so the secret is read here instead.
 *
 * @internal
 */
export async function promptSecret(input: NodeJS.ReadableStream, output: NodeJS.WritableStream): Promise<string> {
  // The reader draws the line that it is editing into a sink, so what is typed never reaches the terminal. The
  // prompts are written to the real stream instead.
  const reader = readline.createInterface({ input, output: createSink(), terminal: true });

  // A pending question does not settle when the input stream ends under it, which would leave the caller
  // reporting success over a secret that it never received. Closing is the one event shared by every
  // abandonment, so cancelling on it covers the stream ending and the `Ctrl-C` and `Ctrl-D` that `readline`
  // handles itself. Those two keystrokes therefore report the message below rather than `readline`'s own wording,
  // which names the key pressed where a caller of `tb-secret` needs to know what became of the secret.
  const abandoned = new AbortController();
  reader.once('close', () => abandoned.abort());

  try {
    const secret = await ask(reader, output, abandoned.signal, SECRET_PROMPT);
    const confirmation = await ask(reader, output, abandoned.signal, CONFIRM_PROMPT);

    if (secret !== confirmation) throw new Error('The two entries differ. Nothing was stored.');

    return secret;
  } finally {
    reader.close();
  }
}

// region | Helpers

/** Asks one question, writing the prompt and the closing newline that the reader no longer echoes. */
async function ask(
  reader: readline.Interface,
  output: NodeJS.WritableStream,
  signal: AbortSignal,
  prompt: string,
): Promise<string> {
  output.write(prompt);

  try {
    const answer = await reader.question('', { signal });
    output.write('\n');

    return answer;
  } catch (error) {
    output.write('\n');

    throw signal.aborted ? new Error('The prompt ended before a secret was entered. Nothing was stored.') : error;
  }
}

/** Builds a stream that discards everything written to it. */
function createSink(): Writable {
  return new Writable({
    write(_chunk, _encoding, callback) {
      callback();
    },
  });
}

// endregion | Helpers
