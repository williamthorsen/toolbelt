import { describe, expect, it } from 'vitest';

import { createTextBuffer } from '../createTextBuffer.ts';

describe(createTextBuffer, () => {
  it('starts empty', () => {
    expect(createTextBuffer().text).toBe('');
  });

  it('accumulates every write in order', () => {
    const buffer = createTextBuffer();

    buffer.write('first ');
    buffer.write('second\n');

    expect(buffer.text).toBe('first second\n');
  });

  it('keeps each buffer separate', () => {
    const first = createTextBuffer();
    const second = createTextBuffer();

    first.write('a');

    expect(second.text).toBe('');
  });

  it('rejects an assignment to the text', () => {
    const buffer = createTextBuffer();
    buffer.write('kept');

    expect(() => {
      // @ts-expect-error -- `text` is read-only.
      buffer.text = 'replaced';
    }).toThrow(TypeError);
    expect(buffer.text).toBe('kept');
  });
});
