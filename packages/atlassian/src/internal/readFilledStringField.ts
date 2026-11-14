import { isRecord } from '@williamthorsen/toolbelt.objects';

/**
 * Narrows a named field of a payload to a non-empty string, reading an empty one as absent.
 *
 * @internal
 */
export function readFilledStringField(payload: unknown, field: string): string | undefined {
  if (!isRecord(payload)) return undefined;

  const value = payload[field];

  return typeof value === 'string' && value !== '' ? value : undefined;
}
