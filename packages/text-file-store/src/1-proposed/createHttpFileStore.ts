import { isRecord } from '@williamthorsen/toolbelt.objects';

import type { FileStore, StoredFileEntry, StoreProblem } from './FileStore.ts';

/**
 * Creates a store that reads the files that a server serves under `basePath`: `GET {basePath}` answers
 * `{ files: [{ name, modifiedAt }] }`, `GET {basePath}/{name}` answers `{ text }`, `PUT {basePath}/{name}` writes the
 * body, answering `409` for a name that exists unless `?replace=true` is set, `DELETE {basePath}/{name}` removes the
 * file, answering `204`, and an error answers `{ problems }`. `basePath` may be a path on the page's origin or an
 * absolute URL.
 *
 * @category File store
 * @stage proposed
 */
export function createHttpFileStore(basePath: string, fetchFile: typeof fetch = fetch): FileStore {
  return {
    async list() {
      const response = await fetchFile(basePath);
      if (!response.ok) throw new Error(await readProblemMessage(response, `The store answered ${response.status}.`));
      const body: unknown = await response.json();
      if (!isFileList(body)) throw new Error('The store answered with an unexpected list.');
      return body.files.map(({ name, modifiedAt }) => ({ name, modifiedAt }));
    },
    async read(name) {
      let response: Response;
      try {
        response = await fetchFile(`${basePath}/${encodeURIComponent(name)}`);
      } catch {
        return { ok: false, reason: 'unavailable', message: UNREACHABLE_MESSAGE };
      }
      if (response.status === 404) {
        return { ok: false, reason: 'missing', message: await readProblemMessage(response, `${name} is not stored.`) };
      }
      if (!response.ok) {
        const message = await readProblemMessage(response, `The store answered ${response.status}.`);
        return { ok: false, reason: 'unavailable', message };
      }
      const body = await readJson(response);
      return isRecord(body) && typeof body['text'] === 'string'
        ? { ok: true, text: body['text'] }
        : { ok: false, reason: 'unavailable', message: `The store answered with unexpected content for ${name}.` };
    },
    async remove(name) {
      let response: Response;
      try {
        response = await fetchFile(`${basePath}/${encodeURIComponent(name)}`, { method: 'DELETE' });
      } catch {
        return { ok: false, reason: 'unavailable', message: UNREACHABLE_MESSAGE };
      }
      if (response.ok) return { ok: true };
      const message = await readProblemMessage(response, `The store answered ${response.status}.`);
      if (response.status === 404) return { ok: false, reason: 'missing', message };
      return { ok: false, reason: REMOVAL_REFUSAL_STATUSES.has(response.status) ? 'refused' : 'unavailable', message };
    },
    async write(name, text, { replace }) {
      const query = replace ? '?replace=true' : '';
      let response: Response;
      try {
        response = await fetchFile(`${basePath}/${encodeURIComponent(name)}${query}`, {
          method: 'PUT',
          headers: { 'content-type': 'text/plain; charset=utf-8' },
          body: text,
        });
      } catch {
        return { ok: false, reason: 'unavailable', problems: [{ path: '', message: UNREACHABLE_MESSAGE }] };
      }
      if (response.ok) return { ok: true };
      const fallback = `The store answered ${response.status}.`;
      if (response.status === 409) {
        return { ok: false, reason: 'exists', problems: await readProblems(response, fallback) };
      }
      if (WRITE_REFUSAL_STATUSES.has(response.status)) {
        return { ok: false, reason: 'refused', problems: await readProblems(response, fallback) };
      }
      const message = await readProblemMessage(response, fallback);
      return { ok: false, reason: 'unavailable', problems: [{ path: '', message }] };
    },
  };
}

// region | Helpers
/** The statuses with which the store refuses a removal's name. */
const REMOVAL_REFUSAL_STATUSES = new Set([400, 409]);

const UNREACHABLE_MESSAGE = 'The store could not be reached.';

/** The statuses with which the store refuses a write's name or body. */
const WRITE_REFUSAL_STATUSES = new Set([400, 413, 422]);

/** Reports whether the value is a stored file's entry. */
function isFileEntry(value: unknown): value is StoredFileEntry {
  return isRecord(value) && typeof value['name'] === 'string' && typeof value['modifiedAt'] === 'string';
}

/** Reports whether the value is a `{ files }` listing of entries. */
function isFileList(value: unknown): value is { files: StoredFileEntry[] } {
  return isRecord(value) && Array.isArray(value['files']) && value['files'].every((entry) => isFileEntry(entry));
}

/** Reports whether the value is a problem of a `{ problems }` body. */
function isProblem(value: unknown): value is StoreProblem {
  return isRecord(value) && typeof value['path'] === 'string' && typeof value['message'] === 'string';
}

/** Returns the response's JSON body, or `undefined` when it is not JSON. */
async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

/** Returns the first problem's message of a `{ problems }` body, or the fallback when the body has none. */
async function readProblemMessage(response: Response, fallback: string): Promise<string> {
  const body = await readJson(response);
  if (!isRecord(body) || !Array.isArray(body['problems'])) return fallback;
  const first: unknown = body['problems'][0];
  return isRecord(first) && typeof first['message'] === 'string' && first['message'] !== ''
    ? first['message']
    : fallback;
}

/** Returns every problem of a `{ problems }` body, or one problem with the fallback when the body has none. */
async function readProblems(response: Response, fallback: string): Promise<StoreProblem[]> {
  const body = await readJson(response);
  const problems: unknown = isRecord(body) ? body['problems'] : undefined;
  if (Array.isArray(problems) && problems.length > 0 && problems.every((problem) => isProblem(problem))) {
    return problems;
  }
  return [{ path: '', message: fallback }];
}
// endregion | Helpers
