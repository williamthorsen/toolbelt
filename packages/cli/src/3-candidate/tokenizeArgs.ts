import { parseArgs as nodeParseArgs } from 'node:util';

import { resolveLongName } from './resolveLongName.ts';
import type { FlagDefinition, FlagSchema } from './types.ts';

/** A flag of the schema, found by the long name that the tokenizer reports. */
export interface FlagEntry {
  key: string;
  definition: FlagDefinition;
}

/** One token of `node:util.parseArgs` in non-strict mode. */
export type ArgToken = NonNullable<ReturnType<typeof nodeParseArgs<NodeParseConfig>>['tokens']>[number];

interface NodeParseConfig {
  args: string[];
  options: Record<string, { type: 'boolean' | 'string'; short?: string }>;
  strict: false;
  allowPositionals: true;
  tokens: true;
}

/**
 * Tokenizes arguments leniently against a schema: An unknown flag becomes an option token rather than an
 * error. `extraBooleans` registers further boolean flags by long name and short name, such as `help` and `h`.
 */
export function tokenizeArgs(
  argv: readonly string[],
  schema: FlagSchema,
  extraBooleans: ReadonlyArray<{ long: string; short: string }> = [],
): { tokens: ArgToken[]; flagsByName: Map<string, FlagEntry> } {
  const nodeOptions: NodeParseConfig['options'] = {};
  const flagsByName = new Map<string, FlagEntry>();

  for (const [key, definition] of Object.entries(schema)) {
    const name = resolveLongName(key, definition);
    const type = definition.type === 'boolean' ? 'boolean' : 'string';
    nodeOptions[name] = definition.short === undefined ? { type } : { type, short: definition.short };
    flagsByName.set(name, { key, definition });
  }
  for (const { long, short } of extraBooleans) {
    nodeOptions[long] = { type: 'boolean', short };
  }

  // rdy-ignore-next-line toolbelt.cli/no-node-parse-args -- the package's own tokenizer, built on node:util
  const { tokens } = nodeParseArgs({
    args: [...argv],
    options: nodeOptions,
    strict: false,
    allowPositionals: true,
    tokens: true,
  });
  return { tokens, flagsByName };
}

/**
 * Finds the flag that an option token names. A single-dash token matches only through its declared short
 * name, since the tokenizer reports an unknown `-x` under the name `x`, which may be another flag's long name.
 */
export function findFlagEntry(
  flagsByName: ReadonlyMap<string, FlagEntry>,
  token: { name: string; rawName: string },
): FlagEntry | undefined {
  const entry = flagsByName.get(token.name);
  if (entry === undefined || token.rawName.startsWith('--')) return entry;
  return entry.definition.short === token.rawName.slice(1) ? entry : undefined;
}
