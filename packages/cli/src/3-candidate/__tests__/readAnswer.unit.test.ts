import { PassThrough } from 'node:stream';
import { text } from 'node:stream/consumers';

import { describe, expect, it } from 'vitest';

import { readAnswer } from '../readAnswer.ts';

describe(readAnswer, () => {
  it('writes the question to the output', async () => {
    const input = new PassThrough();
    const output = new PassThrough();

    const answering = readAnswer('Proceed? ', { input, output });
    input.end('y\n');
    await answering;
    output.end();

    await expect(text(output)).resolves.toBe('Proceed? ');
  });

  it('resolves to a line that arrives after the question', async () => {
    const input = new PassThrough();

    const answering = readAnswer('Proceed? ', { input, output: new PassThrough() });
    input.write('yes\n');

    await expect(answering).resolves.toBe('yes');
  });

  it('resolves to undefined when the input ends before a line arrives', async () => {
    const input = new PassThrough();

    const answering = readAnswer('Proceed? ', { input, output: new PassThrough() });
    input.end();

    await expect(answering).resolves.toBeUndefined();
  });

  it('resolves to a last line that ends without a newline', async () => {
    const input = new PassThrough();

    const answering = readAnswer('Proceed? ', { input, output: new PassThrough() });
    input.end('yes');

    await expect(answering).resolves.toBe('yes');
  });

  it('resolves to undefined on each call once the input has ended', async () => {
    const input = new PassThrough();
    const output = new PassThrough();
    input.end();

    await expect(readAnswer('First? ', { input, output })).resolves.toBeUndefined();
    await expect(readAnswer('Second? ', { input, output })).resolves.toBeUndefined();
  });
});
