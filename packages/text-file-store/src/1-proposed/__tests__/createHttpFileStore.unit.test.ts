import { describe, expect, it } from 'vitest';

import { createHttpFileStore } from '../createHttpFileStore.ts';

describe(createHttpFileStore, () => {
  it('lists the files of a `{ files }` body', async () => {
    const files = [{ name: 'a.json', modifiedAt: '2026-11-16T00:00:00.000Z' }];
    const store = createHttpFileStore('/api/files', answerWith(200, { files }));

    await expect(store.list()).resolves.toStrictEqual(files);
  });

  it('rejects a list that the store refuses or that has an unexpected shape', async () => {
    const refused = createHttpFileStore(
      '/api/files',
      answerWith(500, { problems: [{ path: '', message: 'Broken.' }] }),
    );
    const malformed = createHttpFileStore('/api/files', answerWith(200, { files: [{ name: 1 }] }));

    await expect(refused.list()).rejects.toThrow('Broken.');
    await expect(malformed.list()).rejects.toThrow('unexpected list');
  });

  it('reads a file by its encoded name', async () => {
    const requested: unknown[] = [];
    const store = createHttpFileStore('/api/files', (input) => {
      requested.push(input);
      return Promise.resolve(Response.json({ text: '{}' }));
    });

    await expect(store.read('a b.json')).resolves.toStrictEqual({ ok: true, text: '{}' });
    expect(requested).toStrictEqual(['/api/files/a%20b.json']);
  });

  it('reads a 404 as missing, with the store’s message', async () => {
    const store = createHttpFileStore(
      '/api/files',
      answerWith(404, { problems: [{ path: '', message: 'Not here.' }] }),
    );

    await expect(store.read('a.json')).resolves.toStrictEqual({ ok: false, reason: 'missing', message: 'Not here.' });
  });

  it('reads any other failure as unavailable', async () => {
    const refused = createHttpFileStore(
      '/api/files',
      answerWith(413, { problems: [{ path: '', message: 'Too big.' }] }),
    );
    const unreachable = createHttpFileStore('/api/files', () => Promise.reject(new TypeError('Failed to fetch')));
    const malformed = createHttpFileStore('/api/files', answerWith(200, { body: 'x' }));

    await expect(refused.read('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      message: 'Too big.',
    });
    await expect(unreachable.read('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      message: 'The store could not be reached.',
    });
    await expect(malformed.read('a.json')).resolves.toMatchObject({ ok: false, reason: 'unavailable' });
  });

  it('removes a file with a DELETE to its encoded name', async () => {
    const requests: Array<{ url: unknown; method: string | undefined }> = [];
    const store = createHttpFileStore('/api/files', (input, init) => {
      requests.push({ url: input, method: init?.method });
      return Promise.resolve(new Response(null, { status: 204 }));
    });

    await expect(store.remove('a b.json')).resolves.toStrictEqual({ ok: true });
    expect(requests).toStrictEqual([{ url: '/api/files/a%20b.json', method: 'DELETE' }]);
  });

  it('reads a removal’s 404 as missing and its 400 or 409 as a refusal, with the store’s message', async () => {
    const answers = [
      { status: 404, reason: 'missing' },
      { status: 400, reason: 'refused' },
      { status: 409, reason: 'refused' },
    ];
    for (const { status, reason } of answers) {
      const store = createHttpFileStore('/api/files', answerWith(status, { problems: [{ path: '', message: 'No.' }] }));

      await expect(store.remove('a.json')).resolves.toStrictEqual({ ok: false, reason, message: 'No.' });
    }
  });

  it('reads a removal from an unreachable store or any other failure as unavailable', async () => {
    const unreachable = createHttpFileStore('/api/files', () => Promise.reject(new TypeError('Failed to fetch')));
    const forbidden = createHttpFileStore('/api/files', answerWith(403, {}));

    await expect(unreachable.remove('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      message: 'The store could not be reached.',
    });
    await expect(forbidden.remove('a.json')).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      message: 'The store answered 403.',
    });
  });

  it('writes the text as a plain-text PUT to the encoded name, asking to replace only when told to', async () => {
    const requests: Array<{ url: unknown; method: string | undefined; headers: unknown; body: unknown }> = [];
    const store = createHttpFileStore('/api/files', (input, init) => {
      requests.push({ url: input, method: init?.method, headers: init?.headers, body: init?.body });
      return Promise.resolve(Response.json({ name: 'a b.json' }, { status: 201 }));
    });
    const headers = { 'content-type': 'text/plain; charset=utf-8' };

    await expect(store.write('a b.json', '{}\n', { replace: false })).resolves.toStrictEqual({ ok: true });
    await expect(store.write('a b.json', '{}\n', { replace: true })).resolves.toStrictEqual({ ok: true });
    expect(requests).toStrictEqual([
      { url: '/api/files/a%20b.json', method: 'PUT', headers, body: '{}\n' },
      { url: '/api/files/a%20b.json?replace=true', method: 'PUT', headers, body: '{}\n' },
    ]);
  });

  it('reads a 409 as a name that exists', async () => {
    const problems = [{ path: '', message: 'Already held.' }];
    const store = createHttpFileStore('/api/files', answerWith(409, { problems }));

    await expect(store.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'exists',
      problems,
    });
  });

  it('reads a 400, 413, or 422 as a refusal with every problem of the body', async () => {
    const problems = [
      { path: 'states', message: 'Missing.' },
      { path: 'initial', message: 'Unknown.' },
    ];
    const listed = createHttpFileStore('/api/files', answerWith(422, { problems }));
    const bare = createHttpFileStore('/api/files', answerWith(413, {}));

    await expect(listed.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'refused',
      problems,
    });
    await expect(bare.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'refused',
      problems: [{ path: '', message: 'The store answered 413.' }],
    });
  });

  it('reads an unreachable store or any other failure as unavailable, with the store’s message', async () => {
    const unreachable = createHttpFileStore('/api/files', () => Promise.reject(new TypeError('Failed to fetch')));
    const forbidden = createHttpFileStore(
      '/api/files',
      answerWith(403, { problems: [{ path: '', message: 'Local only.' }] }),
    );

    await expect(unreachable.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      problems: [{ path: '', message: 'The store could not be reached.' }],
    });
    await expect(forbidden.write('a.json', '{}', { replace: false })).resolves.toStrictEqual({
      ok: false,
      reason: 'unavailable',
      problems: [{ path: '', message: 'Local only.' }],
    });
  });
});

// region | Helpers
/** Returns a fetch that answers every request with the JSON body and status. */
function answerWith(status: number, body: unknown): typeof fetch {
  return () => Promise.resolve(Response.json(body, { status }));
}
// endregion | Helpers
