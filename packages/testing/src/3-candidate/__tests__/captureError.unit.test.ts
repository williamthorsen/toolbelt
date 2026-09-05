import { describe, expect, expectTypeOf, it } from 'vitest';

import { captureError } from '../captureError.ts';

describe(captureError, () => {
  describe('capture', () => {
    it('returns the error thrown by a synchronous call', async () => {
      const thrown = new Error('sync failure');

      const error = await captureError(() => {
        throw thrown;
      });

      expect(error).toBe(thrown);
    });

    it('returns the error that an asynchronous call rejects with', async () => {
      const thrown = new Error('async failure');

      const error = await captureError(() => Promise.reject(thrown));

      expect(error).toBe(thrown);
    });
  });

  describe('expected class', () => {
    it('returns the error when it is of the expected class', async () => {
      const error = await captureError(KitError, () => {
        throw new KitError('bad kit', ['readyup/check-utils']);
      });

      expect(error.specifiers).toStrictEqual(['readyup/check-utils']);
    });

    it('accepts an error of a subclass of the expected class', async () => {
      const thrown = new NestedKitError('nested', []);

      const error = await captureError(KitError, () => {
        throw thrown;
      });

      expect(error).toBe(thrown);
    });

    it('accepts an abstract class as the expected class', async () => {
      const thrown = new KitError('bad kit', []);

      const error = await captureError(TestError, () => {
        throw thrown;
      });

      expect(error).toBe(thrown);
    });

    it('narrows the returned error to the expected class', async () => {
      const error = await captureError(KitError, () => {
        throw new KitError('bad kit', []);
      });

      expectTypeOf(error).toEqualTypeOf<KitError>();
    });

    it('returns an Error where no class is expected', async () => {
      const error = await captureError(() => {
        throw new KitError('bad kit', []);
      });

      expectTypeOf(error).toEqualTypeOf<Error>();
    });
  });

  describe('failure', () => {
    it('fails when the call returns', async () => {
      await expect(captureError(() => 'value')).rejects.toThrow("Expected the call to throw, but it returned: 'value'");
    });

    it('fails when the call resolves', async () => {
      await expect(captureError(() => Promise.resolve())).rejects.toThrow(
        'Expected the call to throw, but it returned: undefined',
      );
    });

    it('fails when the thrown value is not an Error', async () => {
      const failure = captureError(() => {
        // eslint-disable-next-line @typescript-eslint/only-throw-error -- throwing a non-Error is the subject.
        throw 'boom';
      });

      await expect(failure).rejects.toThrow("Expected the call to throw Error, but it threw: 'boom'");
    });

    it('fails when the thrown error is of another class', async () => {
      const failure = captureError(KitError, () => {
        throw new TypeError('wrong');
      });

      await expect(failure).rejects.toThrow('Expected the call to throw KitError, but it threw: TypeError: wrong');
    });

    it('names the class of an error that sets no name of its own', async () => {
      const failure = captureError(TypeError, () => {
        throw new KitError('bad kit', []);
      });

      await expect(failure).rejects.toThrow('but it threw: KitError: bad kit');
    });

    it('carries the actual error as the cause', async () => {
      const thrown = new TypeError('wrong');

      const failure = await captureError(() =>
        captureError(KitError, () => {
          throw thrown;
        }),
      );

      expect(failure.cause).toBe(thrown);
    });
  });
});

// region | Helpers

abstract class TestError extends Error {}

class KitError extends TestError {
  readonly specifiers: string[];

  constructor(message: string, specifiers: string[]) {
    super(message);
    this.specifiers = specifiers;
  }
}

class NestedKitError extends KitError {}

// endregion | Helpers
