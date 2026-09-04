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
  // The reader draws the line it is editing into a sink, so what is typed never reaches the terminal. The
  // prompts are written to the real stream instead.
  const reader = readline.createInterface({ input, output: createSink(), terminal: true });

  // A pending question settles on a keystroke, `Ctrl-C` and `Ctrl-D` included, but not on the input stream
  // ending under it. Cancelling on close is what turns that into an error rather than a promise that never
  // settles, which would leave the caller reporting success over a secret it never received.
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
