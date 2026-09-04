import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { promptSecret } from '../promptSecret.ts';

const CTRL_C = Buffer.from([0x03]);
const CTRL_D = Buffer.from([0x04]);

describe(promptSecret, () => {
  it('returns the secret typed twice', async () => {
    const session = startSession('s3cret', 's3cret');

    await expect(session.secret).resolves.toBe('s3cret');
  });

  it('echoes nothing that was typed', async () => {
    const session = startSession('s3cret', 's3cret');

    await session.secret;

    expect(session.readOutput()).not.toContain('s3cret');
  });

  it('asks twice, so a mistyped secret is not stored unseen', async () => {
    const session = startSession('s3cret', 's3cret');

    await session.secret;

    expect(session.readOutput()).toContain('Secret: ');
    expect(session.readOutput()).toContain('Retype secret: ');
  });

  it('rejects two entries that differ', async () => {
    const session = startSession('s3cret', 'mistyped');

    await expect(session.secret).rejects.toThrow(/differ/);
  });

  it('rejects where the input ends before anything is typed', async () => {
    const session = startSession();

    session.endInput();

    await expect(session.secret).rejects.toThrow(/ended before a secret was entered/);
  });

  it('rejects where the input ends between the two entries', async () => {
    const session = startSession('s3cret');

    await expect(session.secret).rejects.toThrow(/ended before a secret was entered/);
  });

  it.each([
    { key: CTRL_C, label: 'Ctrl-C' },
    { key: CTRL_D, label: 'Ctrl-D' },
  ])('reports what became of the secret rather than the key pressed, on $label', async ({ key }) => {
    const session = startSession();

    session.type(key);

    await expect(session.secret).rejects.toThrow(/ended before a secret was entered/);
  });

  it('reads a secret past the 128 bytes that `security` would have taken', async () => {
    const long = 'a'.repeat(200);
    const session = startSession(long, long);

    await expect(session.secret).resolves.toBe(long);
  });
});

// region | Helpers

/** Drives one prompt session over a stream pair, typing each answer as its prompt appears. */
function startSession(...answers: string[]): Session {
  const input = new PassThrough();
  const output = new PassThrough();
  const pending = [...answers];
  const written: string[] = [];

  output.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf8');
    written.push(text);

    if (!text.endsWith(': ')) return;

    // A stream emits this event during the write itself, which is before the reader has asked its question.
    // Typing on the next tick is what a person at a terminal does anyway.
    const answer = pending.shift();
    if (answer !== undefined) setImmediate(() => input.write(`${answer}\n`));
  });

  // A session given answers ends its input once they run out, which is the stream reaching EOF mid-prompt. A
  // session given none leaves the input open, so a test driving a keystroke cannot pass through that path.
  output.on('data', () => {
    if (answers.length > 0 && pending.length === 0) setImmediate(() => input.end());
  });

  return {
    endInput: () => input.end(),
    readOutput: () => written.join(''),
    secret: promptSecret(input, output),
    type: (keystroke: Buffer) => void input.write(keystroke),
  };
}

interface Session {
  endInput: () => void;
  readOutput: () => string;
  secret: Promise<string>;
  type: (keystroke: Buffer) => void;
}

// endregion | Helpers
