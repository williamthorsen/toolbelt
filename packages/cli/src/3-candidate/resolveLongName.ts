import type { FlagDefinition } from './types.ts';

/** Returns a flag's long name, without dashes: its `long`, else its key with each capital as `-` plus its lowercase. */
export function resolveLongName(key: string, definition: FlagDefinition): string {
  return definition.long ?? key.replaceAll(/[A-Z]/g, (capital) => `-${capital.toLowerCase()}`);
}
