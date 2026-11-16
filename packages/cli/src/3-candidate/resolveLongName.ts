import { toKebabCase } from '@williamthorsen/toolbelt.strings/candidate';

import type { FlagDefinition } from './types.ts';

/**
 * Returns a flag's long name, without dashes: its `long`, else its key converted by `toKebabCase`.
 *
 * @internal
 */
export function resolveLongName(key: string, definition: FlagDefinition): string {
  return definition.long ?? toKebabCase(key);
}
