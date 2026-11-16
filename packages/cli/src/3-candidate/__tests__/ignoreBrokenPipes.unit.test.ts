import { PassThrough } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { ignoreBrokenPipes } from '../ignoreBrokenPipes.ts';

describe(ignoreBrokenPipes, () => {
  it('ignores a broken pipe on each stream', () => {
    const streams = [new PassThrough(), new PassThrough()];

    ignoreBrokenPipes(streams);

    for (const stream of streams) {
      expect(() => stream.emit('error', buildErrnoError('EPIPE'))).not.toThrow();
    }
  });

  it('rethrows any other stream error', () => {
    const stream = new PassThrough();
    const error = buildErrnoError('EIO');

    ignoreBrokenPipes([stream]);

    expect(() => stream.emit('error', error)).toThrow(error);
  });
});

// region | Helpers

/** Builds an error with a system error code, as a stream reports one. */
function buildErrnoError(code: string): NodeJS.ErrnoException {
  return Object.assign(new Error(`write ${code}`), { code });
}

// endregion | Helpers
