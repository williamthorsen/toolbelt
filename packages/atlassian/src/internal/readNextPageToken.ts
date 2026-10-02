import { isRecord } from './isRecord.ts';

/**
 * Narrows a search response's page token, whose absence ends a paginated walk.
 *
 * @internal
 */
export function readNextPageToken(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  const token = payload['nextPageToken'];

  return typeof token === 'string' && token !== '' ? token : undefined;
}
