import type { KeyValueStorage } from './credential.ts';

/** How long the key that OpenRouter issues stays valid; OpenRouter's default is `never`. */
export type OpenRouterKeyExpiration =
  '1-day' | '1-hour' | '1-year' | '7-days' | '30-days' | '90-days' | '180-days' | 'never';

/** The request that `startOpenRouterConnect` sends the user to OpenRouter with. */
export interface OpenRouterConnectOptions {
  /** The page to which OpenRouter returns the user, which calls `completeOpenRouterConnect`. */
  readonly callbackUrl: string;
  /** Prefills the issued key's credit limit, in US dollars; the user can change it. */
  readonly limit?: number;
  /** Prefills the issued key's expiry; the user can change it. */
  readonly expiration?: OpenRouterKeyExpiration;
  /** Prefills the issued key's label, which the user sees in their OpenRouter account. */
  readonly keyLabel?: string;
  /** The storage that keeps the flow's secrets across the redirect; the browser's `sessionStorage` by default. */
  readonly sessionStorage?: KeyValueStorage;
}

/** The runtime that `completeOpenRouterConnect` uses. */
export interface OpenRouterCallbackOptions {
  /** The storage in which `startOpenRouterConnect` kept the flow's secrets; the browser's `sessionStorage` by default. */
  readonly sessionStorage?: KeyValueStorage;
  /** Replaces the global `fetch` for the key exchange. */
  readonly fetch?: typeof globalThis.fetch;
}
