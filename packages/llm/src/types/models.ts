/** A model that a provider lists for a key. */
export interface ListedModel {
  /** The id that a `ProviderConnection` takes as its `model`. */
  readonly id: string;
  /** The provider's display name for the model, or its id when the provider gives none. */
  readonly label: string;
}

/** What `listModels` found for a credential. */
export type ModelListing =
  | { readonly status: 'listed'; readonly models: readonly ListedModel[] }
  | { readonly status: 'refused' }
  | { readonly status: 'unavailable'; readonly reason: string };

/** The runtime that `listModels` uses. */
export interface ListModelsOptions {
  /** Cancels the listing, which then rejects with the signal's reason. */
  readonly signal: AbortSignal;
  /** Replaces the global `fetch` for every page request. */
  readonly fetch?: typeof globalThis.fetch;
}
