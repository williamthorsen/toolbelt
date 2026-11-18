import type { KeyValueStorage } from '../types/credential.ts';

// The `/` keeps the key apart from the credential store's `toolbelt.llm:{name}` keys.
const KEY = 'toolbelt.llm/openrouter-connect';

/** The secrets that a connect flow keeps across the redirect to OpenRouter. */
export interface PendingConnect {
  readonly verifier: string;
  readonly state: string;
}

/**
 * Keeps a connect flow's secrets until the callback, replacing any earlier flow's.
 *
 * @internal
 */
export function savePendingConnect(storage: KeyValueStorage, pending: PendingConnect): void {
  storage.setItem(KEY, JSON.stringify(pending));
}

/**
 * Returns the pending connect flow's secrets and removes them, or `undefined` when none can be read.
 *
 * @internal
 */
export function takePendingConnect(storage: KeyValueStorage): PendingConnect | undefined {
  const entry = storage.getItem(KEY);
  storage.removeItem(KEY);
  if (entry === null) return undefined;
  let value: unknown;
  try {
    value = JSON.parse(entry);
  } catch {
    return undefined;
  }
  return isPendingConnect(value) ? value : undefined;
}

// region | Helpers
/** Checks that a parsed value holds a verifier and a state. */
function isPendingConnect(value: unknown): value is PendingConnect {
  if (typeof value !== 'object' || value === null) return false;
  return typeof Reflect.get(value, 'verifier') === 'string' && typeof Reflect.get(value, 'state') === 'string';
}
// endregion | Helpers
