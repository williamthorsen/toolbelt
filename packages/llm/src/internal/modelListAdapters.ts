import type { UserCredential } from '../types/credential.ts';
import type { ListedModel } from '../types/models.ts';

/** One page of a provider's model list. */
export interface ModelListPage {
  readonly models: readonly ListedModel[];
  /** The token that requests the next page, or `undefined` on the last page. */
  readonly nextPageToken: string | undefined;
}

/** How `listModels` requests and reads one provider's model list. */
export interface ModelListAdapter {
  /** The provider's name, for reasons. */
  readonly name: string;
  /** Whether the request sends the key, so that a 401 or 403 means that the provider refused it. */
  readonly sendsKey: boolean;
  /** Builds the request for the page that a token names, or for the first page. */
  buildRequest(apiKey: string, pageToken: string | undefined): { url: string; headers: Record<string, string> };
  /** Reads a page's JSON body, or returns `undefined` when the body does not have the expected shape. */
  readPage(body: unknown): ModelListPage | undefined;
}

const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models';
const GOOGLE_MODELS_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_PAGE_SIZE = '1000';

/**
 * The model-list adapter of each provider.
 *
 * @internal
 */
export const MODEL_LIST_ADAPTERS: Readonly<Record<UserCredential['provider'], ModelListAdapter>> = {
  anthropic: {
    name: 'Anthropic',
    sendsKey: true,
    buildRequest: (apiKey, pageToken) => ({
      url: buildUrl(ANTHROPIC_MODELS_URL, { limit: MAX_PAGE_SIZE, after_id: pageToken }),
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
    }),
    readPage: (body) => {
      const entries = readArray(body, 'data');
      if (entries === undefined) return;
      const hasMore = readField(body, 'has_more') === true;
      const lastId = readString(body, 'last_id');
      if (hasMore && lastId === undefined) return;
      return {
        models: listPageModels(entries, (entry) => readString(entry, 'id'), 'display_name'),
        nextPageToken: hasMore ? lastId : undefined,
      };
    },
  },
  google: {
    name: 'Google',
    sendsKey: true,
    buildRequest: (apiKey, pageToken) => ({
      url: buildUrl(GOOGLE_MODELS_URL, { pageSize: MAX_PAGE_SIZE, pageToken }),
      headers: { 'x-goog-api-key': apiKey },
    }),
    readPage: (body) => {
      const entries = readArray(body, 'models');
      if (entries === undefined) return;
      return {
        models: listPageModels(entries.filter(generatesContent), readGoogleId, 'displayName'),
        nextPageToken: readString(body, 'nextPageToken'),
      };
    },
  },
  openai: {
    name: 'OpenAI',
    sendsKey: true,
    buildRequest: (apiKey) => ({
      url: 'https://api.openai.com/v1/models',
      headers: { authorization: `Bearer ${apiKey}` },
    }),
    readPage: readSinglePage,
  },
  openrouter: {
    name: 'OpenRouter',
    // The list is public, so the request leaves the key out and cannot tell whether OpenRouter accepts it.
    sendsKey: false,
    buildRequest: () => ({ url: 'https://openrouter.ai/api/v1/models', headers: {} }),
    readPage: readSinglePage,
  },
};

// region | Helpers
/** Builds a URL from a base and the query parameters that are defined. */
function buildUrl(base: string, query: Readonly<Record<string, string | undefined>>): string {
  const url = new URL(base);
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url.href;
}

/** Checks whether a Google model entry lists `generateContent` among its generation methods. */
function generatesContent(entry: unknown): boolean {
  const methods = readField(entry, 'supportedGenerationMethods');
  return Array.isArray(methods) && methods.includes('generateContent');
}

/**
 * Lists the models of a page's entries, skipping an entry without an id, taking the label from `labelField`, and
 * falling back to the id.
 */
function listPageModels(
  entries: readonly unknown[],
  readId: (entry: unknown) => string | undefined,
  labelField: string,
): ListedModel[] {
  const models: ListedModel[] = [];
  for (const entry of entries) {
    const id = readId(entry);
    if (id !== undefined) models.push({ id, label: readString(entry, labelField) ?? id });
  }
  return models;
}

/** Returns an array field of a JSON object, or `undefined`. */
function readArray(value: unknown, key: string): readonly unknown[] | undefined {
  const field = readField(value, key);
  return Array.isArray(field) ? field : undefined;
}

/** Returns a field of a JSON object, or `undefined` when the value is not an object. */
function readField(value: unknown, key: string): unknown {
  return typeof value === 'object' && value !== null ? Reflect.get(value, key) : undefined;
}

/** Returns a Google model's id: its `name` without the `models/` prefix. */
function readGoogleId(entry: unknown): string | undefined {
  const name = readString(entry, 'name');
  const id = name?.startsWith('models/') === true ? name.slice('models/'.length) : name;
  return id === '' ? undefined : id;
}

/** Reads the one page of an OpenAI-shaped list, `{ data: [{ id, name? }] }`. */
function readSinglePage(body: unknown): ModelListPage | undefined {
  const entries = readArray(body, 'data');
  if (entries === undefined) return;
  return { models: listPageModels(entries, (entry) => readString(entry, 'id'), 'name'), nextPageToken: undefined };
}

/** Returns a non-empty string field of a JSON object, or `undefined`. */
function readString(value: unknown, key: string): string | undefined {
  const field = readField(value, key);
  return typeof field === 'string' && field !== '' ? field : undefined;
}
// endregion | Helpers
