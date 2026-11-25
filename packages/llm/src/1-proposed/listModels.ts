import { describeError } from '@williamthorsen/toolbelt.errors';

import { isRefusedCredential } from '../internal/isRefusedCredential.ts';
import { MODEL_LIST_ADAPTERS } from '../internal/modelListAdapters.ts';
import type { UserCredential } from '../types/credential.ts';
import type { ListedModel, ListModelsOptions, ModelListing } from '../types/models.ts';

// Guards against a provider that keeps returning a next-page token; at 1000 models a page, no list comes near it.
const MAX_PAGES = 20;

/**
 * Lists the models that a credential's provider offers, following every page, in the provider's order. Google's ids
 * lack their `models/` prefix, and only Google models that generate content are listed; OpenAI's list is unfiltered.
 * Resolves as `refused` when the provider does not accept the key, and as `unavailable` when any page cannot be
 * requested or read, so that a caller can keep accepting a typed id. OpenRouter's list is public and is requested
 * without the key, so an OpenRouter listing never resolves as `refused`. Rejects with the signal's reason when
 * `options.signal` aborts.
 *
 * @category LLM
 * @stage proposed
 * @experimental
 */
export async function listModels(credential: UserCredential, options: ListModelsOptions): Promise<ModelListing> {
  const adapter = MODEL_LIST_ADAPTERS[credential.provider];
  const { signal } = options;
  const fetch = options.fetch ?? globalThis.fetch;
  const models: ListedModel[] = [];
  const listedIds = new Set<string>();
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    signal.throwIfAborted();
    const { url, headers } = adapter.buildRequest(credential.apiKey, pageToken);
    let response: Response;
    try {
      response = await fetch(url, { headers, signal });
    } catch (error) {
      signal.throwIfAborted();
      return buildUnavailable(`${adapter.name} could not be reached: ${describeError(error)}`);
    }

    const text = await readText(response, signal);
    if (!response.ok) {
      if (adapter.sendsKey && isRefusedCredential(response.status, text)) return { status: 'refused' };
      return buildUnavailable(`${adapter.name} responded with ${response.status}.`);
    }
    const listPage = text === undefined ? undefined : adapter.readPage(parseJson(text));
    if (listPage === undefined)
      return buildUnavailable(`${adapter.name} returned a model list that could not be read.`);

    for (const model of listPage.models) {
      if (listedIds.has(model.id)) continue;
      listedIds.add(model.id);
      models.push(model);
    }
    const next = listPage.nextPageToken;
    if (next === undefined) return { status: 'listed', models };
    if (seenTokens.has(next)) break;
    seenTokens.add(next);
    pageToken = next;
  }
  return buildUnavailable(`${adapter.name} returned more pages than expected.`);
}

// region | Helpers
/** Builds an `unavailable` listing. */
function buildUnavailable(reason: string): ModelListing {
  return { status: 'unavailable', reason };
}

/** Parses a JSON text, returning `undefined` when it is not JSON. */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/**
 * Reads a response's text, rejecting with the signal's reason on an abort and returning `undefined` on another
 * failure.
 */
async function readText(response: Response, signal: AbortSignal): Promise<string | undefined> {
  try {
    return await response.text();
  } catch {
    signal.throwIfAborted();
    return undefined;
  }
}
// endregion | Helpers
